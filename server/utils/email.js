const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter !== null) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  transporter = SMTP_HOST
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
    : false;
  return transporter;
}

async function sendEmail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[email] To: ${to}\n[email] Subject: ${subject}\n[email] ${text.replace(/\n/g, '\n[email] ')}\n`);
    return { logged: true };
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || 'PawShare <no-reply@pawshare.local>', to, subject, text });
    return { sent: true };
  } catch (err) {
    console.error(`[email] Failed to send to ${to}: ${err.message}`);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail };
