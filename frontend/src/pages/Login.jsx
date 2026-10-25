import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import Alert from "../components/Alert";
import Icon from "../components/Icons";

const HIGHLIGHTS = [
  { icon: "banknotes", label: "Fee collection & receipts" },
  { icon: "userGroup", label: "Staff salaries & payroll" },
  { icon: "chart", label: "Real-time reporting" },
];

const Login = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/";

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const computeErrors = (emailValue, passwordValue, touchedFields) => {
    const nextErrors = {};

    if (touchedFields.email) {
      if (!emailValue) {
        nextErrors.email = "Email is required";
      } else if (!emailPattern.test(emailValue)) {
        nextErrors.email = "Please enter a valid email address";
      }
    }

    if (touchedFields.password && !passwordValue) {
      nextErrors.password = "Password is required";
    }

    return nextErrors;
  };

  const updateField = (field, value) => {
    const nextTouched = { ...touched, [field]: true };
    setTouched(nextTouched);
    if (field === "email") {
      setEmail(value);
      setErrors(computeErrors(value, password, nextTouched));
    } else {
      setPassword(value);
      setErrors(computeErrors(email, value, nextTouched));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const nextTouched = { email: true, password: true };
    const nextErrors = computeErrors(email, password, nextTouched);
    setTouched(nextTouched);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(error.message || "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (hasError) =>
    `input !px-4 !py-3 ${hasError ? "!border-[color:var(--danger)]" : ""}`;

  return (
    <main className="app-shell-bg min-h-screen">
      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Brand / showcase panel */}
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(150deg, #0b1220 0%, #0f3f3b 55%, #115e59 100%)",
            }}
          />
          <div
            className="absolute inset-0 -z-10 opacity-70"
            style={{
              background:
                "radial-gradient(40rem 30rem at 15% 10%, rgba(37,211,102,0.28), transparent 60%), radial-gradient(36rem 28rem at 95% 90%, rgba(47,184,163,0.30), transparent 55%)",
            }}
          />

          <div className="flex items-center gap-3">
            <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-extrabold">
              J
            </span>
            <div className="leading-tight text-white">
              <h1 className="text-lg font-extrabold tracking-tight">
                JAHAN<span className="text-[color:var(--brand-400)]"> FMS</span>
              </h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                Institute Finance
              </p>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--brand-400)]">
              Institute Management
            </p>
            <h2 className="text-5xl font-bold leading-[1.08] tracking-tight text-white">
              Manage your institute{" "}
              <span className="gradient-text">with clarity.</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/60">
              Fee collection, staff salaries, expenses, classes and reporting —
              all in one elegant workspace.
            </p>

            <ul className="mt-9 space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[color:var(--brand-400)]">
                    <Icon name={item.icon} className="h-4 w-4" />
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/40">© 2026 Jahan FMS</p>
        </section>

        {/* Login form */}
        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <span className="brand-mark flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-extrabold">
                J
              </span>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">
              Welcome back
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-content">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-muted">
              Enter your credentials to access Jahan FMS.
            </p>

            <div className="card mt-8 p-6 sm:p-7">
              {formError && (
                <div className="mb-5">
                  <Alert type="error" message={formError} />
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-content">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={Boolean(errors.email)}
                    className={fieldClass(errors.email)}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-sm text-[color:var(--danger)]">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-content">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={password}
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="Enter your password"
                    aria-invalid={Boolean(errors.password)}
                    className={fieldClass(errors.password)}
                  />
                  {errors.password && (
                    <p className="mt-1.5 text-sm text-[color:var(--danger)]">
                      {errors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary w-full !py-3"
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
