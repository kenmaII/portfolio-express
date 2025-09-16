require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Contact = require("./models/contact");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Basic diagnostics for MONGO_URI (no credentials)
const parseMongoUri = (uri) => {
  try {
    const match = uri.match(/^mongodb\+srv:\/\/[^@]+@([^/]+)\/(.*?)\?/);
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

// MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Extra Mongo connection event logs
const mongoConn = mongoose.connection;
mongoConn.on("connected", () => console.log("ℹ️ Mongo event: connected"));
mongoConn.on("disconnected", () => console.log("ℹ️ Mongo event: disconnected"));
mongoConn.on("error", (e) => console.error("ℹ️ Mongo event: error", e));

// Contact model is loaded from ./models/contact

// Nodemailer setup (Gmail SMTP)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter once at boot to surface auth/network issues early
let mailTransporterReady = false;
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mail transporter error:", error);
  } else {
    console.log("✅ Mail transporter ready");
    mailTransporterReady = true;
  }
});

// Routes
app.post("/contact", async (req, res) => {
  try {
    // Return early if DB is not connected to avoid buffering timeouts
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        msg: "Database not connected. Please try again shortly.",
      });
    }

    const { name, email, subject, message } = req.body;

    // 1. Simpan ke database
    const newContact = new Contact({ name, email, subject, message });
    await newContact.save();

    // 2. Kirim email (jika gagal, tetap balas sukses agar UX tidak terblokir)
    try {
      await transporter.sendMail({
        from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `New Contact Form Submission: ${subject}`,
        text: `
You got a new message from your portfolio:

Name: ${name}
Email: ${email}
Subject: ${subject}
Message: ${message}
        `,
      });
      return res.json({ success: true, msg: "Message saved & sent to email!" });
    } catch (mailErr) {
      console.error("❌ Error sending email:", mailErr);
      return res.json({ success: true, msg: "Message saved. Email delivery failed, check logs." });
    }
  } catch (err) {
    console.error("❌ Error handling contact:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Healthcheck endpoint for quick diagnostics
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
    mail: mailTransporterReady ? "ready" : "not_ready",
    mongo: { host: mongoDiag.host, db: mongoDiag.db || "<none>" },
    readyState: mongoose.connection.readyState,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
