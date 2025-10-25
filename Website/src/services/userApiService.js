import { apiClient } from './apiClient';

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