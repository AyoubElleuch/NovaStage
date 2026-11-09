import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedCanvas } from "@/lib/canvas/sharing";
import LiveCanvasEmbed from "@/components/canvas/live-canvas-embed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Canvas | NovaStage",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function CanvasEmbedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const canvas = await getSharedCanvas(token);
  if (!canvas) notFound();
  return <LiveCanvasEmbed token={token} initialCanvas={canvas} />;
}
