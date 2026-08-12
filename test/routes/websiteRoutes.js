const express = require('express');
const router = express.Router();
const WebsiteService = require('../services/websiteService');
const emailService = require('../services/emailService'); // Import emailService
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

// Get specific settings (e.g., 'rules') - Public
router.get('/settings/:key', async (req, res) => {
    try {
        const settings = await WebsiteService.getSettings(req.params.key);
        if (!settings) {
            // Return null instead of 404 to allow frontend to handle "not set" state gracefully
            return res.json(null);
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update specific settings - Admin only
router.put('/settings/:key', checkAuth, checkAdmin, async (req, res) => {
    try {
        const settings = await WebsiteService.updateSettings(req.params.key, req.body);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send Contact Form Email - Public
router.post('/contact', async (req, res) => {
    try {
        const { recipient, name, email, subject, message } = req.body;

        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Bitte füllen Sie alle Pflichtfelder aus.' });
        }

        // 1. Get Config to find target email
        const config = await emailService.getEmailConfig();
        if (!config || !config.contactEmail) {
            console.error('Contact Form Error: contactEmail not configured.');
            return res.status(503).json({ error: 'Kontaktformular ist derzeit nicht konfiguriert.' });
        }

        // 2. Prepare Email Content
        const mailSubject = `[Kontaktformular] ${subject || 'Neue Nachricht'} von ${name}`;
        const mailText = `Neue Nachricht über das Kontaktformular:\n\nName: ${name}\nEmail: ${email}\nBetreff: ${subject}\n\nNachricht:\n${message}`;
        const mailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #00A99D;">Neue Kontaktanfrage</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Bereich:</strong> ${recipient || 'Allgemein'}</p>
                <p><strong>Betreff:</strong> ${subject}</p>
                <hr>
                <p style="white-space: pre-wrap;">${message}</p>
            </div>
        `;

        // 3. Send Email
        await emailService.sendEmail({
            to: config.contactEmail,
            subject: mailSubject,
            text: mailText,
            html: mailHtml,
            replyTo: email
        });

        res.status(200).json({ message: 'Nachricht erfolgreich gesendet.' });
    } catch (error) {
        console.error('Error sending contact email:', error);
        res.status(500).json({ error: 'Fehler beim Senden der Nachricht.' });
    }
});

module.exports = router;
