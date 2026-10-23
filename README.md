# BookLeaf Author Support & Communication Portal

A full-stack web application designed to streamline communication between authors and the BookLeaf Publishing support team. The portal provides author-specific book and royalty information, structured support ticket management, and AI-assisted support workflows.

## Live Application

**Deployed Website:** https://bookleaf-author-support-portal-fnow.onrender.com/

**API Health Check:** https://bookleaf-author-support-portal-fnow.onrender.com/api/health

> **Note:** The application is hosted on Render's free tier. The first request may take longer if the service has been inactive.

## Demo Login Credentials

The following accounts are provided for assignment evaluation using sample data.

### Author Account

- **Email:** `priya.sharma@email.com`
- **Password:** `Author@12345`

### Admin Account

- **Email:** `admin@bookleaf.demo`
- **Password:** `Admin@12345`

**Important:** These credentials are for demonstration purposes only and should not be used in a production application.

## Features

### Author Portal

- Secure author login and role-based access
- View author-specific books and royalty information
- Create support tickets for publishing-related queries
- Track ticket status and view conversation history
- Communicate with the support team through ticket replies

### Admin Support Dashboard

- View and manage author support tickets
- Filter tickets by status, category, and priority
- Update ticket classification and status
- Reply to author queries
- Add private internal notes visible only to administrators
- Review author and ticket information

### AI-Assisted Support

- Google Gemini integration for ticket classification
- AI-assisted response drafting
- Knowledge-base-grounded reply suggestions
- Human review before sending support responses

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Python, Flask |
| Database | SQLite (local), PostgreSQL (deployed) |
| ORM | Flask-SQLAlchemy |
| AI | Google Gemini API |
| Hosting | Render |
| Version Control | Git and GitHub |

## Project Structure

```text
bookleaf-author-support-portal/
├── backend/
│   ├── app/
│   ├── run.py
│   ├── seed.py
│   ├── requirements.txt
│   └── test_api.py
├── frontend/
├── data/
│   └── bookleaf_sample_data.json
├── .gitignore
└── README.md
```

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/manishaarya4516/bookleaf-author-support-portal.git
cd bookleaf-author-support-portal
```

### 2. Backend Setup

Create and activate a Python virtual environment:

```bash
cd backend
python -m venv .venv
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory and configure:

```env
SECRET_KEY=replace-with-a-secure-random-value
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

For local development, the application uses SQLite by default.

Initialize sample data:

```bash
python seed.py
```

Start the backend:

```bash
python run.py
```

### 3. Frontend Setup

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite.

## Testing

Run backend tests from the `backend` directory:

```bash
python -m pytest -v
```

Build the frontend:

```bash
npm run build
```

## Deployment

The application is deployed on Render using a Python Web Service and PostgreSQL database.

The React frontend is built into static assets and served by Flask, allowing the frontend and backend API to operate under the same domain.

Environment variables are configured securely in Render rather than committed to GitHub.

## Security and Access Control

- Role-based authorization for authors and administrators
- Authors can access only their permitted ticket information
- Private administrative notes are excluded from author-facing API responses
- Sensitive configuration is stored in environment variables
- Demo data and credentials are intended only for evaluation

## Future Improvements

- Email notifications for ticket updates
- Advanced analytics and support reporting
- Additional automated tests
- Improved monitoring and deployment automation

## Assignment Status

The core portal has been implemented and deployed, including author and administrator workflows, ticket management, PostgreSQL integration, and AI-assisted support functionality.

---

**Developed as a technical assignment for BookLeaf Publishing.**