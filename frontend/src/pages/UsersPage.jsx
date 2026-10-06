import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { FormField, inputClass, errorInputClass } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { formatDate } from "../utils/format";
import { passwordLengthError } from "../utils/password";

const ROLES = ["ADMIN", "FINANCE", "TEACHER", "STUDENT"];

const ROLE_BADGE = {
  ADMIN: "bg-violet-50 text-violet-700",
  FINANCE: "bg-teal-50 text-teal-700",
  TEACHER: "bg-sky-50 text-sky-700",
  STUDENT: "bg-amber-50 text-amber-700",
};

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState({ name: "", email: "", password: "" });
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const syncRoles = (data) =>
    setSelectedRoles(Object.fromEntries(data.map((user) => [user.id, user.role])));

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/users");
      setUsers(data);
      syncRoles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    api
      .get("/users")
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
          syncRoles(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRoleChange = async (userId, role) => {
    setSavingId(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role });
      setSelectedRoles((prev) => ({ ...prev, [userId]: role }));
      toast.success("Role updated");
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const openEdit = (targetUser) => {
    setEditing(targetUser);
    setEditValue({ name: targetUser.name, email: targetUser.email, password: "" });
  };

  const passwordError = editValue.password
    ? passwordLengthError(editValue.password)
    : "";

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editValue.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (editValue.password && editValue.password.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: editValue.name.trim(),
        email: editValue.email.trim(),
      };
      if (editValue.password) {
        payload.password = editValue.password;
      }

      const updated = await api.patch(`/users/${editing.id}`, payload);
      setUsers((current) =>
        current.map((user) => (user.id === updated.id ? { ...user, ...updated } : user)),
      );
      setEditing(null);
      toast.success("User updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.delete(`/users/${deleting.id}`);
      toast.success("User deleted");
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="User management"
        description="Manage system users, their details and roles. Administrator only."
      />

      {error && <div className="mb-4"><Alert type="error" message={error} /></div>}

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="hidden px-5 py-3 md:table-cell">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-900">
                        {user.name}
                        {isSelf && (
                          <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ROLE_BADGE[user.role] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 text-sm text-slate-500 md:table-cell">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={selectedRoles[user.id] || user.role}
                          onChange={(event) =>
                            handleRoleChange(user.id, event.target.value)
                          }
                          disabled={savingId === user.id || isSelf}
                          aria-label={`Role for ${user.name}`}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(user)}
                          disabled={isSelf}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit user"
        description={editing ? `${editing.name} · ${editing.role}` : undefined}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="user-edit-form"
              disabled={saving || Boolean(passwordError)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="user-edit-form" onSubmit={handleUpdate} className="space-y-3">
          <FormField label="Full name" htmlFor="user-edit-name">
            <input
              id="user-edit-name"
              type="text"
              value={editValue.name}
              onChange={(event) => setEditValue((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Muhd Addas"
              className={inputClass}
            />
          </FormField>
          <FormField
            label="Email address"
            htmlFor="user-edit-email"
            hint="Used to sign in"
          >
            <input
              id="user-edit-email"
              type="email"
              value={editValue.email}
              onChange={(event) => setEditValue((current) => ({ ...current, email: event.target.value }))}
              placeholder="e.g. admin@fms.com"
              className={inputClass}
            />
          </FormField>
          <FormField
            label="New password"
            htmlFor="user-edit-password"
            hint="Leave empty to keep the current password"
            error={passwordError}
          >
            <input
              id="user-edit-password"
              type="password"
              value={editValue.password}
              onChange={(event) => setEditValue((current) => ({ ...current, password: event.target.value }))}
              placeholder="At least 8 characters"
              className={passwordError ? errorInputClass : inputClass}
              aria-invalid={Boolean(passwordError)}
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete user"
        message={
          deleting
            ? `"${deleting.name}" will be removed. Any linked records (students, staff, fees) will also be removed.`
            : ""
        }
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default UsersPage;
