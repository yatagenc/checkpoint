import { Library } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";
import { PageIntro } from "../components/ui/PageIntro";

export function LibraryPage() {
  return (
    <>
      <PageIntro
        eyebrow="YOUR PERSONAL COLLECTION"
        title="My library"
        description="The games that stayed with you. And the ones still waiting to be discovered."
      />
      <div className="status-overview" aria-label="Planned library statuses">
        {["Backlog", "Playing", "Completed", "On Hold", "Dropped"].map(
          (status) => (
            <div key={status}>
              <span>{status}</span>
              <strong>0</strong>
            </div>
          ),
        )}
      </div>
      <EmptyState
        icon={Library}
        title="A new collection starts here."
        description="Your library is a blank slate. In a future phase, save games and organize them by playing status."
      />
      <p className="sample-note text-center">
        Library management is coming in a future phase.
      </p>
    </>
  );
}
