"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PrivacyPolicyModal } from "@/components/privacy/privacy-policy-modal";
import { TermsOfServiceModal } from "@/components/terms/terms-of-service-modal";
import AuthTransitionLink from "../navigation/auth-transition-link";

const buildSteps = [
  { title: "Write the brief", description: "Describe the product, service, or infrastructure you need to build." },
  { title: "Shape the system", description: "Generate a workflow, AWS architecture, or full-stack plan, then edit the graph." },
  { title: "Run the work", description: "Invite collaborators, claim nodes, and move checkpoints from planned to done." },
];

export default function HomeFooter({ onExplore }: { onExplore: () => void }) {
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  return <>
    <section className="home-closing" aria-labelledby="home-closing-title">
      <div className="home-closing-copy">
        <h2 id="home-closing-title">Start with the brief.<br /><span>Ship with a shared plan.</span></h2>
        <div className="home-closing-actions">
          <AuthTransitionLink href="/signup" className="home-button">Create a free project<ArrowUpRight size={18} /></AuthTransitionLink>
          <button type="button" className="home-text-button" onClick={onExplore}>Preview the live canvas<ArrowRight size={17} /></button>
        </div>
      </div>
      <div className="home-closing-process" aria-label="How NovaStage supports a build">
        <ol>
          {buildSteps.map((step, index) => <li className="home-closing-step" key={step.title}><div><h3>{step.title}</h3><p>{step.description}</p></div>{index < buildSteps.length - 1 && <ArrowRight size={17} aria-hidden="true" />}</li>)}
        </ol>
      </div>
    </section>
    <footer className="home-footer"><Image src="/images/logo.svg" alt="NovaStage" width={100} height={41} loading="eager" className="brightness-0 invert" />
      <span>Built for people who build systems.</span><nav aria-label="Legal"><button type="button" onClick={() => setLegal("privacy")}>Privacy</button><button type="button" onClick={() => setLegal("terms")}>Terms</button><a href="https://github.com/AyoubElleuch/NovaStage" target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={12} /></a></nav>
    </footer>
    <PrivacyPolicyModal isOpen={legal === "privacy"} onClose={() => setLegal(null)} /><TermsOfServiceModal isOpen={legal === "terms"} onClose={() => setLegal(null)} />
  </>;
}