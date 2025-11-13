import { auth } from '../firebase';

// KORREKTUR: Wir exportieren die URL, damit sie in der ganzen App verfügbar ist.
export const API_BASE_URL = 'http://localhost:3001'; // Deine Backend-URL

/**
 * Ein zentraler Client für alle JSON-API-Anfragen.
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
        const errorData = await response.json().catch(() => ({ message: 'Unbekannter Serverfehler' }));
        throw new Error(errorData.message || `Fehler: ${response.statusText}`);
    }

    if (response.status === 204) {
        return { success: true };
    }

    return response.json();
};

/**
 * NEU: Ein öffentlicher API-Client für Anfragen ohne Authentifizierung.
 * Wird für öffentlich zugängliche Endpunkte verwendet.
 */
export const publicApiClient = async (endpoint, method = 'GET', body = null) => {
    const headers = {
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
        const errorData = await response.json().catch(() => ({ message: 'Unbekannter Serverfehler' }));
        throw new Error(errorData.message || `Fehler: ${response.statusText}`);
    }

    if (response.status === 204) {
        return { success: true };
    }

    return response.json();
};

/**
 * NEU: Ein spezialisierter Client für API-Anfragen mit FormData (z.B. Datei-Uploads).
 */
export const apiClientFormData = async (endpoint, method = 'POST', formData) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Nicht authentifiziert. Bitte neu einloggen.');
    }

    const token = await user.getIdToken();

    // WICHTIG: 'Content-Type' wird hier absichtlich NICHT gesetzt.
    // Der Browser fügt es automatisch mit der korrekten "boundary" hinzu.
    const headers = {
        'Authorization': `Bearer ${token}`,
    };

    const config = {
        method,
        headers,
        body: formData, // FormData wird direkt als Body übergeben
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unbekannter Serverfehler' }));
        throw new Error(errorData.message || `Fehler: ${response.statusText}`);
    }

    return response.json();
};