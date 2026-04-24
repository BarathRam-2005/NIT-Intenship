import axios from 'axios';

/**
 * Reusable Axios Client
 * Designed to automatically pass the access token along with all requests,
 * and intercept incoming 403 authorization errors to silently refresh the token.
 */
const client = axios.create({
  baseURL: 'http://localhost:5000/api', 
});

// Phase 1: Outbound Request Interceptor (attaches JWT)
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Phase 2: Inbound Response Interceptor (handles JWT expiration gracefully)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Status 403 strictly means our Access Token is expired or completely invalid
    if (error.response && error.response.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token exists in cache');

        // Note: Do NOT use `client` here to avoid infinite interceptor loops
        const requestPayload = { refreshToken };
        const res = await axios.post('http://localhost:5000/api/auth/refresh', requestPayload);
        
        // Grab natively generated token from Backend Auth Controller and persist them!
        const newAccessToken = res.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        
        // Retry the exact identical request! The user won't even notice their token had expired.
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axios(originalRequest);
        
      } catch (refreshError) {
        // If the Refresh token itself is expired, hard-logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userContext');
        window.location.href = '/login'; // Redirect to React Login page explicitly
        return Promise.reject(refreshError);
      }
    }
    
    // Simply bubble up other types of errors (e.g. 404, 400 Validation)
    return Promise.reject(error);
  }
);

export default client;
