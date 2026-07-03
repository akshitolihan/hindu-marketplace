import axios from 'axios';

// Single axios instance for the whole app. Base URL comes from the env so the
// same build can point at localhost or production without code changes.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

// Attach the JWT (if any) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Free hosting (Render) sleeps after inactivity, so the first request can fail
// with 502/503/network error while it wakes (~50s). Auto-retry GET requests a
// few times so visitors see a loading state instead of an "empty" page.
const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 5000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    const status = err.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
    }

    // Retry idempotent GETs while the backend is waking up — but not on an
    // explicit request timeout (retrying a long request just stacks the wait).
    const timedOut = err.code === 'ECONNABORTED';
    const wakingUp = !timedOut && (status === 502 || status === 503 || status === 504 || !err.response);
    if (config && (config.method || 'get').toLowerCase() === 'get' && wakingUp) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        await sleep(RETRY_DELAY_MS);
        return api(config);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
