import { auth } from '../firebase';

const API_BASE_URL = 'http://localhost:3001'; // Deine Backend-URL

/**
 * Ein zentraler Client für alle API-Anfragen an unser Backend.
 * Er kümmert sich automatisch um die Authentifizierung.
 * @param {string} endpoint - Der API-Endpunkt (z.B. '/api/seasons').
 * @param {string} method - Die HTTP-Methode ('GET', 'POST', 'PUT', etc.).
 * @param {object} [body] - Das Datenobjekt für POST/PUT-Anfragen.
 * @returns {Promise<any>} - Die JSON-Antwort vom Server.
 */
export const apiClient = async (endpoint, method = 'GET', body = null) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Nicht authentifiziert. Bitte neu einloggen.');
    }

    const token = await user.getIdToken();

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        // Versuche, eine Fehlermeldung vom Backend zu parsen
        const errorData = await response.json().catch(() => ({ message: 'Unbekannter Serverfehler' }));
        throw new Error(errorData.message || `Fehler: ${response.statusText}`);
    }

    // Wenn die Antwort leer ist (z.B. bei 204 No Content), gib ein Erfolgs-Objekt zurück
    if (response.status === 204) {
        return { success: true };
    }

    return response.json();
};