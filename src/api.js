// src/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 5000, // optional timeout setting
});

export default api;
