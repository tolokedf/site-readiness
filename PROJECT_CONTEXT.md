# Site Readiness Verification (FRM-FLD-003) — Project Context

## 1. Overview
The **Site Readiness Verification Application** enables DF robotics deployment engineers to evaluate and verify client facility conditions before AMR hardware commissioning.

## 2. Technical Stack
- **Backend**: Python 3 / Flask
- **Server**: Waitress WSGI (Multi-threaded worker pool on Port 3000)
- **PDF Engine**: ReportLab 5.0 (Constructs official `FRM-FLD-003` forms with embedded section photos)
- **Frontend**: HTML5, Tailwind CSS, Vanilla JS
- **Storage**: `data/db.json` and `data/uploads/` (strictly isolated and gitignored)

## 3. Endpoints
- `GET /` — Interactive web application
- `GET /api/template` — Returns the canonical 8-section FRM-FLD-003 criteria
- `GET /api/reports` — Lists all audit records
- `GET /api/reports/<id>` — Fetches a single audit report
- `POST /api/reports` — Saves or updates an audit record
- `DELETE /api/reports/<id>` — Deletes an audit record
- `POST /api/upload-photo` — Uploads an evidence photo (max 1 per section)
- `GET /api/reports/<id>/pdf` — Generates and downloads the official ReportLab PDF
