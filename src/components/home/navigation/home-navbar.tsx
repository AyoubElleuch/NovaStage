"use client";

import Image from "next/image";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import AuthTransitionLink from "./auth-transition-link";

export default function HomeNavbar({ onExplore, onHome, onFeatures, onPricing }: { onExplore: () => void; onHome: () => void; onFeatures: () => void; onPricing: () => void }) {
  const [open, setOpen] = useState(false);
  return <header className="home-navbar">
    <button type="button" className="home-brand" aria-label="NovaStage home" onClick={() => { setOpen(false); onHome(); }}>
      <Image src="/images/logo.svg" alt="NovaStage" width={110} height={45} priority className="brightness-0 invert" />
    </button>
    <nav className="home-desktop-nav" aria-label="Main navigation">
      <button type="button" onClick={onExplore}>Canvas</button><button type="button" onClick={onFeatures}>Capabilities</button><button type="button" onClick={onPricing}>Pricing</button>
      <a href="https://github.com/AyoubElleuch/NovaStage" target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={12} /></a>
    </nav>
    <div className="home-nav-actions"><AuthTransitionLink href="/login" className="home-login">Log In</AuthTransitionLink>
      <AuthTransitionLink href="/signup" className="home-button home-button-small">Create a canvas<ArrowUpRight size={15} /></AuthTransitionLink>
      <button type="button" className="home-menu-button home-icon-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="home-mobile-nav" onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Menu size={19} />}</button>
    </div>
    <nav id="home-mobile-nav" className="home-mobile-nav" data-state={open ? "open" : "closed"} aria-label="Mobile navigation" aria-hidden={!open} inert={!open}>
      <button type="button" onClick={() => { setOpen(false); onExplore(); }}>Canvas</button>
      <button type="button" onClick={() => { setOpen(false); onFeatures(); }}>Capabilities</button>
      <button type="button" onClick={() => { setOpen(false); onPricing(); }}>Pricing</button>
      <AuthTransitionLink href="/login">Log In</AuthTransitionLink>
      <a href="https://github.com/AyoubElleuch/NovaStage" target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={14} /></a>
    </nav>
  </header>;
}