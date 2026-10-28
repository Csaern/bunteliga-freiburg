try {
    require('dotenv').config();
} catch (_) {
    // Falls dotenv in der Laufzeitumgebung bereits über Plesk/Systemvariablen bereitgestellt wird
}

const config = {
    // Basic Server Settings
    port: process.env.PORT || 3001,

    // Website / Frontend URL (used for CORS and Email Links)
    websiteUrl: process.env.WEBSITE_URL || 'http://localhost:3000',

    // Backend API URL (used for context in emails if needed)
    apiUrl: process.env.API_URL || 'http://localhost:3001',

    // Auth / Security
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

    // Öffentliche Team-API (/api/public & /api/v1) für externe Vereins-Websites und Apps
    publicApi: {
        cacheSeconds: Number(process.env.PUBLIC_API_CACHE_SECONDS ?? 60),
        rateLimitPerMinute: Number(process.env.PUBLIC_API_RATE_LIMIT ?? 120),
    },

    // Firebase service account is usually handled via firebase.json in this project
    // but could be added here if needed.
};

module.exports = config;
