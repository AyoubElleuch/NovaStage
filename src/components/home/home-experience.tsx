"use client";

import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Menu, X } from "lucide-react";
import { useState } from "react";
import AuthTransitionLink from "./navigation/auth-transition-link";
import PricingSection from "./pricing/pricing-section";
import CanvasSandbox from "./canvas/canvas-sandbox";
import CanvasMcpLaunchForm from "@/components/canvas/canvas-mcp-launch-form";
import { DarkPreviewTheme } from "@/lib/theme-context";
import "./canvas/canvas.css";
import { PrivacyPolicyModal } from "@/components/privacy/privacy-policy-modal";
import { TermsOfServiceModal } from "@/components/terms/terms-of-service-modal";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/protest-strike/400.css";
import "./pricing/pricing.css";
import "./landing.css";

const steps = [
  ["01", "Start with an idea.", "Describe the product, workflow, or infrastructure you want to build."],
  ["02", "Shape the system.", "Generate a visual plan, then refine services, connections, and details on the canvas."],
  ["03", "Build it together.", "Invite your team, claim work, and track progress from the same shared workspace."],
];
const questions = [
  ["What can I create with NovaStage?", "Create software workflows and AWS architecture diagrams, then edit and organize them in a collaborative canvas."],
  ["Can my team work on the same canvas?", "Yes. Invite project members to collaborate in real time, claim work, and follow checkpoints together."],
  ["Can I start for free?", "Yes. The Free plan includes a collaborative canvas and 10 lifetime AI workflow requests. Paid billing is coming after launch."],
];

function CanvasPreview() {
  return <div className="landing-preview" id="live-canvas">
    <div className="landing-canvas-heading"><div><span className="preview-dots"><i/><i/><i/></span><span>INTERACTIVE CANVAS / EDGE COMMERCE</span></div><span>SIMULATED COLLABORATORS</span></div>
    <div className="landing-canvas-frame dark"><DarkPreviewTheme><CanvasSandbox active interactive /></DarkPreviewTheme></div>
  </div>;
}

export default function HomeExperience() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);
  return <div className="landing">
    <header className="landing-header-shell"><div className="landing-header wrap">
      <a className="landing-brand" href="#top" aria-label="NovaStage home"><Image src="/images/logo.svg" alt="NovaStage" width={112} height={44} priority /></a>
      <nav className="landing-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#capabilities">Capabilities</a><a href="#pricing">Pricing</a></nav>
      <div className="landing-header-actions"><AuthTransitionLink href="/login" className="landing-login">Log in</AuthTransitionLink><AuthTransitionLink href="/signup" className="landing-button light">Get started <ArrowUpRight size={15}/></AuthTransitionLink><button className="landing-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button></div>
      {menuOpen && <nav className="landing-mobile-nav" aria-label="Mobile navigation" onClick={() => setMenuOpen(false)}><a href="#how-it-works">How it works</a><a href="#capabilities">Capabilities</a><a href="#pricing">Pricing</a><AuthTransitionLink href="/login">Log in</AuthTransitionLink></nav>}
    </div></header>
    <main id="top">
      <section className="landing-hero wrap"><h1>From first idea<br/>to shared plan.</h1><div className="hero-bottom"><div><p>Design your architecture, map the work, and bring your team together on one canvas.</p><div className="hero-actions"><AuthTransitionLink href="/signup" className="landing-button light">Start building <ArrowUpRight size={15}/></AuthTransitionLink><a href="#how-it-works" className="landing-button outline">See how it works <ArrowDown size={14}/></a></div></div><div className="hero-index"><span>Architecture</span><span>Workflows</span><span>Collaboration</span></div></div><CanvasPreview/><div className="preview-caption"><span>Try it: drag nodes, use the hand tool to pan, and explore the toolbar.</span><a href="#capabilities">Explore the workspace <ArrowRight size={13}/></a></div></section>
      <section id="how-it-works" className="landing-process wrap"><div className="center-heading"><h2>Make the complex feel clear.</h2><p>One workspace to think, plan, and build together.</p></div><div className="process-grid">{steps.map(([number,title,description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section id="capabilities" className="landing-feature"><div className="wrap feature-layout"><div className="feature-copy"><h2>See the whole system. Move the work forward.</h2><p>Go from a brief to a visual plan your whole team can understand. Refine the details as your ideas take shape.</p><ul><li><Check size={15}/> AI-generated workflows and architectures</li><li><Check size={15}/> Editable nodes, services, and connections</li><li><Check size={15}/> Real-time collaboration and checkpoints</li></ul><AuthTransitionLink href="/signup" className="text-link">Create your canvas <ArrowUpRight size={14}/></AuthTransitionLink></div><div className="feature-preview-wrap"><div className="ai-preview" inert aria-label="Illustrative preview of the AI assistant">
        <div className="ai-preview-header"><div><h3>AI assistant</h3><p>Open your AI with a prepared request.</p></div><X size={16}/></div>
        <div className="ai-preview-tabs"><span>Built-in AI</span><span className="active">Your AI</span></div>
        <div className="ai-preview-body"><p>Describe your diagram, then choose an app. Review the prepared message and press Send there. Your model generates a draft here for you to review.</p>
          <CanvasMcpLaunchForm id="landing-ai-mode" mode="aws_architecture" prompt="A scalable commerce platform with an API, database, and storage for product images." busy={false} onModeChange={() => {}} onPromptChange={() => {}} onLaunch={() => {}} />
          <div className="ai-preview-advanced">Advanced: persistent MCP connection <span>⌄</span></div>
        </div>
      </div><p className="ai-preview-caption">A preview of the AI assistant’s Your AI tab.</p></div></div></section>
      <div className="landing-pricing"><PricingSection/></div>
      <section className="landing-faq wrap"><div><h2>A few things worth<br/>knowing.</h2><p>Everything you need to get started with a clearer plan.</p></div><div className="faq-list">{questions.map(([q,a], index) => {
        const open = openQuestions.includes(q);
        return <div className="faq-item" key={q}><h3><button type="button" aria-expanded={open} aria-controls={`faq-answer-${index}`} onClick={() => setOpenQuestions((current) => open ? current.filter((item) => item !== q) : [...current, q])}>{q}<span aria-hidden="true">＋</span></button></h3><div id={`faq-answer-${index}`} className="faq-answer" data-open={open} aria-hidden={!open}><div><p>{a}</p></div></div></div>;
      })}</div></section>
      <section className="landing-close wrap"><div><h2>Your next idea,<br/>ready to take shape.</h2><p>Bring the big picture and the details together.</p></div><AuthTransitionLink href="/signup" className="landing-button light">Get started <ArrowUpRight size={15}/></AuthTransitionLink></section>
    </main>
    <footer className="landing-footer wrap"><div><a className="landing-brand" href="#top"><Image src="/images/logo.svg" alt="NovaStage" width={100} height={40}/></a><p>© {new Date().getFullYear()} NOVASTAGE</p></div><div><nav aria-label="Footer navigation"><a href="#capabilities">Capabilities</a><a href="#pricing">Pricing</a><a href="https://github.com/AyoubElleuch/NovaStage" target="_blank" rel="noreferrer">GitHub</a><button onClick={() => setLegal("privacy")}>Privacy</button><button onClick={() => setLegal("terms")}>Terms</button></nav><p>BUILT FOR PEOPLE WHO BUILD SYSTEMS.</p></div></footer>
    <PrivacyPolicyModal variant="landing" isOpen={legal === "privacy"} onClose={() => setLegal(null)}/><TermsOfServiceModal variant="landing" isOpen={legal === "terms"} onClose={() => setLegal(null)}/>
  </div>;
}
