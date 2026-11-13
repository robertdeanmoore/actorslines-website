import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { supabaseConfigured } from "../lib/supabase";
import { useRouteFocus } from "../lib/useRouteFocus";
import { useRouteMeta } from "../lib/useRouteMeta";
import Footer from "./Footer";
import MobileMenu from "./ui/MobileMenu";
import SkipLink from "./ui/SkipLink";

type NavItem = { to: string; label: string };

const PUBLIC_LINKS: NavItem[] = [{ to: "/kb", label: "Help" }];

const MEMBER_LINKS: NavItem[] = [
  { to: "/learn-lines", label: "Learn Lines" },
  { to: "/kb", label: "Knowledge base" },
  { to: "/board", label: "Enhancement board" },
  { to: "/requests", label: "My requests" },
];

const ADMIN_LINKS: NavItem[] = [
  { to: "/admin", label: "Admin" },
  { to: "/admin/licences", label: "Box office" },
];

export default function Layout() {
  const { session, profile, signOut } = useAuth();
  const { pathname } = useLocation();
  useRouteFocus();
  useRouteMeta();

  const signedIn = Boolean(session && profile);
  const isAdmin = profile?.role === "admin";
  const links = signedIn ? MEMBER_LINKS : PUBLIC_LINKS;
  // The landing page lays out its own full-width sections; every other page keeps the 5xl column.
  const fullBleed = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      <SkipLink />

      {import.meta.env.DEV && !supabaseConfigured && (
        <div className="al-dev-bar">
          Backend not configured yet — accounts and sign-in are disabled until the
          Supabase values are added to <code>.env</code> (SETUP.md, step S2).
        </div>
      )}

      <header className="al-header">
        <div className="al-header__row">
          <div className="al-header__bar">
            <Link to="/" className="al-brand" aria-label="Actors Lines, home">
              <img src="/assets/logo-mark.png" alt="" width={37} height={36} />
              <span>Actors Lines</span>
            </Link>

            <nav aria-label="Main" className="al-nav hidden md:flex">
              {links.map((item) => (
                <NavLink key={item.to + item.label} to={item.to} className="al-nav-link">
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="al-actions">
              <div className="hidden md:flex items-center gap-2">
                {signedIn ? (
                  <>
                    <NavLink to="/profile" className="al-nav-link">
                      {profile?.display_name || "Profile"}
                    </NavLink>
                    <button type="button" onClick={signOut} className="al-btn al-btn--ghost">
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="al-btn al-btn--ghost">Sign in</Link>
                    <Link to="/register" className="al-btn al-btn--primary">Create account</Link>
                  </>
                )}
              </div>

              <MobileMenu>
                <nav aria-label="Main menu">
                  {links.map((item) => (
                    <NavLink key={item.to + item.label} to={item.to} className="al-menu-link">
                      {item.label}
                    </NavLink>
                  ))}
                  {signedIn ? (
                    <>
                      <NavLink to="/profile" className="al-menu-link">
                        {profile?.display_name || "Profile"}
                      </NavLink>
                      <button type="button" onClick={signOut} className="al-menu-link">
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="al-menu-link">Sign in</Link>
                      <div className="al-menu-cta">
                        <Link to="/register" className="al-btn al-btn--primary al-btn--block">
                          Create account
                        </Link>
                      </div>
                    </>
                  )}
                </nav>
              </MobileMenu>
            </div>
          </div>

          {signedIn && isAdmin && (
            <nav aria-label="Admin" className="al-admin-bar">
              <div className="al-admin-bar__inner">
                {ADMIN_LINKS.map((item) => (
                  <NavLink key={item.to} to={item.to} end className="al-nav-link">
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </nav>
          )}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 w-full">
        {fullBleed ? (
          <Outlet />
        ) : (
          <div className="mx-auto w-full max-w-5xl px-4 py-8">
            <Outlet />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
