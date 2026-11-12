"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import AuthTransitionLink from "../navigation/auth-transition-link";
import PricingSection from "./pricing-section";
import { PrivacyPolicyModal } from "@/components/privacy/privacy-policy-modal";
import { TermsOfServiceModal } from "@/components/terms/terms-of-service-modal";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "./pricing.css";
import "../landing.css";

export default function PricingPageView() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);

  return (
    <div className="landing min-h-screen flex flex-col">
      <header className="landing-header-shell">
        <div className="landing-header wrap">
          <Link className="landing-brand" href="/" aria-label="NovaStage home">
            <Image src="/images/logo.svg" alt="NovaStage" width={112} height={44} priority />
          </Link>
          <nav className="landing-nav" aria-label="Main navigation">
            <Link href="/#live-canvas">Live canvas</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#capabilities">Capabilities</Link>
            <Link href="/pricing" aria-current="page" className="text-white">Pricing</Link>
          </nav>
          <div className="landing-header-actions">
            <AuthTransitionLink href="/login" className="landing-login">Log in</AuthTransitionLink>
            <AuthTransitionLink href="/signup" className="landing-button light">
              Get started <ArrowUpRight size={15} />
            </AuthTransitionLink>
            <button
              type="button"
              className="landing-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          {menuOpen && (
            <nav
              className="landing-mobile-nav"
              aria-label="Mobile navigation"
              onClick={() => setMenuOpen(false)}
            >
              <Link href="/#live-canvas">Live canvas</Link>
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#capabilities">Capabilities</Link>
              <Link href="/pricing" aria-current="page">Pricing</Link>
              <AuthTransitionLink href="/login">Log in</AuthTransitionLink>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1">
        <div className="wrap pt-8">
          <Link href="/#live-canvas" className="text-link inline-flex">
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to interactive demo</span>
          </Link>
        </div>

        <div className="landing-pricing">
          <PricingSection />
        </div>

        <section className="landing-close wrap">
          <div>
            <h2>Want to try the canvas first?</h2>
            <p>Explore the simulated architecture workspace with zero sign-up required.</p>
          </div>
          <Link href="/#live-canvas" className="landing-button outline">
            Open interactive demo <ArrowRight size={15} />
          </Link>
        </section>
      </main>

      <footer className="landing-footer wrap">
        <div>
          <Link className="landing-brand" href="/">
            <Image src="/images/logo.svg" alt="NovaStage" width={100} height={40} />
          </Link>
          <p>&copy; {new Date().getFullYear()} NOVASTAGE</p>
        </div>
        <div>
          <nav aria-label="Footer navigation">
            <Link href="/#capabilities">Capabilities</Link>
            <Link href="/#live-canvas">Live canvas</Link>
            <a href="https://github.com/AyoubElleuch/NovaStage" target="_blank" rel="noreferrer">GitHub</a>
            <button type="button" onClick={() => setLegal("privacy")}>Privacy</button>
            <button type="button" onClick={() => setLegal("terms")}>Terms</button>
          </nav>
          <p>BUILT FOR PEOPLE WHO BUILD SYSTEMS.</p>
        </div>
      </footer>

      <PrivacyPolicyModal variant="landing" isOpen={legal === "privacy"} onClose={() => setLegal(null)} />
      <TermsOfServiceModal variant="landing" isOpen={legal === "terms"} onClose={() => setLegal(null)} />
    </div>
  );
}
