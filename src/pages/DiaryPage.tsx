import { BookOpen, LockKeyhole } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";
import { PageIntro } from "../components/ui/PageIntro";

export function DiaryPage() {
  return (
    <>
      <PageIntro
        eyebrow="BETWEEN THE START AND THE CREDITS"
        title="Playthrough diary"
        description="Every boss beaten. Every wrong turn. Every moment worth remembering. This is where your journey will live."
      />
      <div className="diary-layout">
        <EmptyState
          icon={BookOpen}
          title="Your first chapter is still unwritten."
          description="Chapter labels, dated progress notes, and playthrough milestones will help you remember more than the ending."
        />
        <aside className="diary-aside">
          <span className="eyebrow">ON THE ROADMAP</span>
          <h2>A little more personal.</h2>
          <p>
            Record a chapter, add a note, and pick up exactly where you left
            off.
          </p>
          <div className="aside-divider">
            <LockKeyhole size={18} />
            <p>
              Planned visibility controls: Public, Friends Only, and Private.
              Spoiler flags will keep discoveries protected.
            </p>
          </div>
        </aside>
      </div>
      <p className="sample-note">
        Diary editing and visibility controls are planned for a later phase.
      </p>
    </>
  );
}
