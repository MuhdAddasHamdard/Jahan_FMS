import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import { useAuth } from "../auth/auth-context";
import { useTheme } from "../theme/theme-context";
import { useToast } from "../hooks/useToast";
import { fileToAvatarDataUrl } from "../utils/image";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const SectionCard = ({ title, description, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    <div className="mt-4">{children}</div>
  </div>
);

const SaveButton = ({ submitting }) => (
  <button
    type="submit"
    disabled={submitting}
    className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
  >
    {submitting ? "Saving..." : "Save changes"}
  </button>
);

const SettingsPage = () => {
  const { user, updateUser, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [profile, setProfile] = useState(() => ({
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatarUrl: user?.avatarUrl ?? "",
  }));
  const [password, setPassword] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [institute, setInstitute] = useState(null);
  const [instituteDraft, setInstituteDraft] = useState({
    name: "",
    tagline: "",
    email: "",
    phone: "",
    address: "",
  });

  const [loading, setLoading] = useState(() => !isAdmin);
  const [error, setError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [instituteSubmitting, setInstituteSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    let cancelled = false;

    api
      .get("/settings/institute")
      .then((data) => {
        if (!cancelled) {
          setInstitute(data);
          setInstituteDraft({
            name: data.name ?? "",
            tagline: data.tagline ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            address: data.address ?? "",
          });
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
  }, [isAdmin]);

  const handleAvatarChange = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setError("");
    setAvatarBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setProfile((current) => ({ ...current, avatarUrl: dataUrl }));
      toast.success("Photo ready — save your profile to apply it");
    } catch (err) {
      setError(err.message);
    } finally {
      setAvatarBusy(false);
      input.value = "";
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!profile.name.trim()) {
      setError("Name is required");
      return;
    }

    setProfileSubmitting(true);
    try {
      await updateUser({
        name: profile.name.trim(),
        email: profile.email.trim(),
        avatarUrl: profile.avatarUrl || null,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!password.currentPassword) {
      setError("Current password is required");
      return;
    }
    if (password.password.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (password.password !== password.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await updateUser({
        password: password.password,
        currentPassword: password.currentPassword,
      });
      setPassword({ currentPassword: "", password: "", confirmPassword: "" });
      toast.success("Password changed");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleInstituteSubmit = async (event) => {
    event.preventDefault();
    setError("");

    setInstituteSubmitting(true);
    try {
      const data = await api.patch("/settings/institute", {
        name: instituteDraft.name.trim(),
        tagline: instituteDraft.tagline.trim() || "",
        email: instituteDraft.email.trim() || "",
        phone: instituteDraft.phone.trim() || "",
        address: instituteDraft.address.trim() || "",
      });
      setInstitute(data);
      setInstituteDraft({
        name: data.name ?? "",
        tagline: data.tagline ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
      });
      toast.success("Institute profile updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInstituteSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your profile, security and institute preferences."
      />

      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Profile"
          description="Update your name, email and profile picture."
        >
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="avatar-input"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
              />
              <label htmlFor="avatar-input" className="cursor-pointer">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Profile"
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-teal-500"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-xl font-semibold text-white ring-2 ring-teal-500">
                    {(user?.name || "J").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="mt-2 block text-center text-xs font-medium text-teal-600">
                  {avatarBusy ? "Processing..." : "Change photo"}
                </span>
              </label>
              <p className="text-xs text-slate-500">
                Photos are resized automatically, so any image size works.
              </p>
            </div>

            <div>
              <label htmlFor="profile-name" className={labelClass}>
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                value={profile.name}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, name: event.target.value }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="profile-email" className={labelClass}>
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, email: event.target.value }))
                }
                className={inputClass}
              />
            </div>

            <SaveButton submitting={profileSubmitting} />
          </form>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Security"
            description="Change your password regularly to keep your account safe."
          >
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="current-password" className={labelClass}>
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={password.currentPassword}
                  onChange={(event) =>
                    setPassword((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  className={inputClass}
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label htmlFor="new-password" className={labelClass}>
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password.password}
                  onChange={(event) =>
                    setPassword((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className={labelClass}>
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={password.confirmPassword}
                  onChange={(event) =>
                    setPassword((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>

              <SaveButton submitting={passwordSubmitting} />
            </form>
          </SectionCard>

          <SectionCard
            title="Appearance"
            description="Choose between light and dark mode."
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {theme === "dark" ? "Dark mode" : "Light mode"}
                </p>
                <p className="text-xs text-slate-500">
                  {theme === "dark"
                    ? "You are using the dark theme."
                    : "You are using the light theme."}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {theme === "dark" ? "Switch to light" : "Switch to dark"}
              </button>
            </div>
          </SectionCard>
        </div>
      </div>

      {isAdmin && (
        <>
          {loading && institute === null ? (
            <div className="mt-6 flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <Spinner />
            </div>
          ) : (
            <div className="mt-6">
              <SectionCard
                title="Institute profile"
                description="These details identify your institute to staff and in reports."
              >
                <form onSubmit={handleInstituteSubmit} className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="institute-name" className={labelClass}>
                      Institute name
                    </label>
                    <input
                      id="institute-name"
                      type="text"
                      value={instituteDraft.name}
                      onChange={(event) =>
                        setInstituteDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="institute-tagline" className={labelClass}>
                      Tagline
                    </label>
                    <input
                      id="institute-tagline"
                      type="text"
                      value={instituteDraft.tagline}
                      onChange={(event) =>
                        setInstituteDraft((current) => ({
                          ...current,
                          tagline: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="institute-email" className={labelClass}>
                      Email
                    </label>
                    <input
                      id="institute-email"
                      type="email"
                      value={instituteDraft.email}
                      onChange={(event) =>
                        setInstituteDraft((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="institute-phone" className={labelClass}>
                      Phone
                    </label>
                    <input
                      id="institute-phone"
                      type="tel"
                      value={instituteDraft.phone}
                      onChange={(event) =>
                        setInstituteDraft((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="institute-address" className={labelClass}>
                      Address
                    </label>
                    <textarea
                      id="institute-address"
                      value={instituteDraft.address}
                      onChange={(event) =>
                        setInstituteDraft((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      className={inputClass}
                      rows={2}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <SaveButton submitting={instituteSubmitting} />
                  </div>
                </form>
              </SectionCard>
            </div>
          )}
        </>
      )}

      {isAdmin && (
        <div className="mt-6">
          <SectionCard
            title="User & access management"
            description="Manage system users and assign roles (admin, finance, teacher, student)."
          >
            <Link
              to="/users"
              className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Manage users
            </Link>
          </SectionCard>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;