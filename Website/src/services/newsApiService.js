import { apiClient, publicApiClient } from './apiClient';

/**
 * Ruft alle veröffentlichten News ab (öffentlich, ohne Authentifizierung).
 */
export const getPublishedNews = async () => {
  return publicApiClient('/api/news', 'GET');
};

/**
 * Ruft alle News ab (inkl. Entwürfe) - nur für Admins.
 */
export const getAllNewsForAdmin = async () => {
  return apiClient('/api/news/admin', 'GET');
};

/**
 * Erstellt einen neuen News-Artikel.
 */
export const createNews = async (newsData) => {
  return apiClient('/api/news', 'POST', newsData);
};

/**
 * Aktualisiert einen News-Artikel.
 */
export const updateNews = async (newsId, newsData) => {
  return apiClient(`/api/news/${newsId}`, 'PUT', newsData);
};

/**
 * Löscht einen News-Artikel.
 */
export const deleteNews = async (newsId) => {
  return apiClient(`/api/news/${newsId}`, 'DELETE');
};

