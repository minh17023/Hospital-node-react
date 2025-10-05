import axios from "axios";

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
});

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("ACCESS_TOKEN");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("ACCESS_TOKEN");
      localStorage.removeItem("ME");
      if (!/\/login/i.test(window.location.pathname)) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default client;
