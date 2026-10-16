import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Layers3,
  MessageSquareText,
} from "lucide-react";
import { Link } from "react-router";
import landscape from "../assets/landscape.svg";
import { games } from "../data/games";
import { GameCard } from "../components/games/GameCard";
import { SectionHeading } from "../components/ui/SectionHeading";

export function HomePage() {
  return (
    <>
      <div className="home-topline">
        <span>A HOME FOR THE GAMES YOU PLAY</span>
        <span className="preview-label">
          <i /> Phase 01 preview
        </span>
      </div>
      <section className="hero">
        <img className="hero-landscape" src={landscape} alt="" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow">PLAY. REFLECT. REMEMBER.</p>
          <h1>
            Great games.
            <br />
            Lasting stories.
          </h1>
          <p>
            Track what you play. Remember how it felt.
            <br className="hidden sm:block" /> Make every playthrough part of
            your story.
          </p>
          <Link className="button button-primary" to="/explore">
            Find your next game <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="hero-caption">
          <span>THE LANDS BETWEEN</span>
          <Link to="/games/elden-ring">
            Explore Elden Ring <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      <section className="section">
        <SectionHeading
          eyebrow="YOUR NEXT CHAPTER"
          title="Worlds worth getting lost in"
        >
          <Link className="text-link" to="/explore">
            Explore games <ArrowRight size={16} />
          </Link>
        </SectionHeading>
        <p className="sample-note">
          Sample collection · Original artwork placeholders
        </p>
        <div className="game-grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
      <section className="manifesto">
        <div>
          <p className="eyebrow">MORE THAN A BACKLOG</p>
          <h2>
            The journey deserves
            <br />a place of its own.
          </h2>
          <p>
            Your library is only the beginning. Checkpoint is a space for
            everything that happens between starting a game and seeing the
            credits.
          </p>
        </div>
        <div className="feature-list">
          {[
            {
              icon: Layers3,
              title: "A library that feels like you",
              text: "A place for what you’re playing, what you’ve finished, and what’s next.",
              to: "/library",
            },
            {
              icon: BookOpen,
              title: "One chapter at a time",
              text: "A future home for your milestones, small discoveries, and playthrough notes.",
              to: "/diary",
            },
            {
              icon: MessageSquareText,
              title: "Keep the discovery intact",
              text: "Spoiler-aware reviews and discussions are part of the road ahead.",
              to: "/profile",
            },
          ].map(({ icon: Icon, title, text, to }) => (
            <Link to={to} key={title} className="feature">
              <Icon size={21} strokeWidth={1.5} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
