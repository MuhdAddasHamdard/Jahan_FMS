import {
  addChange, clearSnapshots, deleteChange, deleteSnapshot, listChanges,
  readSnapshot, updateChange, writeSnapshot,
} from "./offlineStore";
import { canQueueChange, keepEntryDate, requiresRevision, revisionPaths } from "./offlineRoutes";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const DEVICE_KEY = "jahan_fms_sync_device";
const MAX_OFFLINE_SESSION_AGE = 7 * 24 * 60 * 60 * 1000;

let session = null;
let onUnauthorized = null;
let snapshot = { offline: !navigator.onLine, syncing: false, changes: [], uploaded: 0 };
const listeners = new Set();
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("jahan-fms-sync") : null;
let localLock = Promise.resolve();

const publish = (change) => {
  snapshot = { ...snapshot, ...change };
  listeners.forEach((listener) => listener());
};

export const subscribeSync = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getSyncStatus = () => snapshot;

const refreshStatus = async (current = session) => {
  if (!current) return;
  const changes = await listChanges(current.owner).catch(() => []);
  if (session === current) publish({ changes });
};

channel?.addEventListener("message", () => void refreshStatus());

const updateStatus = async (current) => {
  await refreshStatus(current);
  channel?.postMessage("update");
};

const deviceId = () => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
};

export const setAuthToken = (token) => {
  if (session?.token === token) return;
  let owner;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (Number.isInteger(payload.id)) owner = JSON.stringify([API_BASE, payload.id]);
    } catch {
      // Only a recognizable account can use offline storage.
    }
  }
  session = token ? { token, owner, verified: false } : null;
  publish({ changes: [], syncing: false, uploaded: 0 });
};

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

export const clearOfflineSession = () => {
  const owner = session?.owner;
  setAuthToken(null);
  if (owner) void clearSnapshots(owner).catch(() => {});
};

export class OfflineError extends Error {}

const networkRequest = async (path, { method = "GET", body, current, change, revision } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (current) headers.Authorization = `Bearer ${current.token}`;
  if (change) {
    headers["X-Sync-Operation"] = change.id;
    headers["X-Sync-Device"] = change.deviceId;
    if (revision !== undefined) headers["X-Sync-Revision"] = revision;
  }

  let response;
  let data;
  try {
    if (!navigator.onLine) throw new OfflineError();
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(method === "GET" ? 8000 : 20000),
    });
    if ([502, 503, 504].includes(response.status)) throw new OfflineError();
    if (response.status !== 204 && response.headers.get("Content-Type")?.includes("application/json")) {
      data = await response.json();
    } else if (response.ok && response.status !== 204) {
      throw new OfflineError();
    }
  } catch {
    if (session === current || !current) publish({ offline: true });
    throw new OfflineError("The server is unavailable. Check your connection and try again.");
  }

  if (session === current || !current) publish({ offline: false });
  if (!response.ok) {
    const error = new Error(data?.message || "The request could not be completed. Please try again.");
    error.status = response.status;
    if (response.status === 401 && path !== "/users/login" && current && current === session) onUnauthorized?.();
    throw error;
  }

  return { data: data ?? null, revision: response.headers.get("X-Sync-Revision") };
};

const read = async (path) => {
  const current = session;
  const owner = current?.owner;
  const cacheable = owner && !path.startsWith("/students/admission-number-availability");
  try {
    const { data, revision } = await networkRequest(path, { current });
    if (session === current && cacheable) {
      if (path === "/users/me") {
        const old = await readSnapshot(owner, path).catch(() => null);
        const access = ({ role, permissions }) => JSON.stringify([role, [...(permissions ?? [])].sort()]);
        if (old?.data?.user && access(data.user) !== access(old.data.user)) {
          await clearSnapshots(owner).catch(() => {});
        }
      }
      if (session === current) {
        await writeSnapshot({ owner, path, data, revision, checkedAt: Date.now() }).catch(() => {});
      }
    }
    if (session === current && current && path === "/users/me") {
      current.verified = true;
      void retrySync();
    }
    return data;
  } catch (error) {
    if (cacheable && [403, 404].includes(error.status)) {
      await deleteSnapshot(owner, path).catch(() => {});
    }
    if (!(error instanceof OfflineError) || !cacheable || session !== current) throw error;
    const cached = await readSnapshot(owner, path).catch(() => null);
    if (cached && (path !== "/users/me" || Date.now() - cached.checkedAt <= MAX_OFFLINE_SESSION_AGE)) {
      if (path === "/users/me") void refreshStatus(current);
      return cached.data;
    }
    throw new OfflineError(path === "/users/me"
      ? "Connect to the internet to verify your session on this device."
      : "This information hasn’t been downloaded on this device yet.");
  }
};

