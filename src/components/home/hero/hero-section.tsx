import HeroImage from "./hero-image";
import HeroContent from "./hero-content";

export default function HeroSection({ active, onExplore }: { active: boolean; onExplore: () => void }) {
  return <section className="home-hero" aria-label="NovaStage" inert={!active} aria-hidden={!active}>
    <HeroImage /><HeroContent onExplore={onExplore} />
  </section>;
}