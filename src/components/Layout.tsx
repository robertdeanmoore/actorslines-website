import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { supabaseConfigured } from "../lib/supabase";

const navLink = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-brand text-white" : "text-gray-700 hover:bg-gray-200"
  }`;

export default function Layout() {
  const { session, profile, signOut } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <nav className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-2">
          <Link to="/" className="mr-4 flex items-center gap-2 text-xl font-bold text-brand">
            <img src="/assets/logo-mark.png" alt="" className="w-8 h-8 rounded-lg" />
            Actors Lines
          </Link>
          {session && profile && (
            <>
              <NavLink to="/learn-lines" className={navLink}>Learn Lines</NavLink>
              <NavLink to="/kb" className={navLink}>Knowledge base</NavLink>
              <NavLink to="/board" className={navLink}>Enhancement board</NavLink>
              <NavLink to="/requests" className={navLink}>My requests</NavLink>
              {profile.role === "admin" && (
                <>
                  <NavLink to="/admin" className={navLink}>Admin</NavLink>
                  <NavLink to="/admin/licences" className={navLink}>Box office</NavLink>
                </>
              )}
            </>
          )}
          <span className="flex-1" />
          {session && profile ? (
            <>
              <NavLink to="/profile" className={navLink}>
                {profile.display_name || "Profile"}
              </NavLink>
              <button
                onClick={signOut}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLink}>Sign in</NavLink>
              <NavLink
                to="/register"
                className="px-3 py-2 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-light"
              >
                Create account
              </NavLink>
            </>
          )}
        </nav>
      </header>

      {!supabaseConfigured && (
        <div className="bg-amber-100 text-amber-900 text-sm text-center py-2 px-4">
          Backend not configured yet — accounts and sign-in are disabled until the
          Supabase values are added to <code>.env</code> (SETUP.md, step S2).
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 text-sm text-gray-500">
        <div className="mx-auto max-w-5xl px-4 py-6 flex flex-wrap gap-4">
          <span>© {new Date().getFullYear()} Actors Lines</span>
          <span className="flex-1" />
          <Link to="/privacy" className="hover:text-brand">Privacy</Link>
          <Link to="/terms" className="hover:text-brand">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
