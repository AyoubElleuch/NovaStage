import { getSharedCanvas } from "@/lib/canvas/sharing";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const canvas = await getSharedCanvas(token);
    return Response.json(canvas ?? { error: "Canvas unavailable" }, { status: canvas ? 200 : 404, headers });
  } catch {
    return Response.json({ error: "Canvas temporarily unavailable" }, { status: 503, headers });
  }
}
