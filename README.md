# Relyze

Relyze is an AI-powered research paper analyzer that helps users understand academic papers through concept maps, summaries, explanations, and source-grounded insights from uploaded PDFs.

## Project Overview

Academic papers can be difficult to navigate because they often contain dense terminology, complex methods, and unfamiliar background concepts. Relyze aims to make research papers more accessible by transforming uploaded PDFs into an interactive learning experience.

Users can upload a research paper, have the paper parsed into structured sections, and explore the paper through generated concepts, subcategories, explanations, and visual concept maps.

## Core Features

* Upload research paper PDFs
* Parse paper text and sections
* Generate key concepts and subcategories
* Display paper concepts in an interactive concept map
* Show explanations and source references for concepts
* Support paper history and saved paper access
* Future support for difficulty-based explanations, vocabulary tools, and related topic exploration

## MVP Flow

```text
Upload research paper PDF
→ Parse paper text and sections
→ Generate key concepts/subcategories
→ Display concepts in an interactive map
→ Show explanations and source-grounded details
```

## Tech Stack

### Frontend

* React
* Next.js
* TypeScript
* Tailwind CSS
* React Flow for concept map visualization

### Backend

* Python
* FastAPI
* NLP / LLM-based paper analysis pipeline

### Database and Storage

* PostgreSQL
* Supabase for database, storage, and potential authentication support

## Repository

SSH clone URL:

```bash
git clone git@gitlab.com:sdsc-rds/summer-internships/rds-interns-su26/team-pentagon/relyze.git
```

## Project Structure

```text
relyze/
├── frontend/        # Next.js frontend application
├── backend/         # FastAPI backend application
├── docs/            # Planning documents, wireframes, and research notes
├── .gitignore
└── README.md
```

## Development Setup

The frontend and backend are two separate servers — both need to be running at the same time, in two separate terminal tabs/windows, for the app to work locally.

### Prerequisites

* Node.js
* npm
* Python 3
* Git

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

### Backend

Create a `backend/.env` file (git-ignored, not included in the repo) with:

```text
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_JWT_SECRET=...
```

Ask a teammate for these values — they're not committed to git.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
TORCHDYNAMO_DISABLE=1 uvicorn main:app --reload
```

`TORCHDYNAMO_DISABLE=1` is required on Apple Silicon Macs — without it, PDF uploads crash with `AssertionError: Device mps not supported`, since `docling` tries to JIT-compile its layout model against Apple's GPU backend, which isn't supported yet. This env var just makes PyTorch run the model normally instead, which is slightly slower but actually works.

Backend runs at:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

To deactivate the backend virtual environment:

```bash
deactivate
```

## Installed Frameworks

* Next.js / React frontend
* TypeScript
* Tailwind CSS
* React Flow
* FastAPI backend
* Uvicorn ASGI server

## Team Workflow

* Tasks are organized by feature area and split into frontend/backend responsibilities.
* Feature work should be developed on separate branches.
* Merge requests should be reviewed before merging into the main branch.
* API contracts should be documented before frontend/backend integration.
* Sprint work should prioritize MVP functionality before stretch features.

## Current Status

Relyze is currently in early development as part of the SDSC RDS Summer Internship 2026 program.
