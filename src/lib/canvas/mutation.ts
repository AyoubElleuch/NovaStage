/** Canvas endpoints can reject an edit with a successful HTTP status. */
export async function assertCanvasSaved(response: Response): Promise<void> {
  let result: { success?: boolean; error?: string };
  try {
    result = await response.json();
  } catch {
    throw new Error("Unable to save canvas changes. Please try again.");
  }
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "Unable to save canvas changes. Please try again.");
  }
}
