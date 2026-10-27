import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { useTheme } from "../theme/theme-context";
import Icon from "./Icons";

const NAV_SECTIONS = [
  {
    title: "Overview",
    roles: ["ADMIN", "FINANCE", "TEACHER", "STUDENT"],
    items: [
      { to: "/", label: "Dashboard", icon: "dashboard" },
      {
        to: "/reports/institute",
        label: "Institute Report",
        icon: "office",
        roles: ["ADMIN", "FINANCE"],
      },
    ],
  },
  {
    title: "Finance",
    roles: ["ADMIN", "FINANCE"],
    items: [
      { to: "/reports", label: "Reports", icon: "chart" },
      { to: "/fee-types", label: "Fee Types", icon: "document" },
      { to: "/fee-plans", label: "Fee Plans", icon: "wallet" },
      { to: "/receipts", label: "Receipts", icon: "receipt" },
      { to: "/refunds", label: "Refunds", icon: "refund" },
      { to: "/staff", label: "Staff & Salaries", icon: "userGroup" },
      { to: "/expenses", label: "Expenses", icon: "expense" },
    ],
  },
  {
    title: "Institute",
    roles: ["ADMIN", "FINANCE", "TEACHER"],
    items: [
      { to: "/classes", label: "Classes", icon: "book" },
      { to: "/students", label: "Students", icon: "student" },
    ],
  },
  {
    title: "Administration",
    roles: ["ADMIN", "FINANCE", "TEACHER", "STUDENT"],
    items: [
      { to: "/users", label: "Users", icon: "users", roles: ["ADMIN"] },
      { to: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const ROUTE_META = {
  "/": { title: "Dashboard", icon: "dashboard" },
  "/reports": { title: "Reports", icon: "chart" },
  "/reports/institute": { title: "Institute Report", icon: "office" },
  "/classes": { title: "Classes", icon: "book" },
  "/students": { title: "Students", icon: "student" },
  "/fee-types": { title: "Fee Types", icon: "document" },
  "/fee-plans": { title: "Fee Plans", icon: "wallet" },
  "/receipts": { title: "Receipts", icon: "receipt" },
  "/refunds": { title: "Refunds", icon: "refund" },
  "/staff": { title: "Staff & Salaries", icon: "userGroup" },
  "/expenses": { title: "Expenses", icon: "expense" },
  "/users": { title: "Users", icon: "users" },
  "/settings": { title: "Settings", icon: "settings" },
  "/portal": { title: "My Portal", icon: "student" },
};

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
      className={`flex items-center justify-center rounded-full font-semibold ${className}`}
      style={{
        background: "linear-gradient(140deg, var(--brand), var(--teal))",
        color: "var(--brand-ink)",
      }}
    >
      {(user?.name || "").charAt(0).toUpperCase() || "J"}
    </span>
  );
};

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`icon-btn ${className}`}
    >
      <Icon name={dark ? "sun" : "moon"} className="h-[18px] w-[18px]" />
    </button>
  );
};

const navLinkClass = (isCollapsed) => ({ isActive }) =>
  `group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
    isCollapsed ? "justify-center px-2" : "gap-3 px-3"
  } ${isActive ? "nav-active" : "text-muted hover:bg-surface-2 hover:text-content"}`;

