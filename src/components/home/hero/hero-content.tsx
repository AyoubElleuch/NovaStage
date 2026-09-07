import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import AuthTransitionLink from "../navigation/auth-transition-link";

export default function HeroContent({ onExplore }: { onExplore: () => void }) {
  return <div className="home-hero-content">
    <h1 id="home-title" tabIndex={-1}>NovaStage</h1>
    <p className="home-hero-statement">Design the system.<br /><span>Plan the build. Together.</span></p>
    <p className="home-hero-description">Describe what you&apos;re building. NovaStage generates the workflow and AWS architecture, maps services and dependencies, then lets your team edit live, claim work, and track checkpoints in one canvas.</p>
    <div className="home-hero-actions">
      <AuthTransitionLink href="/signup" className="home-button"><Sparkles size={17} />Generate your architecture</AuthTransitionLink>
      <button type="button" className="home-text-button" onClick={onExplore}>Try the live canvas<ArrowRight size={17} /></button>
    </div>
    <button type="button" className="home-explore-cue" onClick={onExplore}><ArrowDown size={16} /><span>See the workspace in action</span></button>
  </div>;
}