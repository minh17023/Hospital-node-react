import axios from "axios";

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const t = localStorage.getItem("PATIENT_TOKEN") || sessionStorage.getItem("PATIENT_TOKEN");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default client;
