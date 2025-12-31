import { apiClient, apiClientFormData, publicApiClient } from './apiClient';

export const adminCreateResult = async (resultData) => {
    return apiClient('/api/results/admin/create', 'POST', resultData);
};

export const adminUpdateResult = async (resultId, updateData) => {
    return apiClient(`/api/results/admin/${resultId}`, 'PUT', updateData);
};

export const adminDeleteResult = async (resultId) => {
    return apiClient(`/api/results/admin/${resultId}`, 'DELETE');
};

export const getResultsForSeason = async (seasonId) => {
    return apiClient(`/api/results/season/${seasonId}`);
};

export const getResultsForSeasonPublic = async (seasonId) => {
    return publicApiClient(`/api/results/public/season/${seasonId}`);
};

export const getHeadToHeadResults = async (teamA, teamB, excludeId = null) => {
    let url = `/api/results/public/h2h/${teamA}/${teamB}`;
    if (excludeId) {
        url += `?excludeId=${excludeId}`;
    }
    return publicApiClient(url);
};

// Team meldet ein Ergebnis zu einer Buchung
export const reportResult = async (bookingId, resultData) => {
    return apiClient(`/api/results/report/${bookingId}`, 'POST', resultData);
};

// Ausstehende Ergebnisbestätigungen für mein Team
export const getPendingResultsForMyTeam = async () => {
    return apiClient('/api/results/team/pending', 'GET');
};

// Team bestätigt oder lehnt ein gemeldetes Ergebnis ab
export const respondToResultAction = async (resultId, actingTeamId, action, reason = '') => {
    return apiClient(`/api/results/${resultId}/action`, 'POST', { actingTeamId, action, reason });
};

// Team zieht eine Ergebnismeldung zurück
export const cancelReport = async (resultId, actingTeamId) => {
    return apiClient(`/api/results/${resultId}/cancel`, 'POST', { actingTeamId });
};