# Westbridge University CCRS

Course Registration System for Westbridge University. Students register for courses with real prerequisite, seat, and credit-limit rules. Faculty manage rosters and course details. Admins manage courses, waitlists, access control, reports, and settings.

**Live demo:** https://YOUR-APP.vercel.app
**API docs:** https://YOUR-API.onrender.com/docs

## Features

- Student dashboard, course catalog with inspection drawer, selected courses, academic record
- Registration with stream selection, system-generated student ID and roll number, email verification
- Google and GitHub sign-in (GitHub users verify their email before access)
- Faculty console: assigned courses, live rosters, timetable, profile
- Waiting list with live position, 24-hour seat offers, accept or decline
- Admin: course management, waitlists, access control (create faculty), reports with CSV export, system settings
- Single source of truth for enrollment: every count is derived from the `registrations` collection

## Tech stack

| Layer    | Technology                                                    |
| -------- | ------------------------------------------------------------- |
| Frontend | React, Vite, React Router, Tailwind CSS                       |
| Backend  | FastAPI, Pydantic v2, Motor (async MongoDB), PyJWT, Authlib   |
| Database | MongoDB Atlas                                                 |
| Email    | Gmail SMTP                                                    |
| Hosting  | Vercel (frontend), Render (backend), UptimeRobot (monitoring) |

## Project structure

```
backend/
  app/
    routes/        API endpoints
    controllers/   business logic
    services/      enrollment, waitlist, roll numbers, settings
    middleware/    JWT auth and role checks
    utils/         security, mailer
  seed.py          demo dataset
  scripts/         consistency check, migrations
src/
  pages/           screens
  components/      shared UI and layout
  services/        API client
```

## Run locally

Prerequisites: Python 3.12, Node 20+, a MongoDB Atlas cluster (or local MongoDB).

### 1. Backend

```powershell
cd "path\to\westbridge-ccrs"
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
copy backend\.env.example backend\.env      # then fill in your values
python -m backend.seed --reset              # load demo data
python -m backend.scripts.check_consistency # must pass
uvicorn backend.app.main:app --reload --port 8000
```

### 2. Frontend

```powershell
npm install
npm run dev          # http://localhost:5173
```

## Demo accounts

| Role    | Identifier    | Password    |
| ------- | ------------- | ----------- |
| Student | STU2024-00123 | password123 |
| Faculty | FAC-001       | faculty123  |
| Admin   | ADMIN-001     | admin123    |

Change these before any public deployment.

## Environment variables

Frontend (`.env` in the root, or set in Vercel):

```
VITE_API_URL=http://localhost:8000
```

Backend (`backend/.env`): see `backend/.env.example`. Important keys: `MONGO_URL`, `JWT_SECRET_KEY`, `SESSION_SECRET_KEY`, `FRONTEND_URL`, `CORS_ORIGINS`, OAuth client IDs and secrets, and SMTP settings.

## OAuth setup

Google and GitHub callback URLs must match the backend `*_REDIRECT_URI` values exactly:

- Google: `http://localhost:8000/auth/google/callback` (add the production URL too)
- GitHub: `http://localhost:8000/auth/github/callback` (add the production URL too)

## Deployment

See the deployment notes below. Vercel hosts the frontend, Render hosts the backend, and UptimeRobot pings the API every 5 minutes to keep the free instance awake.

## Security notes

- Never commit `.env` files. Rotate any secret that has been shared.
- Passwords are hashed with bcrypt. OTP codes and verification codes are stored as hashes with expiry and attempt limits.
- All registration and seat rules are enforced on the server, not the client.

## License

Academic project. Add a license if you publish it.
