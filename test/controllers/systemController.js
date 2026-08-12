const { getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');

const db = getFirestore();
const SETTINGS_COLLECTION = 'system_settings';
const EMAIL_CONFIG_DOC = 'email_config';

// Helper to get transporter
// Duplicate logic kept here for now to allow specific "testing" with unsaved config in the request body.
// Ideally, we would refactor this to use the service fully, but testEmailConfig needs to test *proposed* config.
const createTransporter = (config) => {
    return nodemailer.createTransport({
        host: (config.smtpHost || '').trim(),
        port: parseInt(config.smtpPort),
        secure: config.smtpSecure,
        auth: {
            user: (config.smtpUser || '').trim(),
            pass: config.smtpPassword,
        },
    });
};

exports.getEmailConfig = async (req, res) => {
    try {
        const doc = await db.collection(SETTINGS_COLLECTION).doc(EMAIL_CONFIG_DOC).get();
        if (!doc.exists) {
            // Return default/empty config structure
            return res.status(200).json({
                smtpHost: '',
                smtpPort: 587,
                smtpUser: '',
                smtpSecure: false,
                // Do not return password obviously, or return placeholder? 
                // Typically we send back empty password or mask it. 
                // For simplicity in this admin panel, we might send it back if the connection is HTTPS, 
                // but best practice is to not send it. 
                // However, if the user wants to "edit" it, they need to know if it's set.
                // Let's send an "isSet" flag or similar if we want to be secure, 
                // but for this level of app, sending it securely over HTTPS (if configured) is often what happens.
                // Given the requirement "hinterlegen, überprüfen", I'll send it back for now so they can see what they typed.
                // If security is a major concern, we can mask it.
                smtpPassword: ''
            });
        }
        const data = doc.data();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching email config:', error);
        res.status(500).json({ error: 'Failed to fetch email config' });
    }
};

exports.saveEmailConfig = async (req, res) => {
    try {
        const config = req.body;
        // Basic validation
        if (!config.smtpHost || !config.smtpPort || !config.smtpUser) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await db.collection(SETTINGS_COLLECTION).doc(EMAIL_CONFIG_DOC).set(config);
        res.status(200).json({ message: 'Email configuration saved successfully' });
    } catch (error) {
        console.error('Error saving email config:', error);
        res.status(500).json({ error: 'Failed to save email config' });
    }
};

exports.testEmailConfig = async (req, res) => {
    try {
        const { config, recipient } = req.body;

        console.log('[Email Test] Starting email test...');
        console.log('[Email Test] Recipient:', recipient);

        // If config is provided in body, use it (testing before saving)
        // If not, fetch from DB
        let emailConfig = config;
        let source = 'provided in request';
        if (!emailConfig) {
            const doc = await db.collection(SETTINGS_COLLECTION).doc(EMAIL_CONFIG_DOC).get();
            if (doc.exists) {
                emailConfig = doc.data();
                source = 'database';
            }
        }

        console.log(`[Email Test] Using config from: ${source}`);
        if (emailConfig) {
            console.log('[Email Test] Config details:', {
                host: emailConfig.smtpHost,
                port: emailConfig.smtpPort,
                user: emailConfig.smtpUser,
                secure: emailConfig.smtpSecure,
                senderName: emailConfig.senderName
            });
        }

        if (!emailConfig || !emailConfig.smtpHost) {
            console.error('[Email Test] Error: No configuration provided or found');
            return res.status(400).json({ error: 'No configuration provided or found' });
        }

        if (!recipient) {
            console.error('[Email Test] Error: Recipient email is required');
            return res.status(400).json({ error: 'Recipient email is required' });
        }

        const transporter = createTransporter(emailConfig);

        // Verify connection configuration
        console.log('[Email Test] Verifying SMTP connection...');
        await transporter.verify();
        console.log('[Email Test] SMTP connection verified successfully.');

        // Send test email
        console.log('[Email Test] Sending email...');
        const info = await transporter.sendMail({
            from: `"${emailConfig.senderName || 'Bunte Liga Admin'}" <${emailConfig.smtpUser}>`,
            to: recipient,
            replyTo: emailConfig.smtpUser, // Good practice
            subject: 'Verifizierung Ihrer SMTP Einstellungen - Bunte Liga Freiburg', // Less generic subject
            text: `Hallo,\n\ndies ist eine Test-Nachricht vom Bunte Liga Freiburg Admin Dashboard.\n\nWenn Sie diese Nachricht lesen, funktionierten Ihre SMTP-Einstellungen erfolgreich.\n\nMit freundlichen Grüßen,\nIhr Bunte Liga Team`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #00A99D;">SMTP Konfiguration erfolgreich!</h2>
                    <p>Hallo,</p>
                    <p>dies ist eine Test-Nachricht vom <strong>Bunte Liga Freiburg Admin Dashboard</strong>.</p>
                    <p>Ihre Email-Einstellungen wurden erfolgreich verifiziert und gespeichert.</p>
                    <br>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #888;">Dies ist eine automatisch generierte Nachricht. Bitte antworten Sie nicht direkt darauf.</p>
                </div>
            `,
        });

        console.log('[Email Test] Email sent successfully. Message ID:', info.messageId);
        console.log('[Email Test] Server response:', info.response);

        res.status(200).json({ message: 'Test email sent successfully', details: info });
    } catch (error) {
        console.error('[Email Test] Failed:', error);
        res.status(500).json({ error: 'Failed to send test email: ' + error.message, details: error });
    }
};
