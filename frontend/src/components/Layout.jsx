import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { useTheme } from "../theme/theme-context";
import ChatBot from "./ChatBot";

const ICON_PROPS = {
  className: "h-5 w-5",
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
};

const NAV_SECTIONS = [
  {
    title: "Overview",
    roles: ["ADMIN", "FINANCE", "TEACHER", "STUDENT"],
    items: [
      {
        to: "/",
        label: "Dashboard",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
        ),
      },
      {
        to: "/reports/institute",
        label: "Institute Report",
        roles: ["ADMIN", "FINANCE"],
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zm14-2l4 3-4 3v-6z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Finance",
    roles: ["ADMIN", "FINANCE"],
    items: [
      {
        to: "/reports",
        label: "Reports",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
          </svg>
        ),
      },
      {
        to: "/fee-types",
        label: "Fee Types",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
          </svg>
        ),
      },
      {
        to: "/fee-plans",
        label: "Fee Plans",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M20 7V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2h-2v2H4V3h14v4h2zm-9 3h2v-2h-2v2zm0 4h2v-2h-2v2zm2 0h6v-2h-6v2zm-2-8h2V4h-2v2zm2 2h2V6h-2v2zm-2-4h2V2h-2v2zm2 6h2v-2h-2v2z" />
          </svg>
        ),
      },
      {
        to: "/receipts",
        label: "Receipts",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 9h10V7H7v2zm0 4h10v-2H7v2zm0 4h6v-2H7v2z" />
          </svg>
        ),
      },
      {
        to: "/refunds",
        label: "Refunds",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-13.5l-1.41 1.41 2.09 2.09H8v2h8.18l-2.09 2.09 1.41 1.41 4.5-4.5-4.5-4.5z" />
          </svg>
        ),
      },
      {
        to: "/staff",
        label: "Staff & Salaries",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        ),
      },
      {
        to: "/expenses",
        label: "Expenses",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-4h16v4zm0-6H4v-2h16v2zm0-4H4V6h16v2z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Institute",
    roles: ["ADMIN", "FINANCE", "TEACHER"],
    items: [
      {
        to: "/classes",
        label: "Classes",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M12 3L2 8l10 5 10-5-10-5zM2 13l10 5 10-5-2-1-8 4-8-4-2 1z" />
          </svg>
        ),
      },
      {
        to: "/students",
        label: "Students",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Administration",
    roles: ["ADMIN", "FINANCE", "TEACHER", "STUDENT"],
    items: [
      {
        to: "/users",
        label: "Users",
        roles: ["ADMIN"],
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        ),
      },
      {
        to: "/settings",
        label: "Settings",
        icon: (
          <svg {...ICON_PROPS}>
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        ),
      },
    ],
  },
];

const Avatar = ({ user, className }) => {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-teal-600 font-semibold text-white ${className}`}
    >
      {(user?.name || "").charAt(0).toUpperCase() || "J"}
    </span>
  );
};

const ThemeToggle = ({ className }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
    >
      {theme === "dark" ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
        </svg>
      )}
    </button>
  );
};

const layoutLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-teal-600 text-white"
      : "text-slate-400 hover:bg-slate-800 hover:text-white"
  }`;

const NavList = ({ items, onNavigate }) => (
  <div className="space-y-6 px-3 py-4">
    {items.map((section) => (
      <div key={section.title}>
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {section.title}
        </p>
        <nav className="flex flex-col gap-1">
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onNavigate}
              className={layoutLinkClass}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    ))}
  </div>
);

const SidebarFooter = ({ user, onNavigate }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="border-t border-slate-800 p-4">
      <div className="flex items-center gap-3">
        <Avatar user={user} className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="flex flex-1 items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-teal-500 hover:text-teal-400"
        >
          Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-500 hover:text-red-400"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

const Layout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login");
  };

  const canView = (itemRoles) => !itemRoles || (role && itemRoles.includes(role));

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canView(item.roles)),
  }))
    .filter((section) => canView(section.roles) && section.items.length > 0);

  const closeAll = () => {
    setSidebarOpen(false);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-slate-950 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
            J
          </span>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">JAHAN FMS</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">
              Institute Management
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList items={visibleSections} />
        </div>
        <SidebarFooter user={user} />
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
              J
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              JAHAN FMS
            </span>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
              J
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              JAHAN FMS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen((open) => !open)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
              </svg>
            </button>
            <ThemeToggle />

            <div className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Account menu"
              >
                <Avatar user={user} className="h-8 w-8" />
                <span className="hidden text-sm font-medium text-slate-900 dark:text-slate-100 md:block">
                  {user?.name}
                </span>
                <svg
                  className="hidden h-4 w-4 text-slate-500 md:block"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {user?.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                      <span>Dark mode</span>
                      <ThemeToggle />
                    </div>
                    <NavLink
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Settings
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/50"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-950">
              <div className="flex h-16 items-center gap-2 px-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
                  J
                </span>
                <h1 className="text-sm font-bold text-white">JAHAN FMS</h1>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavList items={visibleSections} onNavigate={closeAll} />
              </div>
              <SidebarFooter user={user} onNavigate={closeAll} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <ChatBot />
    </div>
  );
};

export default Layout;