#!/usr/bin/env bash
# ==============================================================================
# Site Readiness Verification - Standalone Update Script (Linux)
# Safely pulls code updates without touching local runtime data.
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================"
echo " 🔄 Updating Site Readiness App from GitHub (Standalone)..."
echo "======================================================================"

git pull origin main

if [ -f ".venv/bin/python" ]; then
    echo "📦 Checking and updating Python dependencies..."
    .venv/bin/python -m pip install -r requirements.txt --quiet
fi

echo "✅ Site Readiness update complete. Local data preserved."
echo "======================================================================"
