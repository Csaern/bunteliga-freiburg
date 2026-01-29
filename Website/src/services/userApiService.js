import { apiClient, publicApiClient } from './apiClient';

export const getAllUsers = async () => {
    return apiClient('/api/users', 'GET');
};

export const createUser = async (userData) => {
    return apiClient('/api/users', 'POST', userData);
};

export const updateUser = async (uid, updates) => {
    return apiClient(`/api/users/${uid}`, 'PUT', updates);
};

export const deleteUser = async (uid) => {
    return apiClient(`/api/users/${uid}`, 'DELETE');
};

export const requestPasswordReset = async (email) => {
    return publicApiClient('/api/users/reset-password-request', 'POST', { email });
};

export const changePassword = async (oldPassword, newPassword) => {
    return apiClient('/api/users/change-password', 'POST', { oldPassword, newPassword });
};

export const updateSettings = async (settings) => {
    return apiClient('/api/users/settings', 'PUT', settings);
};

