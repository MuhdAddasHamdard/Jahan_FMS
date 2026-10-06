import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import Alert from "../components/Alert";

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

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand Section */}
        <section className="hidden bg-slate-950 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">JAHAN FMS</h1>
            <p className="mt-2 text-sm text-slate-400">
              Financial Management System
            </p>
          </div>

          <div className="max-w-lg">
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-teal-400">
              Institute Management
            </p>

            <h2 className="text-5xl font-bold leading-tight">
              Manage your institute with clarity.
            </h2>

            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-400">
              Fee collection, staff salaries, expenses, classes, and reporting
              for your institute.
            </p>
          </div>

          <p className="text-sm text-slate-500">© 2026 Jahan FMS</p>
        </section>

        {/* Login Section */}
        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold text-teal-600">
                Welcome back
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Sign in to your account
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Enter your credentials to access Jahan FMS.
              </p>
            </div>

            {formError && <div className="mb-5"><Alert type="error" message={formError} /></div>}

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
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
                  className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                    errors.email
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-300 focus:border-teal-500 focus:ring-teal-100"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
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
                  className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                    errors.password
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-300 focus:border-teal-500 focus:ring-teal-100"
                  }`}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;