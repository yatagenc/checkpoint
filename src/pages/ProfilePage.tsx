import { UserRound } from "lucide-react";
import { Link } from "react-router";
import { PageIntro } from "../components/ui/PageIntro";

export function ProfilePage() {
  return (
    <>
      <PageIntro
        eyebrow="YOUR CORNER OF CHECKPOINT"
        title="User profile"
        description="A home for your taste in games, your favorite worlds, and the stories you bring back."
      />
      <section className="profile-panel">
        <div className="profile-banner" />
        <div className="profile-body">
          <span className="profile-avatar">
            <UserRound size={35} strokeWidth={1.25} />
          </span>
          <span className="badge">Local preview</span>
          <h2>Welcome, player.</h2>
          <p>A new adventure starts with a blank page.</p>
          <div className="profile-stats">
            {["Games logged", "Reviews", "Diary entries"].map((label) => (
              <div key={label}>
                <strong>0</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <Link className="button button-secondary" to="/library">
            Visit your library
          </Link>
        </div>
      </section>
      <p className="subtle-notice">
        Placeholder profile. Accounts, profile editing, and social features are
        not available in Phase 1.
      </p>
    </>
  );
}
