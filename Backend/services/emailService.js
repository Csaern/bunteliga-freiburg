const { getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');

const db = getFirestore();
const SETTINGS_COLLECTION = 'system_settings';
const EMAIL_CONFIG_DOC = 'email_config';

// Helper to get transporter
const createTransporter = (config) => {
    return nodemailer.createTransport({
        host: (config.smtpHost || '').trim(),
        port: parseInt(config.smtpPort),
        secure: config.smtpSecure, // true for 465, false for other ports
        auth: {
            user: (config.smtpUser || '').trim(),
            pass: config.smtpPassword,
        },
    });
};

/**
 * Fetches the current email configuration from Firestore.
 */
const getEmailConfig = async () => {
    const doc = await db.collection(SETTINGS_COLLECTION).doc(EMAIL_CONFIG_DOC).get();
    if (!doc.exists) return null;
    return doc.data();
};

/**
 * Sends an email using the stored system configuration.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 */
const sendEmail = async ({ to, subject, text, html, replyTo }) => {
    const config = await getEmailConfig();

    if (!config || !config.smtpHost) {
        throw new Error('Email configuration is missing or incomplete.');
    }

    const transporter = createTransporter(config);

    // Verify connection before sending (optional, but good for stability)
    // await transporter.verify(); 

    console.log(`[EmailService] Versuch, Email zu senden an: ${to} | Betreff: "${subject}"`);

    try {
        const info = await transporter.sendMail({
            from: `"${config.senderName || 'Bunte Liga Admin'}" <${config.smtpUser}>`,
            to: to,
            replyTo: replyTo || config.smtpUser,
            subject: subject,
            text: text,
            html: html,
        });

        console.log(`[EmailService] ✅ Email erfolgreich gesendet an: ${to} | ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[EmailService] ❌ Fehler beim Senden an ${to}:`, error);
        throw error;
    }
};

module.exports = {
    sendEmail,
    getEmailConfig
};
