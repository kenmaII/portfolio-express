require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Contact = require("./models/contact");
const Project = require("./models/project");
const Settings = require('./models/settings');
const nodemailer = require("nodemailer");
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// ensure uploads directory exists and serve it
const uploadsDir = path.join(__dirname, 'public', 'uploads');
try{ fs.mkdirSync(uploadsDir, { recursive: true }); }catch(e){}
app.use('/uploads', express.static(uploadsDir));
const upload = multer({ dest: uploadsDir });

// Global safety: prevent process from exiting on DB DNS glitches; log and continue serving static files.
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const MongoStore = require('connect-mongo');
// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Session (in-memory for demo). For production, use a persistent store.
// Use Mongo-backed session store when possible (safer for production)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 },
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, ttl: 14 * 24 * 60 * 60 })
}));

// Parse URI for diagnostics
const parseMongoUri = (uri) => {
  try {
    const match = uri.match(/^mongodb\+srv:\/\/[^@]+@([^/]+)\/([^?]+)?/);
    if (!match) return { host: "unknown", db: "unknown" };
    const host = match[1];
    const db = match[2] || "";
    return { host, db };
  } catch {
    return { host: "unknown", db: "unknown" };
  }
};
const mongoDiag = parseMongoUri(process.env.MONGO_URI || "");
console.log("ℹ️ Using Mongo host:", mongoDiag.host, "db:", mongoDiag.db || "<none>");

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

const mongoConn = mongoose.connection;
mongoConn.on("connected", () => console.log("ℹ️ Mongo event: connected"));
mongoConn.on("disconnected", () => console.log("ℹ️ Mongo event: disconnected"));
mongoConn.on("error", (e) => console.error("ℹ️ Mongo event: error", e));

// Simple Server-Sent Events (SSE) broadcaster for live updates
const sseClients = new Set();
function sendSseEvent(event, data) {
  const payload = `data: ${JSON.stringify({ event, data })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (e) {
      // ignore
    }
  }
}

app.get('/events', (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write('retry: 10000\n\n');
  sseClients.add(res);
  req.on('close', () => { sseClients.delete(res); });
});

// File upload endpoint for admin: stores into public/uploads and returns URL
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.status(401).json({ success: false, msg: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ success: false, msg: 'No file uploaded' });
    // build public accessible url
    const rel = '/uploads/' + req.file.filename;
    res.json({ success: true, url: rel });
  } catch (e) {
    console.error('Upload error', e);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// Ensure single admin user exists if env vars provided
const ensureAdminFromEnv = async () => {
  try {
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    if (!adminUser || !adminPass) return;
    const exists = await User.findOne({ username: adminUser });
    if (exists) return console.log('ℹ️ Admin user exists');
    const hash = await bcrypt.hash(adminPass, 10);
    const user = new User({ username: adminUser, passwordHash: hash, role: 'admin' });
    await user.save();
    console.log('✅ Created admin user from env');
  } catch (e) {
    console.error('❌ Failed to ensure admin user from env', e);
  }
};

// Run after connection established
mongoConn.once('connected', () => {
  ensureAdminFromEnv();
});

// Simple nodemailer setup: if EMAIL_USER and EMAIL_PASS are present in env (e.g. Vercel),
// create a transporter and rely on the platform-provided SMTP settings. No verification step.
let transporter = null;
let mailTransporterReady = false;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 465,
      secure: process.env.EMAIL_SECURE !== 'false',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    // verify transporter connectivity asynchronously
    transporter.verify().then(() => {
      mailTransporterReady = true;
      console.info('✅ Mail transporter verified and ready');
    }).catch((err) => {
      mailTransporterReady = false;
      console.warn('⚠️ Mail transporter configured but verification failed:', err && err.message ? err.message : err);
    });
  } catch (err) {
    console.error('❌ Failed to configure mail transporter:', err && err.message ? err.message : err);
    transporter = null;
    mailTransporterReady = false;
  }
} else {
  console.info('ℹ️ EMAIL_USER or EMAIL_PASS not set — mailer not configured.');
}

// Routes
app.post("/contact", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        msg: "Database not connected. Please try again shortly.",
      });
    }

    const { name, email, subject, message } = req.body;

    // Save to MongoDB
    const newContact = new Contact({ name, email, subject, message });
    await newContact.save();

    // Send email (if transporter is configured). If not configured or sending fails,
    // we still return success because the contact was saved.
    if (transporter && mailTransporterReady) {
      try {
        await transporter.sendMail({
          from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: `New Contact Form Submission: ${subject}`,
          text: `You got a new message from your portfolio:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`,
        });
        return res.json({ success: true, msg: 'Message saved & email sent!' });
      } catch (mailErr) {
        console.error('❌ Error sending email:', mailErr && mailErr.message ? mailErr.message : mailErr);
        return res.json({ success: true, msg: 'Message saved. Email failed.' });
      }
    } else {
      // transporter not configured or not ready
      return res.json({ success: true, msg: 'Message saved. Email not configured.' });
    }
  } catch (err) {
    console.error("❌ Error handling contact:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Test email endpoint (secured): admin session OR TEST_EMAIL_SECRET header
app.post('/api/test-email', async (req, res) => {
  try {
    // allow admin session
    const hasSession = req.session && req.session.userId;
    const secretHeader = req.get('x-test-email-secret');
    const hasSecret = process.env.TEST_EMAIL_SECRET && secretHeader === process.env.TEST_EMAIL_SECRET;
    if (!hasSession && !hasSecret) return res.status(401).json({ success: false, msg: 'Unauthorized' });

    if (!transporter || !mailTransporterReady) return res.status(503).json({ success: false, msg: 'Mailer not configured or not ready' });

    const subject = 'Portfolio — Test email';
    const body = `This is a test email sent from the portfolio app on ${new Date().toISOString()}`;
    await transporter.sendMail({
      from: `"Portfolio Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject,
      text: body,
    });
    res.json({ success: true, msg: 'Test email sent' });
  } catch (err) {
    console.error('Test email send error', err);
    res.status(500).json({ success: false, msg: 'Failed to send test email', error: err && err.message });
  }
});

// Healthcheck
app.get("/health", (req, res) => {
  const mongoStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const dbState = mongoStates[mongoose.connection.readyState] || "unknown";
  res.json({
    ok: true,
    db: dbState,
  mail: mailTransporterReady ? "configured" : "not_configured",
    mongo: { host: mongoDiag.host, db: mongoDiag.db || "<none>" },
    readyState: mongoose.connection.readyState,
  });
});

// Projects API (minimal CRUD)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, projects });
  } catch (err) {
    console.error('Error fetching projects', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
  if (!req.session || !req.session.userId) return res.status(401).json({ success: false, msg: 'Unauthorized' });
  const { title, description, tags, imageUrl, url } = req.body;
  // Basic validation
  if (!title || !description) return res.status(400).json({ success: false, msg: 'Title and description are required' });
  const project = new Project({ title: title.trim(), description: description.trim(), tags: tags || [], imageUrl, url });
  await project.save();
  // notify clients
  sendSseEvent('projects.updated', {});
  res.json({ success: true, project });
  } catch (err) {
    console.error('Error creating project', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
  if (!req.session || !req.session.userId) return res.status(401).json({ success: false, msg: 'Unauthorized' });
  const { id } = req.params;
  await Project.findByIdAndDelete(id);
  sendSseEvent('projects.updated', {});
  res.json({ success: true });
  } catch (err) {
    console.error('Error deleting project', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// Update project (require auth)
app.put('/api/projects/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ success: false, msg: 'Unauthorized' });
  try {
    const { id } = req.params;
  const { title, description, tags, imageUrl, url } = req.body;
  if (!title || !description) return res.status(400).json({ success: false, msg: 'Title and description are required' });
  const project = await Project.findByIdAndUpdate(id, { title: title.trim(), description: description.trim(), tags: tags || [], imageUrl, url }, { new: true });
  sendSseEvent('projects.updated', {});
  res.json({ success: true, project });
  } catch (err) {
    console.error('Error updating project', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// Serve a minimal admin UI for CRUD
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Settings API (very small)
app.get('/api/settings', async (req, res) => {
  try {
    let s = await Settings.findOne().lean();
    if (!s) {
      s = await Settings.create({});
    }
    res.json({ success: true, settings: s });
  } catch (err) {
    console.error('Error fetching settings', err);
    res.status(500).json({ success: false });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
  if (!req.session || !req.session.userId) return res.status(401).json({ success: false, msg: 'Unauthorized' });
  const { siteTitle, primaryColor, fontFamily, profileImage, skills } = req.body;
  let s = await Settings.findOne();
  if (!s) s = new Settings();
  s.siteTitle = siteTitle || s.siteTitle;
  s.primaryColor = primaryColor || s.primaryColor;
  s.fontFamily = fontFamily || s.fontFamily;
  s.profileImage = profileImage || s.profileImage;
  if (Array.isArray(skills)) s.skills = skills;
  s.updatedAt = new Date();
  await s.save();
  // notify clients that settings changed
  sendSseEvent('settings.updated', { updatedAt: s.updatedAt });
  res.json({ success: true, settings: s });
  } catch (err) {
    console.error('Error saving settings', err);
    res.status(500).json({ success: false });
  }
});

// Auth: register / login / logout (minimal)
app.post('/api/auth/register', async (req, res) => {
  // Registration is disabled. Use environment variables to configure the single admin account.
  return res.status(403).json({ success: false, msg: 'Registration disabled. Configure ADMIN_USER and ADMIN_PASS in the server environment.' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, msg: 'Username and password are required' });
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ success: false, msg: 'Invalid username or password' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ success: false, msg: 'Invalid username or password' });
    req.session.userId = user._id;
    res.json({ success: true, user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error('Auth login error', err);
    res.status(500).json({ success: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.session || !req.session.userId) return res.json({ success: true, user: null });
  const user = await User.findById(req.session.userId).lean();
  if (!user) return res.json({ success: true, user: null });
  res.json({ success: true, user: { username: user.username, role: user.role } });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
