import { useEffect, useState } from "react";
import { api, getOfflineDeviceId } from "../api/client";
import { downloadOfflineLists } from "../api/offlineLists";
import { useAuth } from "../auth/auth-context";
import Alert from "./Alert";
import { FormField, inputClass } from "./FormField";
import Spinner from "./Spinner";

const modes = [
  ["ALL_DEVICES", "All signed-in devices"],
  ["TRUSTED_DEVICES", "Approved devices only"],
  ["DISABLED", "No devices"],
];

const OfflineAccessSettings = () => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [browserId] = useState(() => {
    try { return getOfflineDeviceId(); } catch { return null; }
  });

  useEffect(() => {
    let active = true;
    api.get("/settings/offline").then(({ devices, ...policy }) => {
      if (!active) return;
      setPolicy(policy);
      setDevices(devices);
    }).catch((error) => {
      if (active) setError(error.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const refreshThisBrowser = () => api.get("/users/me").then(({ user }) => downloadOfflineLists(user)).catch(() => {});
  const savePolicy = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      setPolicy(await api.patch("/settings/offline", policy));
      setNotice("Offline policy saved.");
      await refreshThisBrowser();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const changeTrust = async (device) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const trusted = !device.trusted;
      await api.patch(`/settings/offline/devices/${device.userId}/${device.deviceId}`, { trusted });
      setDevices((current) => current.map((item) =>
        item.userId === device.userId && item.deviceId === device.deviceId ? { ...item, trusted } : item,
      ));
      if (device.userId === user.id && device.deviceId === browserId) await refreshThisBrowser();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card mt-6 space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-content">Offline access</h2>
        <p className="mt-1 text-sm text-muted">Choose which devices can download institute data and how long they can use it offline. Unsynced changes stay available to upload after sign-in.</p>
      </div>
      {error && <Alert type="error" message={error} />}
      {notice && <p role="status" className="text-sm text-brand-strong">{notice}</p>}
      {loading && <Spinner />}
      {policy && (
        <>
          <form onSubmit={savePolicy} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <FormField label="Download access" htmlFor="offline-mode">
              <select id="offline-mode" className={inputClass} disabled={saving} value={policy.offlineMode}
                onChange={(event) => setPolicy({ ...policy, offlineMode: event.target.value })}>
                {modes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FormField>
            <FormField label="Offline retention (days)" htmlFor="offline-days">
              <select id="offline-days" className={inputClass} disabled={saving || policy.offlineMode === "DISABLED"} value={policy.offlineMaxDays}
                onChange={(event) => setPolicy({ ...policy, offlineMaxDays: Number(event.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </FormField>
            <button className="btn btn-primary" disabled={saving}>Save offline policy</button>
          </form>
          <div className="border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-content">Registered devices</h3>
            <p className="mt-1 text-xs text-muted">A browser registers when its user signs in online. Device approvals apply in Approved devices only mode.</p>
            {devices.length === 0 && <p className="mt-2 text-sm text-muted">No devices registered yet.</p>}
            <ul className="mt-2 divide-y divide-line">
              {devices.map((device) => (
                <li key={`${device.userId}:${device.deviceId}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <p className="font-medium text-content">{device.label} · {device.deviceId.slice(-8)}{device.userId === user.id && device.deviceId === browserId ? " · This browser" : ""}</p>
                    <p className="text-xs text-muted">{device.user.name} · {device.user.email} · {device.user.deactivatedAt ? "Account deactivated" : device.trusted ? "Approved" : "Unapproved"}</p>
                  </div>
                  {!device.user.deactivatedAt && (
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void changeTrust(device)}>
                      {device.trusted ? "Revoke approval" : "Approve device"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
};

export default OfflineAccessSettings;
