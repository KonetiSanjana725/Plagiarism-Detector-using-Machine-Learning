
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let file = null;
let lastId = null;

function error(msg) {
    const el = $('#error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function clearError() {
    const el = $('#error');
    if (el) el.classList.add('hidden');
}

function counts() {
    const input = $('#textInput');
    if (!input) return;

    const text = input.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    $('#words').textContent = words + ' words';
    $('#chars').textContent = text.length + ' characters';
}

function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}


async function history() {
    try {
        const response = await fetch('/api/history');

        if (!response.ok) {
            throw new Error('Could not load history.');
        }

        const data = await response.json();
        const items = data.items || [];

        $('#historyCount').textContent = items.length;
        $('#recordCount').textContent = items.length + ' records';

        $('#historyRows').innerHTML = items.length
            ? items.map(item => `
                <tr>
                    <td><b>${esc(item.filename)}</b></td>
                    <td>${new Date(item.created_at).toLocaleString()}</td>
                    <td>${item.word_count}</td>
                    <td>
                        <span class="badge ${
                            item.prediction === 'Plagiarism Detected' ? 'risk' : ''
                        }">
                            ${esc(item.prediction)}
                        </span>
                    </td>
                    <td>
                        <button type="button" class="report-link" data-pdf="${item.id}">
                            PDF report
                        </button>

                        <button type="button" class="history-delete" data-delete="${item.id}">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td colspan="5" class="empty">
                        No analyses yet.
                    </td>
                </tr>
            `;

    } catch (e) {
        $('#historyRows').innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    Could not load history. Check the Flask server.
                </td>
            </tr>
        `;

        console.error('History error:', e);
    }
}

async function deleteAnalysis(id) {
    if (!confirm('Are you sure you want to delete this analysis?')) {
        return;
    }

    try {
        const response = await fetch(`/api/history/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Could not delete analysis.');
        }

        if (Number(lastId) === Number(id)) {
            lastId = null;
            $('#results').classList.add('hidden');
        }

        await history();

    } catch (e) {
        error(e.message);
        console.error('Delete error:', e);
    }
}


function view(v) {
    $$('.view').forEach(el => el.classList.remove('active'));

    const target = $('#' + v + 'View');
    if (!target) return;

    target.classList.add('active');

    $$('.nav[data-view]').forEach(el => {
        el.classList.toggle('active', el.dataset.view === v);
    });

    $('#crumb').textContent =
        v === 'history' ? 'Analysis history' : 'New analysis';

    $('#sidebar').classList.remove('open');

    if (v === 'history') {
        history();
    }
}

function choose(f) {
    if (!f) return;

    const ext = '.' + f.name.split('.').pop().toLowerCase();

    if (!['.txt', '.pdf', '.docx'].includes(ext)) {
        return error('Choose a TXT, PDF or DOCX file.');
    }

    if (f.size > 10 * 1024 * 1024) {
        return error('File must be smaller than 10 MB.');
    }

    file = f;

    $('#fileName').textContent = f.name;
    $('#chosen').classList.remove('hidden');
    $('#drop').classList.add('hidden');

    clearError();
}

function showResult(data) {
    const risk = data.prediction === 'Plagiarism Detected';

    $('#prediction').textContent = data.prediction;

    $('#description').textContent = risk
        ? 'The classifier assigned this document to its plagiarism-positive class. Review it against reference sources.'
        : 'The classifier assigned this document to its non-plagiarism class. This does not guarantee originality.';

    $('#verdictIcon').textContent = risk ? '!' : '✓';
    $('#verdictIcon').classList.toggle('risk', risk);

    $('#tag').textContent = risk
        ? 'Review recommended'
        : 'Classifier result';

    $('#tag').classList.toggle('risk', risk);

    $('#resultWords').textContent =
        Number(data.word_count).toLocaleString();

    $('#resultChars').textContent =
        Number(data.character_count).toLocaleString();

    $('#resultSource').textContent = data.filename;

    $('#resultTime').textContent =
        new Date(data.created_at).toLocaleString();

    $('#results').classList.remove('hidden');

    $('#results').scrollIntoView({
        behavior: 'smooth'
    });
}