const lock = (owner, run) => {
  if (navigator.locks) return navigator.locks.request(`jahan-fms-sync:${owner}`, run);
  const result = localLock.then(run);
  localLock = result.catch(() => {});
  return result;
};

const drain = (current, immediate) => lock(current.owner, async () => {
  if (session !== current || !navigator.onLine) return;
  // A cached session must reauthenticate before sending any queued writes.
  if (!current.verified) await read("/users/me").catch(() => null);
  if (session !== current || !current.verified) return;

  const pending = (await listChanges(current.owner)).filter((change) => !change.error);
  if (!pending.length) return;
  publish({ syncing: true });
  let result;
  let uploaded = 0;
  try {
    for (const change of pending) {
      if (session !== current) break;
      const submitting = immediate === change.sequence;
      try {
        const { data } = await networkRequest(change.path, {
          method: change.method,
          body: change.body,
          current,
          change,
          revision: submitting && !change.deferred ? undefined : change.revision,
        });
        await deleteChange(change.sequence);
        if (submitting) result = { data };
        else uploaded += 1;
      } catch (error) {
        if (error instanceof OfflineError || error.status === 401 || error.status === 429 || error.status >= 500 || !error.status) break;
        if (submitting) {
          await deleteChange(change.sequence);
          result = { error };
        } else {
          await updateChange({ ...change, error: error.message });
        }
      }
    }
  } finally {
    if (session === current) publish({ syncing: false, uploaded: snapshot.uploaded + uploaded });
    await updateStatus(current);
  }
  return result;
});

export const retrySync = async () => {
  const current = session;
  if (!current?.owner) return;
  try {
    await drain(current);
  } catch {
    // The next connectivity check can retry; saved changes remain in storage.
  }
};

export const discardFailedChange = async (sequence) => {
  const current = session;
  if (!current?.owner) return;
  return lock(current.owner, async () => {
    const changes = await listChanges(current.owner);
    if (changes.some((change) => change.sequence === sequence && change.error)) {
      await deleteChange(sequence);
      await updateStatus(current);
    }
  });
};

export const acknowledgeSync = () => publish({ uploaded: 0 });

const findRevision = async (owner, method, path, sourcePath) => {
  if (!requiresRevision(method, path)) return;
  for (const candidate of sourcePath ? [sourcePath] : revisionPaths(path)) {
    const cached = await readSnapshot(owner, candidate).catch(() => null);
    if (cached?.revision != null) return cached.revision;
  }
};

const mutate = async (method, path, body, { sourcePath } = {}) => {
  const current = session;
  if (!current?.owner || !canQueueChange(method, path)) {
    const { data } = await networkRequest(path, { method, body, current });
    return data;
  }

  const revision = await findRevision(current.owner, method, path, sourcePath);
  const deferred = !navigator.onLine || snapshot.offline;
  if (deferred && requiresRevision(method, path) && revision === undefined) {
    throw new OfflineError("Open the latest records online before saving this change offline.");
  }

  let sequence;
  try {
    sequence = await addChange({
      owner: current.owner, id: crypto.randomUUID(), deviceId: deviceId(),
      method, path, body: keepEntryDate(method, path, body), deferred, revision, createdAt: Date.now(),
    });
  } catch {
    if (!navigator.onLine || snapshot.offline) {
      throw new Error("This device couldn’t save the change. Free up browser storage and try again.");
    }
    const { data } = await networkRequest(path, { method, body, current });
    return data;
  }

  await updateStatus(current);
  const result = await drain(current, sequence).catch(() => undefined);
  if (result?.error) throw result.error;
  return result ? result.data : { queued: true };
};

window.addEventListener("offline", () => publish({ offline: true }));
window.addEventListener("online", () => {
  if (session?.owner) {
    void read("/users/me").catch(() => {});
    void retrySync();
  } else {
    publish({ offline: false });
  }
});
window.setInterval(() => {
  if (session?.owner && navigator.onLine && (snapshot.changes.some((change) => !change.error) || snapshot.offline)) {
    if (snapshot.offline) void read("/users/me").catch(() => {});
    void retrySync();
  }
}, 15000);

export const api = {
  get: read,
  post: (path, body, options) => mutate("POST", path, body, options),
  patch: (path, body) => mutate("PATCH", path, body),
  delete: (path) => mutate("DELETE", path),
};
