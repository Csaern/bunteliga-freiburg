require('dotenv').config();

const config = {
    // Basic Server Settings
    port: process.env.PORT || 3001,

    // Website / Frontend URL (used for CORS and Email Links)
    websiteUrl: process.env.WEBSITE_URL || 'http://localhost:3000',

    // Backend API URL (used for context in emails if needed)
    apiUrl: process.env.API_URL || 'http://localhost:3001',

    // Auth / Security
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

    // Firebase service account is usually handled via firebase.json in this project
    // but could be added here if needed.
};

module.exports = config;