async function pdf(id = lastId) {
    if (!id) {
        error('Run an analysis first.');
        return;
    }

    try {
        clearError();

        const response = await fetch(
            `/api/report/${encodeURIComponent(id)}`
        );

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Could not download report.');
        }

        const blob = await response.blob();

        if (!blob.size || blob.type !== 'application/pdf') {
            throw new Error('The server did not return a valid PDF.');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `plagiarism-report-${id}.pdf`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 2000);

    } catch (e) {
        error(e.message);
        console.error('PDF download error:', e);
    }
}

if ($('#textInput')) {
    $('#textInput').addEventListener('input', counts);
}

$$('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
        $$('[data-tab]').forEach(el => {
            el.classList.toggle('active', el === button);
        });

        $$('.pane').forEach(el => {
            el.classList.remove('active');
        });

        const pane = $('#' + button.dataset.tab + 'Pane');

        if (pane) pane.classList.add('active');
    });
});

$$('.nav[data-view]').forEach(button => {
    button.addEventListener('click', () => {
        view(button.dataset.view);
    });
});

if ($('#menuBtn')) {
    $('#menuBtn').addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
    });
}

if ($('#themeToggle')) {
    $('#themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('dark');

        try {
            localStorage.setItem(
                'verityTheme',
                document.body.classList.contains('dark') ? 'dark' : 'light'
            );
        } catch (e) {}
    });
}

try {
    if (localStorage.getItem('verityTheme') === 'dark') {
        document.body.classList.add('dark');
    }
} catch (e) {}

if ($('#fileInput')) {
    $('#fileInput').addEventListener('change', e => {
        choose(e.target.files[0]);
    });
}

if ($('#removeFile')) {
    $('#removeFile').addEventListener('click', () => {
        file = null;
        $('#fileInput').value = '';
        $('#chosen').classList.add('hidden');
        $('#drop').classList.remove('hidden');
    });
}

if ($('#drop')) {
    $('#drop').addEventListener('dragover', e => {
        e.preventDefault();
        $('#drop').classList.add('drag');
    });

    $('#drop').addEventListener('dragleave', () => {
        $('#drop').classList.remove('drag');
    });

    $('#drop').addEventListener('drop', e => {
        e.preventDefault();
        $('#drop').classList.remove('drag');
        choose(e.dataTransfer.files[0]);
    });
}

if ($('#clearBtn')) {
    $('#clearBtn').addEventListener('click', () => {
        $('#textInput').value = '';
        counts();

        if ($('#removeFile')) {
            $('#removeFile').click();
        }

        $('#results').classList.add('hidden');
        clearError();
        lastId = null;
    });
}

if ($('#analyzeBtn')) {
    $('#analyzeBtn').addEventListener('click', async () => {
        clearError();

        const upload = $('#uploadPane').classList.contains('active');
        const text = $('#textInput').value.trim();

        if (upload && !file) {
            return error('Choose a file first.');
        }

        if (!upload && !text) {
            return error('Enter text before starting analysis.');
        }

        $('#loading').classList.remove('hidden');
        $('#analyzeBtn').disabled = true;

        try {
            let response;

            if (upload) {
                const formData = new FormData();
                formData.append('file', file);

                response = await fetch('/api/detect', {
                    method: 'POST',
                    body: formData
                });
            } else {
                response = await fetch('/api/detect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: text,
                        filename: 'Pasted text'
                    })
                });
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Analysis failed.');
            }

            lastId = data.id;
            showResult(data);
            history();

        } catch (e) {
            error(e.message);
            console.error('Analysis error:', e);
        } finally {
            $('#loading').classList.add('hidden');
            $('#analyzeBtn').disabled = false;
        }
    });
}

if ($('#downloadBtn')) {
    $('#downloadBtn').addEventListener('click', () => {
        pdf();
    });
}

if ($('#refreshBtn')) {
    $('#refreshBtn').addEventListener('click', history);
}

$('#historyRows').addEventListener('click', e => {
    const deleteButton = e.target.closest('[data-delete]');
    const pdfButton = e.target.closest('[data-pdf]');

    if (deleteButton) {
        deleteAnalysis(deleteButton.dataset.delete);
    }

    if (pdfButton) {
        pdf(pdfButton.dataset.pdf);
    }
});

counts();
history();
