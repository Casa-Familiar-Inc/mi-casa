import axios from 'axios';

// Create a centralized Axios instance
const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    if (!url.endsWith('/api')) {
        url = `${url}/api`;
    }
    return url;
};

// Create a centralized Axios instance
export const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true, // Automates sending cookies (session)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Global Error Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Here we can handle global errors like 401 Unauthorized (redirect to login)
        // or 500 Server Error (show generic toast).
        // For now, we just reject so calling services can handle specific errors.
        if (error.response && error.response.status === 401) {
            console.warn('[API] Unauthorized access detected');
            // Optionally dispatch a global logout event or redirect if not handled
        }
        return Promise.reject(error);
    }
);
