import { apiClient, publicApiClient } from './apiClient';

export const getSettings = async (key) => {
    return await publicApiClient(`/api/website/settings/${key}`);
};

export const updateSettings = async (key, data) => {
    return await apiClient(`/api/website/settings/${key}`, 'PUT', data);
};
