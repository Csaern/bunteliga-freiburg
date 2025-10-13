const express = require('express');
const router = express.Router();
const newsService = require('../services/newsService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

// GET /api/news - Alle veröffentlichten News abrufen (ÖFFENTLICH)
router.get('/', async (req, res) => {
    try {
        const news = await newsService.getPublishedNews();
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/news/admin - Alle News (inkl. Entwürfe) abrufen (NUR ADMINS)
router.get('/admin', checkAuth, checkAdmin, async (req, res) => {
    try {
        const news = await newsService.getAllNewsForAdmin();
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/news - Neuen Artikel erstellen (NUR ADMINS)
router.post('/', checkAuth, checkAdmin, async (req, res) => {
    try {
        const newsData = {
            ...req.body,
            authorId: req.user.uid,
            authorName: req.user.displayName || req.user.email,
        };
        const newArticle = await newsService.createNews(newsData);
        res.status(201).json(newArticle);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT /api/news/:id - Artikel aktualisieren (NUR ADMINS)
router.put('/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await newsService.updateNews(id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.message === 'News-Artikel nicht gefunden.' ? 404 : 400).json({ message: error.message });
    }
});

// DELETE /api/news/:id - Artikel löschen (NUR ADMINS)
router.delete('/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await newsService.deleteNews(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;