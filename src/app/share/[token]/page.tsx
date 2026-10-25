import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedCanvas } from "@/lib/canvas/sharing";
import SharedCanvasViewer from "@/components/canvas/shared-canvas-viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shared canvas | NovaStage",
  description: "Explore a read-only canvas shared with you.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function SharedCanvasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const canvas = await getSharedCanvas(token);
  if (!canvas) notFound();
  return <SharedCanvasViewer nodes={canvas.nodes} edges={canvas.edges} />;
}
