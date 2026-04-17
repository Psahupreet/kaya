import axios from 'axios';

const defaultApiBase =
  import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://kaya-lyb0.onrender.com/api';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || defaultApiBase
});

export const setToken = (token) => {
  if (token) API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete API.defaults.headers.common['Authorization'];
};

export default API;
