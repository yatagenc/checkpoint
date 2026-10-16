import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <span className="icon-tile">
        <Icon size={25} strokeWidth={1.5} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button button-secondary" to="/explore">
        Explore games <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
