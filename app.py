import sqlite3
import pickle
from datetime import datetime, timezone
from pathlib import Path
from io import BytesIO
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename

BASE = Path(__file__).resolve().parent
DB = BASE / 'analysis_history.db'
ALLOWED = {'.txt', '.pdf', '.docx'}
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

# Keep your existing trained model and TF-IDF vectorizer in the project root.
with open(BASE / 'model.pkl', 'rb') as f:
    model = pickle.load(f)
with open(BASE / 'tfidf_vectorizer.pkl', 'rb') as f:
    tfidf_vectorizer = pickle.load(f)

def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    with db() as c:
        c.execute('''CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL,
            prediction TEXT NOT NULL, word_count INTEGER NOT NULL,
            character_count INTEGER NOT NULL, created_at TEXT NOT NULL)''')

def extract_file(upload):
    name = secure_filename(upload.filename or 'document')
    ext = Path(name).suffix.lower()
    if ext not in ALLOWED:
        raise ValueError('Only TXT, PDF and DOCX files are supported.')
    raw = upload.read()
    if not raw:
        raise ValueError('The uploaded file is empty.')
    if ext == '.txt':
        try: text = raw.decode('utf-8-sig')
        except UnicodeDecodeError: text = raw.decode('latin-1')
    elif ext == '.pdf':
        try:
            from pypdf import PdfReader
            import io
            text = '\\n'.join(p.extract_text() or '' for p in PdfReader(io.BytesIO(raw)).pages)
        except ImportError: raise ValueError('Install PDF support with: pip install pypdf')
        except Exception as e: raise ValueError('Could not read PDF: ' + str(e))
    else:
        try:
            from docx import Document
            import io
            text = '\\n'.join(p.text for p in Document(io.BytesIO(raw)).paragraphs)
        except ImportError: raise ValueError('Install DOCX support with: pip install python-docx')
        except Exception as e: raise ValueError('Could not read DOCX: ' + str(e))
    if not text.strip(): raise ValueError('No readable text was found in the file.')
    return text, name

def predict(text):
    features = tfidf_vectorizer.transform([text])
    label = model.predict(features)[0]
    # This preserves the 1 = plagiarism, 0 = non-plagiarism mapping in your original app.
    return 'Plagiarism Detected' if str(label) == '1' else 'No Plagiarism Detected'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/detect', methods=['POST'])
def detect():
    try:
        if 'file' in request.files:
            text, filename = extract_file(request.files['file'])
        else:
            data = request.get_json(silent=True) or request.form
            text = (data.get('text') or '').strip()
            filename = secure_filename(data.get('filename') or 'Pasted text')
        if not text: return jsonify(error='Enter text or upload a readable document.'), 400
        if len(text) > 1_000_000: return jsonify(error='Extracted text is too long.'), 400
        prediction = predict(text)
        created = datetime.now(timezone.utc).isoformat()
        with db() as c:
            cur = c.execute('INSERT INTO analyses(filename,prediction,word_count,character_count,created_at) VALUES(?,?,?,?,?)',
                (filename, prediction, len(text.split()), len(text), created))
            analysis_id = cur.lastrowid
        return jsonify(id=analysis_id, filename=filename, prediction=prediction,
                       word_count=len(text.split()), character_count=len(text), created_at=created)
    except ValueError as e: return jsonify(error=str(e)), 400
    except Exception as e:
        app.logger.exception('Analysis failed')
        return jsonify(error='Analysis failed: ' + str(e)), 500

@app.route('/api/history/<int:analysis_id>', methods=['DELETE'])
def delete_analysis(analysis_id):
    with db() as c:
        cur = c.execute(
            'DELETE FROM analyses WHERE id=?',
            (analysis_id,)
        )

        if cur.rowcount == 0:
            return jsonify(error='Analysis not found.'), 404

    return jsonify(success=True, message='Analysis deleted successfully.')

@app.route('/api/history')
def history():
    with db() as c:
        rows = c.execute('SELECT id,filename,prediction,word_count,character_count,created_at FROM analyses ORDER BY id DESC LIMIT 100').fetchall()
    return jsonify(items=[dict(r) for r in rows])

@app.route('/api/report/<int:analysis_id>')
def report(analysis_id):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.units import mm
        from xml.sax.saxutils import escape

        with db() as c:
            row = c.execute(
                'SELECT * FROM analyses WHERE id=?',
                (analysis_id,)
            ).fetchone()

        if row is None:
            return jsonify(error='Report not found.'), 404

        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=22 * mm,
            leftMargin=22 * mm
        )

        styles = getSampleStyleSheet()

        story = [
            Paragraph('Plagiarism Detection Report', styles['Title']),
            Spacer(1, 12 * mm),

            Paragraph(
                'Document: ' + escape(str(row['filename'])),
                styles['BodyText']
            ),
            Spacer(1, 5 * mm),

            Paragraph(
                'Prediction: ' + escape(str(row['prediction'])),
                styles['BodyText']
            ),
            Spacer(1, 5 * mm),

            Paragraph(
                'Word Count: ' + str(row['word_count']),
                styles['BodyText']
            ),
            Spacer(1, 5 * mm),

            Paragraph(
                'Character Count: ' + str(row['character_count']),
                styles['BodyText']
            ),
            Spacer(1, 5 * mm),

            Paragraph(
                'Date: ' + escape(str(row['created_at'])),
                styles['BodyText']
            ),
            Spacer(1, 10 * mm),

            Paragraph('Interpretation', styles['Heading2']),

            Paragraph(
                'This report contains the classification returned by the '
                'trained machine-learning model. It is not a verified '
                'plagiarism percentage and does not identify source documents. '
                'Compare the submitted text with relevant references before '
                'making an academic-integrity decision.',
                styles['BodyText']
            )
        ]

        doc.build(story)
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'plagiarism-report-{analysis_id}.pdf'
        )

    except ImportError:
        return jsonify(
            error='PDF support is missing. Run: pip install reportlab'
        ), 500

    except Exception as e:
        app.logger.exception('PDF generation failed')
        return jsonify(error='Could not generate PDF: ' + str(e)), 500

@app.errorhandler(413)
def too_large(_): return jsonify(error='File exceeds the 10 MB upload limit.'), 413

init_db()
if __name__ == '__main__':
    app.run(debug=True)
