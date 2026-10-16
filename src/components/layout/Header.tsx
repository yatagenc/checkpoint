import { useState } from "react";
import { Flag, Menu, Search, UserRound, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";

const links = [
  { to: "/explore", label: "Explore" },
  { to: "/library", label: "My library" },
  { to: "/diary", label: "Diary" },
];

export function Header() {
  const [openPath, setOpenPath] = useState<string | null>(null);
  const { pathname } = useLocation();
  const open = openPath === pathname;
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="Checkpoint home">
          <Flag size={23} fill="currentColor" strokeWidth={1.5} />
          <span>
            checkpoint<span className="brand-dot">.</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <div className="search-placeholder">
            <Search size={16} />
            <input
              aria-label="Game search — coming in a future phase"
              placeholder="Search games · coming soon"
              disabled
            />
          </div>
          <NavLink
            className="profile-link"
            to="/profile"
            aria-label="Your profile"
          >
            <UserRound size={18} />
          </NavLink>
          <button
            className="menu-toggle"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="mobile-nav container"
          aria-label="Mobile navigation"
        >
          {[
            { to: "/", label: "Home" },
            ...links,
            { to: "/profile", label: "Profile" },
          ].map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpenPath(null)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
