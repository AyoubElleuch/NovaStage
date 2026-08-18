import Link from "next/link";
import { ArrowLeft, LayoutTemplate, Plus, Share2 } from "lucide-react";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const projectName = slug.replace(/-/g, " ");
  return <div className="admin-page project-detail-page">
    <Link href="/dashboard" className="project-back-link"><ArrowLeft aria-hidden="true" /> Back to projects</Link>
    <header className="project-detail__header"><div><p className="admin-kicker">Project workspace</p><h1 className="admin-page__title">{projectName}</h1><p className="admin-page__description">Your shared planning space is ready for the canvas.</p></div><div className="project-detail__actions"><button type="button" className="admin-button admin-button--light"><Share2 aria-hidden="true" /><span>Share</span></button><button type="button" className="admin-button admin-button--dark"><Plus aria-hidden="true" /><span>Add node</span></button></div></header>
    <section className="project-canvas-preview"><LayoutTemplate aria-hidden="true" /><h2>The canvas comes next</h2><p>We have the project shell in place. The next step is turning this space into your drag-and-drop website planner.</p></section>
  </div>;
}