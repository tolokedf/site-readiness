# Site Readiness Verification (FRM-FLD-003) — Project Context

> **CRITICAL INSTRUCTION & SCOPE DIRECTIVE:**
> **Do not add additional feature/button/text that did not mention in instruction.**
> Strictly implement only what the user has requested. Preserve all existing functionality and UI components.

---

## 1. Overview
The **Site Readiness Verification Application** enables DF robotics deployment engineers to evaluate and verify client facility conditions before AMR hardware commissioning matching official standard `FRM-FLD-003`.

## 2. Technical Stack
- **Backend**: Python 3 / Flask
- **Server**: Waitress WSGI (Multi-threaded worker pool on Port 3000)
- **PDF Engine**: ReportLab 5.0 (Constructs official `FRM-FLD-003` forms with embedded remark photos and handwritten signatures)
- **Frontend**: HTML5, Tailwind CSS, Vanilla JS, HTML5 Signature Canvas
- **Storage**: `data/db.json` and `data/uploads/` (strictly isolated and gitignored)

## 3. Key Capabilities & Features
- **Full Responsive Design**: Seamless layout across mobile smartphones, tablets, iPads, laptops, and desktop monitors.
- **Remark-Level Photo Evidence**: Every individual checklist item/remark row allows uploading/capturing maximum 1 evidence photo with fullscreen lightbox preview.
- **Handwritten Signature Pad**: Canvas supporting mouse and touchscreen stylus signatures, embedded directly into the official ReportLab PDF.
- **Instant Non-blocking Save**: Automatic upsert (update existing report in-place without generating duplicates) with smooth toast notifications.

## 4. Endpoints
- `GET /` — Interactive responsive web application
- `GET /api/template` — Returns canonical FRM-FLD-003 criteria with remark photo slots
- `GET /api/reports` — Lists all audit records
- `GET /api/reports/<id>` — Fetches a single audit report
- `POST /api/reports` — Saves (upserts) or creates an audit record
- `PUT /api/reports/<id>` — Updates an audit record in-place
- `DELETE /api/reports/<id>` — Deletes an audit record
- `POST /api/upload-photo` — Uploads an evidence photo (max 1 per remark)
- `GET /api/reports/<id>/pdf` — Generates and downloads the official ReportLab PDF with photos & signature
