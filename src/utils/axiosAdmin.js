/**
 * Axios instance for admin API calls.
 * Automatically attaches the Bearer token and refreshes it on 401.
 */
import axios from "axios";

const axiosAdmin = axios.create({
    baseURL: "http://127.0.0.1:8000",
});

// --- Request interceptor: attach access token ---
axiosAdmin.interceptors.request.use(
    (config) => {
        const token =
            sessionStorage.getItem("access_token") ||
            localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- Response interceptor: refresh token on 401 ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

axiosAdmin.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry
        ) {
            if (isRefreshing) {
                // Queue up the request until the refresh finishes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosAdmin(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken =
                sessionStorage.getItem("refresh_token") ||
                localStorage.getItem("refresh_token");

            if (!refreshToken) {
                // No refresh token — force re-login
                processQueue(error, null);
                isRefreshing = false;
                clearAdminSession();
                window.location.href = "/admin";
                return Promise.reject(error);
            }

            try {
                const res = await axios.post(
                    "http://127.0.0.1:8000/api/token/refresh/",
                    { refresh: refreshToken }
                );
                const newAccess = res.data.access;

                // Save the new access token in whichever storage was used
                if (localStorage.getItem("access_token")) {
                    localStorage.setItem("access_token", newAccess);
                }
                if (sessionStorage.getItem("access_token")) {
                    sessionStorage.setItem("access_token", newAccess);
                }

                axiosAdmin.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                processQueue(null, newAccess);
                return axiosAdmin(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearAdminSession();
                window.location.href = "/admin";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

function clearAdminSession() {
    ["access_token", "refresh_token", "user"].forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
}

export default axiosAdmin;
