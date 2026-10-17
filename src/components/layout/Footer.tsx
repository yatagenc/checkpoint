import { Flag, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Link to="/" className="footer-brand">
            <Flag size={16} /> Checkpoint
          </Link>
          <p>Every game has a story. Keep yours.</p>
        </div>
        <div className="footer-links">
          <Link to="/explore">
            Discover <ArrowUpRight size={13} />
          </Link>
          <a href="https://rawg.io" target="_blank" rel="noreferrer">
            Game data & imagery via RAWG ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
