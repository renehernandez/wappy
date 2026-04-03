import { Link, useLocation } from "react-router";

interface NavShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
}

function SessionsIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function DevicesIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

export function NavShell({ children, userEmail }: NavShellProps) {
  const location = useLocation();
  const pathname = location.pathname;

  function isActive(matchPrefix: string) {
    if (matchPrefix === "/") return pathname === "/";
    if (matchPrefix === "/__devices") return pathname === "/";
    return pathname.startsWith(matchPrefix);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">
      {/* Desktop top nav — hidden on mobile */}
      <nav className="hidden sm:flex fixed top-0 left-0 right-0 z-50 h-14 bg-slate-950 border-b border-slate-800 items-center px-6 gap-6">
        {/* Wordmark */}
        <Link
          to="/"
          className="font-mono font-bold text-lg text-gray-100 hover:text-white shrink-0"
        >
          wappy
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 flex-1">
          <Link
            to="/sessions"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith("/sessions")
                ? "text-cyan-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Sessions
          </Link>
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === "/"
                ? "text-cyan-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Devices
          </Link>
        </div>

        {/* User email */}
        {userEmail && (
          <span className="text-xs text-gray-500 font-mono truncate max-w-48">
            {userEmail}
          </span>
        )}
      </nav>

      {/* Page content */}
      <main className="sm:pt-14 pb-16 sm:pb-0">{children}</main>

      {/* Mobile bottom tab bar — hidden on sm+ */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-slate-950 border-t border-slate-800 flex items-stretch">
        {/* Sessions tab */}
        <Link
          to="/sessions"
          className={`flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors ${
            pathname.startsWith("/sessions") ? "text-cyan-400" : "text-gray-500"
          }`}
        >
          <SessionsIcon active={pathname.startsWith("/sessions")} />
          <span>Sessions</span>
        </Link>

        {/* Dashboard tab */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors ${
            pathname === "/" ? "text-cyan-400" : "text-gray-500"
          }`}
        >
          <HomeIcon active={pathname === "/"} />
          <span>Dashboard</span>
        </Link>

        {/* Devices tab (links to dashboard, devices are on dashboard) */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors ${
            isActive("/__devices") ? "text-cyan-400" : "text-gray-500"
          }`}
        >
          <DevicesIcon active={isActive("/__devices")} />
          <span>Devices</span>
        </Link>
      </div>
    </div>
  );
}
