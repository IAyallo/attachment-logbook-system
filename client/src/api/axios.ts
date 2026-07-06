import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

const SESSION_END_MESSAGE_KEY = 'sessionEndedMessage';

const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const handleUnauthorizedAccess = (message: string) => {
  clearAuthSession();
  localStorage.setItem(SESSION_END_MESSAGE_KEY, message);

  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

const shouldIgnoreAuthInterceptor = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/forgot-password-request')
  );
};

const attachAuthResponseInterceptor = (instance: typeof api) => {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url as string | undefined;
      const serverMessage =
        error?.response?.data?.message ||
        'Your session was ended due to unauthorized access attempt.';

      if (!shouldIgnoreAuthInterceptor(url)) {
        if (status === 403) {
          handleUnauthorizedAccess(serverMessage);
        }

        if (
          status === 401 &&
          (serverMessage.includes('Invalid or expired token') ||
            serverMessage.includes('Access denied'))
        ) {
          handleUnauthorizedAccess(serverMessage);
        }
      }

      return Promise.reject(error);
    },
  );
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

attachAuthResponseInterceptor(api);

export default api;

export const uploadApi = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'multipart/form-data' },
});

uploadApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

attachAuthResponseInterceptor(uploadApi);