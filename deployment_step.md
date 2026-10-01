# DF Site Readiness Verification (FRM-FLD-003) - Deployment & Update Guide

Complete step-by-step instructions to deploy, run, and update the **Site Readiness Verification Application** on **Windows** and **Linux** machines.

- **Repository URL:** `https://github.com/tolokedf/site-readiness.git`
- **Default Port:** `3000`
- **Local Access:** `http://localhost:3000`
- **Network Access (Mobile / Tablet / LAN):** `http://<YOUR_IP_ADDRESS>:3000`

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [First-Time Deployment on Windows](#first-time-deployment-on-windows)
3. [First-Time Deployment on Linux](#first-time-deployment-on-linux)
4. [How to Pull Updates from GitHub](#how-to-pull-updates-from-github)
   - [Windows One-Click Update](#windows-update-updatebat)
   - [Linux One-Click Update](#linux-update-updatesh)
   - [Manual Git Pull](#manual-git-pull)
   - [How Local Data is Protected](#how-local-data-is-protected)
5. [Firewall & Network Access Configuration](#firewall--network-access-configuration)
6. [Running as a Background Service on Linux (systemd)](#running-as-a-background-service-on-linux-systemd)
7. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Prerequisites

Before starting, ensure your machine has:

- **Python 3.10+ (with pip and venv):**
  - **Windows:** [Download Python 3.10+](https://www.python.org/downloads/)  
    *(⚠️ Ensure **"Add python.exe to PATH"** is checked during installation).*
  - **Linux:** `sudo apt update && sudo apt install python3 python3-pip python3-venv -y`
- **Git:**
  - **Windows:** [Download Git for Windows](https://git-scm.com/download/win)
  - **Linux:** `sudo apt install git -y`

---

## First-Time Deployment on Windows

### Option A: Using `start.bat` (Recommended - Fully Automated)

1. Open PowerShell or Command Prompt, and navigate to the project directory (or clone it):
   ```cmd
   git clone https://github.com/tolokedf/site-readiness.git
   cd site-readiness
   ```
   *(If you downloaded a ZIP, extract it and open the folder in File Explorer).*

2. Double-click **`start.bat`** in Windows File Explorer (or run `.\start.bat` in CMD / PowerShell).
   
   The launcher will automatically:
   - Verify Python is installed and configured in PATH.
   - Create a clean virtual environment (`.venv`) if one does not exist.
   - Upgrade `pip` and install all required dependencies from `requirements.txt`.
   - Start the multi-threaded Waitress WSGI server on port `3000`.

3. Open your browser and go to:
   ```text
   http://localhost:3000
   ```

---

## First-Time Deployment on Linux

1. Clone repository and navigate to folder:
   ```bash
   git clone https://github.com/tolokedf/site-readiness.git
   cd site-readiness
   ```

2. Make launcher scripts executable:
   ```bash
   chmod +x start.sh update.sh
   ```

3. Launch server:
   ```bash
   ./start.sh
   ```
   *(The script creates `.venv`, installs dependencies from `requirements.txt`, and launches the Waitress WSGI production server).*

4. Open your browser and go to:
   ```text
   http://localhost:3000
   ```

---

## How to Pull Updates from GitHub

When new features, bug fixes, or template updates are pushed to the GitHub repository, update your deployment using the methods below:

### Windows Update (`update.bat`)

Double-click **`update.bat`** (or execute `.\update.bat` in PowerShell / CMD).

This automated script performs:
1. `git pull origin main` — Pulls latest code changes.
2. Updates any new Python libraries from `requirements.txt` into `.venv`.
3. Displays a success message confirming your survey data is intact.

After updating, simply double-click **`start.bat`** to run the updated app.

---

### Linux Update (`update.sh`)

Open terminal in the application folder and run:
```bash
./update.sh
```

This runs:
1. `git pull origin main`
2. Updates virtual environment packages via `pip install -r requirements.txt`.
3. Confirms completion with local survey data preserved.

Then re-run:
```bash
./start.sh
```

---

### Manual Git Pull

If you prefer manual terminal commands:
```bash
# 1. Pull latest commits from GitHub
git pull origin main

# 2. Update Python dependencies in your virtual environment
# Windows:
.venv\Scripts\python -m pip install -r requirements.txt
# Linux:
.venv/bin/python -m pip install -r requirements.txt
```

---

### How Local Data is Protected

During updates, your site survey reports and uploaded evidence photos are **100% safe**:
- **Survey Database:** Stored locally in `data/db.json` (ignored by git).
- **Remark Photos:** Stored locally in `data/uploads/` (ignored by git).
- **Git Pulls:** Only update application source code (`app.py`, `report_generator.py`, `templates/`, `scripts/`, etc.). Git will **never** overwrite or wipe your local survey database or photos.

---

## Firewall & Network Access Configuration

To allow tablets, iPads, mobile phones, or colleague laptops on the same Wi-Fi / Local Area Network (LAN) to access the app:

### 1. Check Server IP Address

- **On Windows:**
  Open Command Prompt and run:
  ```cmd
  ipconfig
  ```
  Note the **IPv4 Address** (e.g., `192.168.1.150`).

- **On Linux:**
  Open Terminal and run:
  ```bash
  hostname -I
  # or: ip -br a
  ```
  Note your local IP (e.g., `192.168.1.150`).

### 2. Allow Port 3000 in Firewall

- **Windows Firewall (Run PowerShell as Administrator):**
  ```powershell
  netsh advfirewall firewall add rule name="Site Readiness Port 3000" dir=in action=allow protocol=TCP localport=3000
  ```

- **Linux (UFW):**
  ```bash
  sudo ufw allow 3000/tcp
  sudo ufw reload
  ```

### 3. Access on Mobile / Tablet

Open Google Chrome or Safari on your phone or tablet connected to the same Wi-Fi and navigate to:
```text
http://<SERVER_IP>:3000
```
*(Example: `http://192.168.1.150:3000`)*

---

## Running as a Background Service on Linux (systemd)

To keep the application running continuously in the background and auto-start on reboot:

1. Create a systemd service file:
   ```bash
   sudo nano /etc/systemd/system/site-readiness.service
   ```

2. Add the following content *(adjust user and path if needed)*:
   ```ini
   [Unit]
   Description=Site Readiness Verification Application (Port 3000)
   After=network.target

   [Service]
   Type=simple
   User=tinonn
   WorkingDirectory=/home/tinonn/site_readiness_webapp
   ExecStart=/home/tinonn/site_readiness_webapp/.venv/bin/python /home/tinonn/site_readiness_webapp/scripts/run_server.py
   Restart=always
   RestartSec=5
   Environment=PYTHONUNBUFFERED=1

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable site-readiness
   sudo systemctl start site-readiness
   ```

4. Manage service:
   ```bash
   # Check status
   sudo systemctl status site-readiness

   # View live logs
   journalctl -u site-readiness -f

   # Restart after updating code
   sudo systemctl restart site-readiness
   ```

---

## Troubleshooting & FAQ

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **`python is not recognized as an internal or external command`** | Python not added to system PATH during installation on Windows. | Reinstall Python and make sure to check **"Add Python to PATH"**. |
| **`Can access locally on PC, but phone/tablet shows timeout`** | Firewall blocking Port 3000, or devices on different Wi-Fi networks / AP Isolation active. | Add firewall rule for port 3000. Ensure both devices are connected to the same Wi-Fi network without AP client isolation. |
| **`Address already in use: 3000`** | Another application or previous instance is holding port 3000. | Windows: `netstat -ano \| findstr :3000` then `taskkill /F /PID <PID>`. <br>Linux: `sudo lsof -i :3000` then `sudo kill -9 <PID>`. |
| **`git pull: error: Your local changes would be overwritten`** | Local project files modified outside git. | Stash changes with `git stash`, run `update.bat` / `./update.sh`, then restore with `git stash pop`. Note: `data/db.json` is gitignored and will never conflict. |
| **`ModuleNotFoundError: No module named 'waitress'`** | Virtual environment dependencies not installed. | Activate virtual environment and run `pip install -r requirements.txt`. |
