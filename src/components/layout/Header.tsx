import { useRef, useState } from "react";
import { Flag, Menu, UserRound, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import { GameSearch } from "./GameSearch";

const links = [
  { to: "/explore", label: "Explore" },
  { to: "/library", label: "My library" },
  { to: "/diary", label: "Diary" },
];

export function Header() {
  const { key } = useLocation();
  return <HeaderContent key={key} />;
}
function HeaderContent() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
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
          <div className="desktop-search">
            <GameSearch />
          </div>
          <NavLink
            className="profile-link"
            to="/profile"
            aria-label="Your profile"
          >
            <UserRound size={18} />
          </NavLink>
          <button
            ref={toggle}
            className="menu-toggle"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
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
          <GameSearch onSearch={() => setOpen(false)} />
          {[
            { to: "/", label: "Home" },
            ...links,
            { to: "/profile", label: "Profile" },
          ].map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
