"use client";

import { useEffect } from "react";
import HomeNavbar from "./navigation/home-navbar";
import HeroSection from "./hero/hero-section";
import CanvasScrollStage from "./canvas/canvas-scroll-stage";
import { useScrollChoreography } from "./canvas/use-scroll-choreography";
import WhatsappDoodleBackground from "./background/whatsapp-doodle-background";
import FeaturesSection from "./features/features-section";
import PricingSection from "./pricing/pricing-section";
import HomeFooter from "./footer/home-footer";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist/700.css";
import "@fontsource/protest-strike/400.css";
import "./home.css";
import "./hero/hero.css";
import "./canvas/canvas.css";
import "./features/features.css";
import "./pricing/pricing.css";

export default function HomeExperience() {
  const { phase, busy, revealed, atHero, surfaceRef, begin } = useScrollChoreography();
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const previousTheme = root.getAttribute("data-theme");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    return () => {
      root.classList.toggle("dark", wasDark);
      if (previousTheme) root.setAttribute("data-theme", previousTheme);
      else root.removeAttribute("data-theme");
    };
  }, []);
  useEffect(() => {
    if (!revealed) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".home-reveal"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((target) => { target.dataset.visible = "true"; });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.visible = "true";
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [revealed]);
  const explore = () => begin("forward", () => document.getElementById("live-systems")?.scrollIntoView({ behavior: "smooth" }));
  const features = () => begin("forward", () => document.getElementById("capabilities")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
  const pricing = () => begin("forward", () => document.getElementById("pricing")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));

  return <div ref={surfaceRef} className="novastage-home" data-phase={phase} data-revealed={revealed} aria-busy={busy}>
    <div inert={busy} className="home-interactive-content">
      <HomeNavbar onExplore={explore} onHome={() => begin("reverse")} onFeatures={features} onPricing={pricing} />
      <main>
        <HeroSection active={atHero} onExplore={explore} />
        <div className="home-environment"><WhatsappDoodleBackground /><CanvasScrollStage phase={phase} />
          <div className="home-lower" hidden={!revealed}><FeaturesSection /><PricingSection /><HomeFooter onExplore={explore} /></div>
        </div>
        {!revealed && <button type="button" className="home-canvas-peek" onClick={explore}>Edge commerce<span>Live architecture canvas</span></button>}
      </main>
    </div>
    {busy && <div className="home-interaction-shield" aria-hidden="true" />}
  </div>;
}