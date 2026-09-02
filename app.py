"""
DF Ultimate - Site Readiness Verification Application (Python / Flask)
Port: 3000
"""
import os
import sys
import json
import uuid
import time
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, render_template, send_from_directory, redirect, url_for
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "df-site-readiness-secret-2026")
PORT = int(os.environ.get("PORT", 3000))

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
DB_FILE = DATA_DIR / "db.json"
CHECKLIST_FILE = DATA_DIR / "checklist_template.json"

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

def load_template_sections():
    if CHECKLIST_FILE.exists():
        with open(CHECKLIST_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def read_db():
    if not DB_FILE.exists():
        initial = {"users": [], "reports": []}
        write_db(initial)
        return initial
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        initial = {"users": [], "reports": []}
        write_db(initial)
        return initial

def write_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# ==================== WEB PAGES ====================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(str(UPLOADS_DIR), filename)

# ==================== REST APIS ====================

@app.route("/api/health")
def health():
    return jsonify({"status": "healthy", "app": "DF Ultimate - Site Readiness Verification", "port": PORT})

@app.route("/api/ping")
def ping():
    return jsonify({
        "timestamp": int(time.time() * 1000),
        "serverTime": datetime.utcnow().isoformat() + "Z",
        "status": "ok"
    })

@app.route("/api/template")
def get_template():
    return jsonify(load_template_sections())

@app.route("/api/reports", methods=["GET", "POST"])
def reports_handler():
    db = read_db()
    if request.method == "GET":
        # Sort latest first
        sorted_reports = sorted(db.get("reports", []), key=lambda r: r.get("updatedAt", r.get("date", "")), reverse=True)
        return jsonify(sorted_reports)

    elif request.method == "POST":
        data = request.get_json(force=True) or {}
        report_id = data.get("id") or f"rep_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        
        sections = data.get("sections")
        if not sections or len(sections) == 0:
            sections = load_template_sections()

        new_report = {
            "id": report_id,
            "projectTitle": data.get("projectTitle", "New Site AMR Readiness Audit"),
            "siteName": data.get("siteName", "Customer Facility Site"),
            "conductedBy": data.get("conductedBy", "DF Field Engineer"),
            "customerName": data.get("customerName", "Customer Project Team"),
            "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
            "amrModel": data.get("amrModel", "DFleet Standard AGV/AMR"),
            "sections": sections,
            "actionItems": data.get("actionItems", []),
            "verifiedBy": data.get("verifiedBy", ""),
            "verificationDate": data.get("verificationDate", ""),
            "verifierDesignation": data.get("verifierDesignation", "DF Automation Specialist"),
            "overallStatus": data.get("overallStatus", "ACTION_REQUIRED"),
            "attachments": data.get("attachments", []),
            "sensorSnapshots": data.get("sensorSnapshots", []),
            "notes": data.get("notes", ""),
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z"
        }

        db.setdefault("reports", []).append(new_report)
        write_db(db)
        return jsonify(new_report), 201

@app.route("/api/reports/<report_id>", methods=["GET", "PUT", "DELETE"])
def single_report_handler(report_id):
    db = read_db()
    reports = db.get("reports", [])
    
    report_idx = next((i for i, r in enumerate(reports) if r.get("id") == report_id), None)
    
    if request.method == "GET":
        if report_idx is None:
            return jsonify({"error": "Report not found"}), 404
        return jsonify(reports[report_idx])

    elif request.method == "PUT":
        if report_idx is None:
            return jsonify({"error": "Report not found"}), 404
        data = request.get_json(force=True) or {}
        existing = reports[report_idx]
        existing.update(data)
        existing["id"] = report_id
        existing["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        write_db(db)
        return jsonify(existing)

    elif request.method == "DELETE":
        if report_idx is None:
            return jsonify({"error": "Report not found"}), 404
        # Delete associated attachments on disk
        rep = reports[report_idx]
        for att in rep.get("attachments", []):
            fn = att.get("filename")
            if fn:
                fp = UPLOADS_DIR / fn
                if fp.exists():
                    try:
                        fp.unlink()
                    except Exception:
                        pass
        reports.pop(report_idx)
        write_db(db)
        return jsonify({"success": True, "message": "Report deleted successfully"})

@app.route("/api/reports/<report_id>/attachments", methods=["POST"])
def upload_attachment(report_id):
    db = read_db()
    reports = db.get("reports", [])
    report_idx = next((i for i, r in enumerate(reports) if r.get("id") == report_id), None)
    if report_idx is None:
        return jsonify({"error": "Report not found"}), 404

    if "files" not in request.files:
        return jsonify({"error": "No files uploaded"}), 400

    files = request.files.getlist("files")
    section_id = request.form.get("sectionId", "")
    item_number = request.form.get("itemNumber")
    caption = request.form.get("caption", "")

    new_attachments = []
    for file in files:
        if file and file.filename:
            raw_fn = secure_filename(file.filename) or "upload.bin"
            unique_name = f"site-{int(time.time())}-{uuid.uuid4().hex[:6]}-{raw_fn}"
            file_path = UPLOADS_DIR / unique_name
            file.save(str(file_path))

            att = {
                "id": f"att_{int(time.time())}_{uuid.uuid4().hex[:6]}",
                "filename": unique_name,
                "originalName": file.filename,
                "mimetype": file.content_type or "application/octet-stream",
                "size": os.path.getsize(str(file_path)),
                "url": f"/uploads/{unique_name}",
                "sectionId": section_id if section_id else None,
                "itemNumber": int(item_number) if item_number and item_number.isdigit() else None,
                "caption": caption or file.filename,
                "uploadedAt": datetime.utcnow().isoformat() + "Z"
            }
            new_attachments.append(att)

    reports[report_idx].setdefault("attachments", []).extend(new_attachments)
    reports[report_idx]["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    write_db(db)

    return jsonify({
        "message": f"{len(new_attachments)} file(s) attached successfully",
        "attachments": new_attachments,
        "report": reports[report_idx]
    }), 201

if __name__ == "__main__":
    print(f"🚀 Starting Site Readiness Verification Server (Python/Flask) on http://0.0.0.0:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=True)
