import app from "../src/app";
import prisma from "../src/prisma";

export const startServer = async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
};

export const postJson = async (baseUrl, path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
};

export const getJson = async (baseUrl, path, token) => {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
};

export const between = (min, max) => Math.floor(Math.random() * (max - min)) + min;

export const patchJson = async (baseUrl, path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
};

export const uniqueEmail = (prefix) =>
  `${prefix}.${Date.now()}.${between(1000, 9999)}@example.com`;

// Institute data is shared between ADMIN and FINANCE, so every test file must
// leave no @example.com users behind or the next run inherits their records.
export const cleanupTestUsers = async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@example.com" } } });
};