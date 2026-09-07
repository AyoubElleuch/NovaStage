import CardTopologyEngine from "./cards/card-topology-engine";
import CardMultiplayer from "./cards/card-multiplayer";
import CardAiGenerator from "./cards/card-ai-generator";
import CardSpecsInspector from "./cards/card-specs-inspector";

export default function FeaturesSection() {
  return <section id="capabilities" className="home-features" aria-labelledby="capabilities-title">
    <div className="home-section-heading home-reveal"><h2 id="capabilities-title">One workspace for the<br /><span>decisions that ship software.</span></h2></div>
    <div className="home-feature-grid"><CardAiGenerator /><CardTopologyEngine /><CardMultiplayer /><CardSpecsInspector /></div>
  </section>;
}