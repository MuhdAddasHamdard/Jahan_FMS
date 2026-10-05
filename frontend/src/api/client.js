const API_BASE = import.meta.env.VITE_API_URL || "/api";

let authToken = null;
let onUnauthorized = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const request = async (path, { method = "GET", body } = {}) => {
  const headers = { "Content-Type": "application/json" };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized && path !== "/users/login") {
      onUnauthorized();
    }

    const error = new Error(data?.message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};