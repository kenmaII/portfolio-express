require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String,
  date: { type: Date, default: Date.now },
});
const Contact = mongoose.model("Contact", contactSchema);

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
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mail transporter error:", error);
  } else {
    console.log("✅ Mail transporter ready");
  }
});

// Routes
app.post("/contact", async (req, res) => {
  try {
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

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
