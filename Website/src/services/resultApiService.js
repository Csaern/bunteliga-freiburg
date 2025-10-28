import { apiClient, apiClientFormData } from './apiClient';

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