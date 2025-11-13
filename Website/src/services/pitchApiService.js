import { apiClient, apiClientFormData } from './apiClient';
import { publicApiClient } from './apiClient';

/**
 * Holt alle Plätze (Admin-Route).
 */
export const getAllPitches = () => {
    return apiClient('/api/pitches/all-admin', 'GET');
};

/**
 * NEU: Holt alle verifizierten Plätze (öffentlich, ohne Authentifizierung).
 */
export const getPublicPitches = () => {
    return publicApiClient('/api/pitches/public', 'GET');
};

/**
 * Erstellt einen neuen Platz.
 * @param {object} pitchData - Die Daten des neuen Platzes.
 */
export const createPitch = (pitchData) => {
    return apiClient('/api/pitches', 'POST', pitchData);
};

/**
 * Aktualisiert einen bestehenden Platz.
 * @param {string} pitchId - Die ID des Platzes.
 * @param {object} updateData - Die zu aktualisierenden Daten.
 */
export const updatePitch = (pitchId, updateData) => {
    return apiClient(`/api/pitches/${pitchId}`, 'PUT', updateData);
};

/**
 * Archiviert einen Platz.
 * @param {string} pitchId - Die ID des zu archivierenden Platzes.
 */
export const archivePitch = (pitchId) => {
    // KORREKTUR: Verwendet jetzt die korrekte Methode (PUT) und den korrekten Endpunkt.
    return apiClient(`/api/pitches/${pitchId}/archive`, 'PUT');
};

/**
 * Lädt ein Bild für einen bestimmten Platz hoch.
 * @param {string} pitchId - Die ID des Platzes.
 * @param {FormData} formData - Das FormData-Objekt, das die Bilddatei enthält.
 * @returns {Promise<object>} Das aktualisierte Platz-Objekt.
 */
export const uploadPitchImage = (pitchId, formData) => {
    return apiClientFormData(`/api/pitches/${pitchId}/image`, 'POST', formData);
};

/**
 * Löscht das Bild eines bestimmten Platzes.
 * @param {string} pitchId - Die ID des Platzes.
 * @returns {Promise<object>} Das aktualisierte Platz-Objekt.
 */
export const deletePitchImage = (pitchId) => {
    return apiClient(`/api/pitches/${pitchId}/image`, 'DELETE');
};