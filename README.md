# HereFound-bot

HereFound is an automated IT Act compliance and deepfake detection system for digital sports media.

## Architecture

- `frontend/` - Next.js App Router dashboard and public reporter page.
- `webhook-backend/` - Express + TypeScript webhook service for Meta Graph API and Supabase integration.
- `ai-engine/` - FastAPI Python service for Gemini 1.5 Pro inference.
- `database/schema.sql` - Supabase schema and Row Level Security policies.

## Setup

### Frontend

1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env.local` and provide Supabase credentials.
4. `npm run dev`

### Webhook Backend

1. `cd webhook-backend`
2. `npm install`
3. Copy `.env.example` to `.env` and provide Supabase and Meta Graph API credentials.
4. `npm run dev`

### AI Engine

1. `cd ai-engine`
2. Create a Python virtual environment.
3. `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and provide `GOOGLE_API_KEY`.
5. `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Database

Use `database/schema.sql` to provision the Supabase tables and enable RLS.

## NOTES

- The webhook backend processes Instagram mentions and DMs, forwards reel URLs to the AI engine, stores results in Supabase, and responds through Meta Graph API.
- The AI engine uses Gemini 1.5 Pro with a strict legal prompt to identify IT Act violations.
- The frontend exposes a protected B2B dashboard and a public report route at `/public-report/[id]`.
