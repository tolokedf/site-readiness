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
from flask import Flask, request, jsonify, render_template, send_from_directory, make_response
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from report_generator import generate_site_readiness_pdf

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "df-site-readiness-secret-2026")
PORT = int(os.environ.get("PORT", 3000))

DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
DB_FILE = DATA_DIR / "db.json"
CHECKLIST_FILE = DATA_DIR / "checklist_template.json"

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

def load_template_sections():
    if CHECKLIST_FILE.exists():
        try:
            with open(CHECKLIST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading checklist template: {e}")
    return []

def read_db():
    if not DB_FILE.exists():
        initial = {"users": [], "reports": []}
        write_db(initial)
        return initial
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                data = {"reports": []}
            if "reports" not in data:
                data["reports"] = []
            return data
    except Exception as e:
        print(f"Error reading db.json: {e}")
        initial = {"users": [], "reports": []}
        write_db(initial)
        return initial

def write_db(data):
    try:
        temp_file = DATA_DIR / "db.json.tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        temp_file.replace(DB_FILE)
    except Exception as e:
        print(f"Error writing to db.json: {e}")
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
    reports = db.setdefault("reports", [])

    if request.method == "GET":
        sorted_reports = sorted(
            reports,
            key=lambda r: r.get("updatedAt", r.get("date", "")),
            reverse=True
        )
        return jsonify(sorted_reports)

    elif request.method == "POST":
        data = request.get_json(force=True) or {}
        report_id = data.get("id")

        # Check if report already exists in database (UPSERT logic to prevent duplicates on save)
        existing_idx = None
        if report_id:
            existing_idx = next((i for i, r in enumerate(reports) if r.get("id") == report_id), None)

        if existing_idx is not None:
            # Update existing report in-place
            existing = reports[existing_idx]
            existing.update(data)
            existing["id"] = report_id
            existing["updatedAt"] = datetime.utcnow().isoformat() + "Z"
            write_db(db)
            return jsonify(existing), 200
        else:
            # Create a brand new report record
            if not report_id:
                report_id = f"rep_{int(time.time())}_{uuid.uuid4().hex[:6]}"

            sections = data.get("sections")
            if not sections or len(sections) == 0:
                sections = load_template_sections()

            new_report = {
                "id": report_id,
                "projectTitle": data.get("projectTitle", "Site AMR Readiness Audit"),
                "siteName": data.get("siteName", "Customer Facility Site"),
                "conductedBy": data.get("conductedBy", "DF Field Engineer"),
                "customerName": data.get("customerName", "Customer Project Team"),
                "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
                "amrModel": data.get("amrModel", "DFleet Standard AGV/AMR"),
                "sections": sections,
                "actionItems": data.get("actionItems", []),
                "verifiedBy": data.get("verifiedBy", ""),
                "verificationDate": data.get("verificationDate", datetime.now().strftime("%Y-%m-%d")),
                "verifierDesignation": data.get("verifierDesignation", "DF Robotics Specialist"),
                "overallStatus": data.get("overallStatus", "ACTION_REQUIRED"),
                "signature": data.get("signature", ""),
                "notes": data.get("notes", ""),
                "createdAt": data.get("createdAt") or datetime.utcnow().isoformat() + "Z",
                "updatedAt": datetime.utcnow().isoformat() + "Z"
            }

            reports.append(new_report)
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
        return jsonify(existing), 200

    elif request.method == "DELETE":
        if report_idx is None:
            return jsonify({"error": "Report not found"}), 404
        reports.pop(report_idx)
        write_db(db)
        return jsonify({"success": True, "message": "Report deleted successfully"})

@app.route("/api/upload-photo", methods=["POST"])
def upload_photo():
    """Uploads a remark evidence photo (Maximum 1 per remark)."""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "No file selected"}), 400

    safe_fn = secure_filename(file.filename) or "remark_photo.jpg"
    unique_fn = f"photo-{int(time.time())}-{uuid.uuid4().hex[:6]}-{safe_fn}"
    save_path = UPLOADS_DIR / unique_fn
    file.save(str(save_path))

    return jsonify({
        "url": f"/uploads/{unique_fn}",
        "filename": unique_fn,
        "originalName": file.filename
    }), 201

@app.route("/api/reports/<report_id>/pdf", methods=["GET"])
def export_pdf(report_id):
    db = read_db()
    report = next((r for r in db.get("reports", []) if r.get("id") == report_id), None)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    try:
        pdf_bytes = generate_site_readiness_pdf(report)
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        filename = f"Site_Readiness_FRM-FLD-003_{report.get('id', 'rep')}.pdf".replace("/", "_")
        response.headers['Content-Disposition'] = f'inline; filename="{filename}"'
        return response
    except Exception as e:
        print(f"Failed to generate PDF: {e}")
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500

if __name__ == "__main__":
    print(f"🚀 Starting Site Readiness Verification Server (Python/Flask) on http://0.0.0.0:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=True)
