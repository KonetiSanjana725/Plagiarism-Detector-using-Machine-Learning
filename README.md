# Plagiarism-Detector-using-Machine-Learning
# Plagiarism Detector Using Machine Learning

## About the Project

The **Plagiarism Detector Using Machine Learning** is a web-based application designed to identify whether submitted text is potentially plagiarized or non-plagiarized using a trained machine learning model.

The application uses **TF-IDF (Term Frequency–Inverse Document Frequency)** to convert text into numerical features, which are then passed to a trained classification model to generate a prediction.

Users can either enter text directly or upload documents for analysis.

## Features

- **Text-Based Detection:** Enter text directly to check for potential plagiarism.
- **Document Upload:** Supports TXT, PDF, and DOCX file formats.
- **Machine Learning Classification:** Uses a trained machine learning model for prediction.
- **Text Analysis:** Displays word count and character count.
- **Analysis History:** Stores previous analysis results using SQLite.
- **Delete History:** Allows users to delete previous analysis records.
- **PDF Reports:** Generates downloadable PDF reports containing analysis details.
- **File Validation:** Checks uploaded file formats and file sizes.

## Technologies Used

| Technology | Purpose |
|---|---|
| Python | Core programming language |
| Flask | Web application framework |
| Machine Learning | Text classification |
| TF-IDF | Text feature extraction |
| Scikit-learn | Machine learning implementation |
| SQLite | Analysis history storage |
| HTML, CSS, JavaScript | Frontend development |
| ReportLab | PDF report generation |
| pypdf | PDF text extraction |
| python-docx | DOCX text extraction |

## How It Works

The application follows these steps:

1. **Input:** The user enters text or uploads a document.
2. **Text Extraction:** Text is extracted from the uploaded document.
3. **Feature Extraction:** The TF-IDF vectorizer transforms the text into numerical features.
4. **Prediction:** The trained machine learning model classifies the extracted text.
5. **Result:** The application displays one of the following predictions:
   - Plagiarism Detected
   - No Plagiarism Detected
6. **History Storage:** The analysis details are stored in an SQLite database.
7. **Report Generation:** Users can download a PDF report of their analysis.

## Project Structure

```text
Plagiarism-Detector-using-Machine-Learning/
│
├── app.py
├── Combat_Online_Plagiarism_with_AI.ipynb
├── dataset.csv
├── model.pkl
├── tfidf_vectorizer.pkl
├── requirements.txt
├── README.md
├── .gitignore
│
├── templates/
│   └── index.html
│
└── analysis_history.db
```

**Note:** The SQLite database is created automatically when the application runs. The model and vectorizer files must be available in the project root directory.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <your-github-repository-url>
```

### 2. Navigate to the Project Directory

```bash
cd Plagiarism-Detector-using-Machine-Learning
```

### 3. Create a Virtual Environment

```bash
python -m venv venv
```

### 4. Activate the Virtual Environment

For Windows:

```bash
venv\Scripts\activate
```

For Linux/macOS:

```bash
source venv/bin/activate
```

### 5. Install Dependencies

```bash
pip install -r requirements.txt
```

Install the additional document extraction dependencies:

```bash
pip install pypdf python-docx
```

### 6. Run the Application

```bash
python app.py
```

### 7. Open in Browser

Visit:

```text
http://127.0.0.1:5000/
```

The application will be available in your browser.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Loads the application |
| POST | `/api/detect` | Analyzes submitted text or uploaded documents |
| GET | `/api/history` | Retrieves previous analysis records |
| DELETE | `/api/history/<id>` | Deletes a specific analysis |
| GET | `/api/report/<id>` | Generates a PDF report |

## Limitations

- The prediction depends on the trained machine learning model and its training data.
- The application provides a classification result, not a verified plagiarism percentage.
- It does not identify the original source documents.
- The accuracy of predictions depends on the quality and characteristics of the training dataset.

## Future Improvements

- Improve model performance using additional training data.
- Explore different machine learning algorithms.
- Enhance text preprocessing.
- Improve the user interface.
- Add more detailed analysis and reporting features.

## Conclusion

This project demonstrates the application of machine learning and natural language processing techniques for plagiarism classification.

It combines TF-IDF feature extraction, a trained machine learning model, and a Flask-based web application to provide a simple interface for analyzing text and documents.

---

**Project Name:** Plagiarism Detector Using Machine Learning

**Developed as part of:** Internship Project
