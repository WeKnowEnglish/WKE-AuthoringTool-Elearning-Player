"use client";

export async function openLiveGameQuestionEncounter(input: {
  roomId: string;
  challengeId: string;
  recipeId?: string;
}) {
  const response = await fetch("/api/live-game/encounter/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Could not open the learning question.");
  }
}