const NavGroup = ({ items, onNavigate, isCollapsed = false }) => {
  const [closedSections, setClosedSections] = useState(() => new Set());

  const toggleSection = (title) => {
    setClosedSections((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <div className={isCollapsed ? "space-y-4 px-2 py-4" : "space-y-4 px-3 py-4"}>
      {items.map((section) => {
        const isClosed = !isCollapsed && closedSections.has(section.title);
        return (
          <div key={section.title}>
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                aria-expanded={!isClosed}
                className="group mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint transition hover:bg-surface-2 hover:text-content"
              >
                <span>{section.title}</span>
                <Icon
                  name="chevronDown"
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isClosed ? "-rotate-90" : ""
                  }`}
                />
              </button>
            )}
            <nav className={`flex flex-col gap-1 ${isClosed ? "hidden" : ""}`}>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  title={isCollapsed ? item.label : undefined}
                  className={navLinkClass(isCollapsed)}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !isCollapsed && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
                          style={{
                            background: "linear-gradient(var(--brand), var(--teal))",
                          }}
                        />
                      )}
                      <Icon
                        name={item.icon}
                        className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? "text-brand-strong" : ""
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        );
      })}
    </div>
  );
};

const Brand = ({ onToggle, isCollapsed }) => (
  <div
    className={`flex h-16 items-center border-b border-line ${
      isCollapsed ? "justify-center px-2" : "justify-between px-5"
    }`}
  >
    <div className="flex items-center gap-2.5">
      <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold">
        J
      </span>
      {!isCollapsed && (
        <div className="leading-tight">
          <h1 className="text-sm font-extrabold tracking-tight text-content">
            JAHAN<span className="text-brand-strong"> FMS</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.18em] text-faint">
            Institute Finance
          </p>
        </div>
      )}
    </div>
    {!isCollapsed && onToggle && (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Collapse sidebar"
        className="icon-btn h-8 w-8 border-transparent bg-transparent"
      >
        <Icon name="chevronsLeft" className="h-4 w-4" />
      </button>
    )}
  </div>
);

const getBreadcrumbs = (pathname) => {
  if (pathname === "/") return [{ label: "Dashboard" }];
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((entry) => entry.to === pathname);
    if (item) {
      return [
        { label: "Home", to: "/" },
        { label: section.title },
        { label: item.label },
      ];
    }
  }
  return [{ label: ROUTE_META[pathname]?.title ?? "Jahan FMS" }];
};

const TopbarBreadcrumbs = ({ pathname }) => {
  const crumbs = getBreadcrumbs(pathname);
  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden items-center gap-1.5 text-xs text-faint sm:flex"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <Icon name="chevronRight" className="h-3 w-3" />}
            {crumb.to && !isLast ? (
              <Link to={crumb.to} className="transition hover:text-content">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-muted" : ""}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
};

const Layout = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("fms-sidebar-collapsed") === "1",
  );
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role;
  const searchRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("fms-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    const handleKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const closeOverlays = () => {
    setMenuOpen(false);
    setNotifOpen(false);
  };

  const handleLogout = () => {
    closeOverlays();
    logout();
    navigate("/login");
  };

  const canView = (itemRoles) => !itemRoles || (role && itemRoles.includes(role));

  const visibleSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => canView(item.roles)),
      })).filter((section) => canView(section.roles) && section.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role],
  );

  const searchableItems = useMemo(
    () => visibleSections.flatMap((section) => section.items),
    [visibleSections],
  );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return searchableItems;
    return searchableItems.filter((item) => item.label.toLowerCase().includes(term));
  }, [query, searchableItems]);

  const meta = ROUTE_META[location.pathname] ?? {
    title: "Jahan FMS",
    icon: "dashboard",
  };

  const goTo = (to) => {
    setSearchOpen(false);
    setQuery("");
    closeOverlays();
    navigate(to);
  };

  const onDesktopNavigate = () => closeOverlays();
  const onMobileNavigate = () => {
    setSidebarOpen(false);
    closeOverlays();
  };

  return (
    <div className="app-shell-bg min-h-screen">
      <div className="relative z-10">
        {/* Desktop sidebar */}
        <aside
          className={`glass fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line transition-[width] duration-300 lg:flex ${
            collapsed ? "w-[76px]" : "w-64"
          }`}
        >
          <Brand onToggle={() => setCollapsed(true)} isCollapsed={collapsed} />
          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="icon-btn mx-auto mt-3 h-8 w-8 border-transparent bg-transparent"
            >
              <Icon name="chevronsRight" className="h-4 w-4" />
            </button>
          )}
          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
            <NavGroup
              items={visibleSections}
              onNavigate={onDesktopNavigate}
              isCollapsed={collapsed}
            />
          </div>
        </aside>

        {/* Main column */}
        <div className={collapsed ? "lg:pl-[76px]" : "lg:pl-64"}>
          {/* Top bar */}
          <header className="glass sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line px-4 lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="icon-btn"
                  aria-label="Open menu"
                >
                  <Icon name="menu" className="h-5 w-5" />
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <span className="soft-brand hidden h-10 w-10 items-center justify-center rounded-xl sm:flex">
                  <Icon name={meta.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-content sm:text-base">
                    {meta.title}
                  </h2>
                  <TopbarBreadcrumbs pathname={location.pathname} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="hidden items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-faint transition hover:border-line-strong hover:text-muted md:flex"
              >
                <Icon name="search" className="h-4 w-4" />
                <span>Search…</span>
                <span className="ml-6 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold">
                  ⌘K
                </span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((open) => !open)}
                  className="icon-btn"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                >
                  <Icon name="bell" className="h-[18px] w-[18px]" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
                </button>
                {notifOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotifOpen(false)}
                    />
                    <div className="glass-strong animate-scale-in absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl shadow-[var(--shadow-float)]">
                      <div className="border-b border-line px-4 py-3">
                        <p className="text-sm font-semibold text-content">
                          Notifications
                        </p>
                      </div>
                      <div className="px-4 py-6 text-center text-xs text-muted">
                        You're all caught up.
                      </div>
                    </div>
                  </>
                )}
              </div>

              <ThemeToggle />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-surface-2"
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar user={user} className="h-8 w-8 text-sm" />
                  <span className="hidden text-sm font-semibold text-content md:block">
                    {user?.name}
                  </span>
                  <Icon
                    name="chevronDown"
                    className="hidden h-4 w-4 text-faint md:block"
                  />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="glass-strong animate-scale-in absolute right-0 z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-xl shadow-[var(--shadow-float)]">
                      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                        <Avatar user={user} className="h-10 w-10 text-base" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-content">
                            {user?.name}
                          </p>
                          <p className="truncate text-xs text-muted">{user?.email}</p>
                        </div>
                      </div>
                      {user?.role && (
                        <div className="px-4 py-2">
                          <span className="badge badge-brand">{user.role}</span>
                        </div>
                      )}
                      <NavLink
                        to="/settings"
                        onClick={closeOverlays}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted transition hover:bg-surface-2 hover:text-content"
                      >
                        <Icon name="settings" className="h-4 w-4" />
                        Settings
                      </NavLink>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger transition hover:bg-surface-2"
                      >
                        <Icon name="logout" className="h-4 w-4" />
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
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
                onClick={() => setSidebarOpen(false)}
              />
              <aside className="glass-strong animate-slide-in-left absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line">
                <Brand isCollapsed={false} />
                <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
                  <NavGroup items={visibleSections} onNavigate={onMobileNavigate} />
                </div>
              </aside>
            </div>
          )}

          {/* Main content */}
          <main
            key={`${location.pathname}-${theme}`}
            className="animate-fade-in mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* Command palette / quick search */}
      {searchOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[3px] animate-fade-in"
            onClick={() => setSearchOpen(false)}
          />
          <div className="glass-strong animate-scale-in relative w-full max-w-lg overflow-hidden rounded-2xl shadow-[var(--shadow-float)]">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Icon name="search" className="h-5 w-5 text-faint" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages…"
                className="w-full bg-transparent text-sm text-content outline-none placeholder:text-faint"
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-faint">
                Esc
              </kbd>
            </div>
            <div className="thin-scroll max-h-72 overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  No pages found.
                </p>
              ) : (
                results.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => goTo(item.to)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-content"
                  >
                    <Icon name={item.icon} className="h-4 w-4 text-brand-strong" />
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
