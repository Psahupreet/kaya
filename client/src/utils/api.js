import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'https://kaya-lyb0.onrender.com/api'
});

export const setToken = (token) => {
  if (token) API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete API.defaults.headers.common['Authorization'];
};

export default API;