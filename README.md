# Career Echo AI

AI-powered interview preparation and resume analysis platform with real-time voice interviews.

## 🚀 Quick Start

Follow the steps below to get started.

## Stack Overview
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Express, TypeScript, Neon Postgres
- **Auth:** JWT with bcrypt
- **AI:** Groq (Llama 3.1 70B) - Ultra-fast, free tier

> **Note:** Using Groq for blazing-fast AI responses (10-20x faster than GPT-4) with generous free tier (30 requests/min).

## Prerequisites
- Node.js 18+
- [Neon Postgres](https://neon.tech) account (free tier available)
- [Groq API key](https://console.groq.com/keys) (free tier: 30 requests/min)

## Setup Summary

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Get a Neon database at https://neon.tech
   - Update `.env` with your database URL and secrets
   - Run `npm run check:env` to verify

3. **Initialize database:**
   ```bash
   npm run db:init
   ```

4. **Start servers:**
   ```bash
   # Terminal 1 - Backend
   npm run server:dev
   
   # Terminal 2 - Frontend
   npm run dev
   ```

5. **Open app:**
   Navigate to http://localhost:8080/

## Database Setup (Neon)
1. Create a new Neon project/database.
2. Run the SQL migration located at `server/migrations/001_init.sql` against your Neon database (via the Neon console or `psql`).
3. Confirm the following tables exist: `users`, `interview_sessions`, `resumes`.

## Install Dependencies
```bash
npm install
```

## Start the Backend API (Express + Neon)
```powershell
npm run server:dev
```
The API will boot on `http://localhost:4000` by default.

## Start the Frontend (Vite)
Open a second terminal and run:
```powershell
npm run dev
```
The web app runs on `http://localhost:5173`.

## Production Builds
- Build the backend: `npm run server:build`
- Start the compiled backend: `npm run server:start`
- Build the frontend: `npm run build`

## Key API Endpoints
- `POST /api/auth/register`  `POST /api/auth/login`  `POST /api/auth/logout`
- `GET /api/interviews`  `POST /api/interviews`  `PATCH /api/interviews/:id`
- `POST /api/ai/analyze-interview`  `POST /api/ai/realtime-token`
- `POST /api/resumes`

## Notes
- The realtime interviewer defaults to the **GPT-5 Codex Preview** model. Override via `VITE_REALTIME_MODEL` or `OPENAI_REALTIME_MODEL`.
- Resume uploads are saved locally under `server/uploads/resumes/` during development. Configure an object store for production.
- The legacy Supabase integration has been fully replaced by the Neon-backed Express API.
