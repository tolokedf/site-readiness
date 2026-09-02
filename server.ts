import express from 'express';
import https from 'https';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'df-ultimate-secret-key-2026-secure-auth';

// Ensure data & uploads directories exist
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface DatabaseSchema {
  users: Array<{
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    organization?: string;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    userId: string;
    projectTitle: string;
    siteName: string;
    conductedBy: string;
    date: string;
    amrModel: string;
    customerName?: string;
    sections: any[];
    actionItems: any[];
    verifiedBy: string;
    verificationDate: string;
    verifierDesignation?: string;
    overallStatus: string;
    attachments: any[];
    sensorSnapshots: any[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

function readDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      users: [],
      reports: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json, creating clean db', err);
    const fallbackDb: DatabaseSchema = { users: [], reports: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallbackDb, null, 2));
    return fallbackDb;
  }
}

function writeDb(data: DatabaseSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `site-data-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(UPLOADS_DIR));

// Authentication Middleware
interface AuthRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

function authenticateToken(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err || !decoded) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
    req.user = decoded;
    next();
  });
}

// ==================== AUTH API ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, organization } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();

    if (db.users.some((u) => u.email === cleanEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      email: cleanEmail,
      passwordHash,
      name: name ? name.trim() : cleanEmail.split('@')[0],
      organization: organization ? organization.trim() : 'DF Automation & Robotics Customer Site',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDb(db);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      organization: newUser.organization,
      createdAt: newUser.createdAt,
    };

    return res.status(201).json({ token, user: safeUser });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to create user account' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find((u) => u.email === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      organization: user.organization,
      createdAt: user.createdAt,
    };

    return res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to sign in' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
  try {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.user?.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      organization: user.organization,
      createdAt: user.createdAt,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ==================== SITE READINESS REPORTS API ====================

// Get all reports for current user
app.get('/api/reports', authenticateToken, (req: AuthRequest, res) => {
  try {
    const db = readDb();
    const userReports = db.reports
      .filter((r) => r.userId === req.user!.id)
      .sort((a, b) => new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime());

    return res.json(userReports);
  } catch (err) {
    console.error('Fetch reports error:', err);
    return res.status(500).json({ error: 'Failed to retrieve reports' });
  }
});

// Get single report
app.get('/api/reports/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const db = readDb();
    const report = db.reports.find((r) => r.id === req.params.id && r.userId === req.user!.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    return res.json(report);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve report' });
  }
});

// Create report
app.post('/api/reports', authenticateToken, (req: AuthRequest, res) => {
  try {
    const reportData = req.body;
    const db = readDb();

    const newReport = {
      ...reportData,
      id: reportData.id || 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: req.user!.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: reportData.attachments || [],
      sensorSnapshots: reportData.sensorSnapshots || [],
    };

    db.reports.push(newReport);
    writeDb(db);

    return res.status(201).json(newReport);
  } catch (err) {
    console.error('Create report error:', err);
    return res.status(500).json({ error: 'Failed to create site readiness report' });
  }
});

// Update report
app.put('/api/reports/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const db = readDb();
    const index = db.reports.findIndex((r) => r.id === req.params.id && r.userId === req.user!.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const existing = db.reports[index];
    const updated = {
      ...existing,
      ...req.body,
      id: existing.id,
      userId: existing.userId,
      updatedAt: new Date().toISOString(),
    };

    db.reports[index] = updated;
    writeDb(db);

    return res.json(updated);
  } catch (err) {
    console.error('Update report error:', err);
    return res.status(500).json({ error: 'Failed to update report' });
  }
});

// Delete report
app.delete('/api/reports/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const db = readDb();
    const report = db.reports.find((r) => r.id === req.params.id && r.userId === req.user!.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Clean up uploaded files for this report
    if (report.attachments && Array.isArray(report.attachments)) {
      for (const att of report.attachments) {
        if (att.filename) {
          const filePath = path.join(UPLOADS_DIR, att.filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (unlinkErr) {
              console.warn('Could not delete file:', att.filename, unlinkErr);
            }
          }
        }
      }
    }

    db.reports = db.reports.filter((r) => r.id !== req.params.id);
    writeDb(db);

    return res.json({ success: true, message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Delete report error:', err);
    return res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Upload attachment for report
app.post('/api/reports/:id/attachments', authenticateToken, upload.array('files', 10), (req: AuthRequest, res) => {
  try {
    const db = readDb();
    const reportIndex = db.reports.findIndex((r) => r.id === req.params.id && r.userId === req.user!.id);

    if (reportIndex === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { sectionId, itemNumber, caption } = req.body;

    const newAttachments = files.map((file) => ({
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
      sectionId: sectionId || undefined,
      itemNumber: itemNumber ? parseInt(itemNumber, 10) : undefined,
      caption: caption || file.originalname,
      uploadedAt: new Date().toISOString(),
    }));

    if (!db.reports[reportIndex].attachments) {
      db.reports[reportIndex].attachments = [];
    }

    db.reports[reportIndex].attachments.push(...newAttachments);
    db.reports[reportIndex].updatedAt = new Date().toISOString();
    writeDb(db);

    return res.status(201).json({
      message: `${files.length} file(s) attached successfully`,
      attachments: newAttachments,
      report: db.reports[reportIndex],
    });
  } catch (err) {
    console.error('Attachment upload error:', err);
    return res.status(500).json({ error: 'Failed to upload attachments' });
  }
});

// Delete attachment from report
app.delete('/api/reports/:id/attachments/:attachmentId', authenticateToken, (req: AuthRequest, res) => {
  try {
    const db = readDb();
    const reportIndex = db.reports.findIndex((r) => r.id === req.params.id && r.userId === req.user!.id);

    if (reportIndex === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = db.reports[reportIndex];
    const attachment = (report.attachments || []).find((a: any) => a.id === req.params.attachmentId);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (attachment.filename) {
      const filePath = path.join(UPLOADS_DIR, attachment.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Failed unlinking file:', e);
        }
      }
    }

    report.attachments = (report.attachments || []).filter((a: any) => a.id !== req.params.attachmentId);
    report.updatedAt = new Date().toISOString();
    writeDb(db);

    return res.json({ success: true, message: 'Attachment deleted', report });
  } catch (err) {
    console.error('Delete attachment error:', err);
    return res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// Ping endpoint for Wi-Fi speed & latency test
app.get('/api/ping', (_req, res) => {
  res.json({
    timestamp: Date.now(),
    serverTime: new Date().toISOString(),
    status: 'ok',
  });
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', app: 'DF Ultimate - Site Readiness Verification' });
});

// Production vs Development Server Initialization
async function startServer() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (typeof __filename !== 'undefined' && (__filename.endsWith('.cjs') || __filename.includes('dist'))) ||
    Boolean(process.env.npm_lifecycle_event === 'start');

  if (isProduction) {
    // Pure production static serving - absolutely no Vite initialization, watching, or middleware
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development mode only - dynamically import and mount Vite dev server
    try {
      const viteModule = await import('vite');
      const createViteServer = viteModule.createServer;
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite dev server failed to load, falling back to static files:', err);
      const distPath = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  }

  const certPath = path.join(process.cwd(), 'certs', 'cert.pem');
  const keyPath = path.join(process.cwd(), 'certs', 'key.pem');
  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

  // In AI Studio preview container, nginx reverse proxy communicates via HTTP on port 3000 unless ENABLE_HTTPS is explicitly set.
  // In standalone environments (such as local machine or production), automatically use HTTPS when certificate files exist.
  const isAiStudioContainer = process.env.DISABLE_HMR === 'true' && !process.env.ENABLE_HTTPS;
  const useHttps = hasCerts && (process.env.ENABLE_HTTPS === 'true' || !isAiStudioContainer);

  if (useHttps) {
    try {
      const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      };
      const server = https.createServer(httpsOptions, app);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`DF Ultimate server running over HTTPS on https://0.0.0.0:${PORT}`);
      });
      return;
    } catch (e) {
      console.warn('Failed to initialize HTTPS server, falling back to HTTP:', e);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DF Ultimate server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
