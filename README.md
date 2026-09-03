# DF Site Readiness Verification Application (FRM-FLD-003)

An official engineering assessment tool for autonomous mobile robot (AMR) and automated guided vehicle (AGV) deployment site surveys.

---

## 🌟 Key Features

- **Strict Alignment with `FRM-FLD-003`**: Follows the official DF Automation & Robotics checklist specification with all 8 standard evaluation categories:
  1. Network & IT Infrastructure
  2. Power & Electrical Requirements
  3. AMR Navigation Environment
  4. Floor & Physical Environment
  5. Operational Safety
  6. Charging Infrastructure
  7. Material Handling Interfaces
  8. Site Access & Project Coordination
- **Section Evidence Photo Upload (Max 1 Photo per Section)**: Capture or attach facility photos directly within each section with instant thumbnail previews.
- **Action Items & Rectification Tracker**: Manage pending site modification tasks with responsible PIC and Due Dates.
- **ReportLab PDF Generator**: Generates an official, pixel-accurate `FRM-FLD-003` PDF report embedding section photos, rating badges, and sign-offs.
- **Printable HTML View**: Print-ready format supporting direct browser printing.
- **Wi-Fi & LAN Ready**: Runs with Waitress multi-threaded WSGI on port `3000` accessible across the local network.

---

## 🚀 Quick Start

### 1. Setup Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run Application
```bash
# Production server (Waitress WSGI on port 3000)
python3 scripts/run_server.py

# Or development server
python3 app.py
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Directory Structure

```
site-readiness/
├── app.py                      # Flask API backend & routes
├── report_generator.py         # Official ReportLab PDF generation engine
├── data/                       # Runtime storage (.gitignored)
│   ├── checklist_template.json # Canonical 8-section FRM-FLD-003 checklist criteria
│   ├── uploads/                # Uploaded section photos
│   └── db.json                 # Audit survey records database
├── scripts/run_server.py       # Production server launcher (Waitress)
└── templates/
    └── index.html              # Responsive Tailwind web interface
```
