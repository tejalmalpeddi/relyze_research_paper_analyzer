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

The project structure will be updated as the frontend and backend are initialized.

```text
relyze/
├── frontend/        # Next.js frontend application
├── backend/         # FastAPI backend application
├── docs/            # Planning documents, wireframes, and research notes
└── README.md
```

## Development Setup

Setup instructions will be updated as the project structure is finalized.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Team Workflow

* Tasks are organized by feature area and split into frontend/backend responsibilities.
* Feature work should be developed on separate branches.
* Merge requests should be reviewed before merging into the main branch.
* API contracts should be documented before frontend/backend integration.
* Sprint work should prioritize MVP functionality before stretch features.

## Current Status

Relyze is currently in early development as part of the SDSC RDS Summer Internship 2026 program.
