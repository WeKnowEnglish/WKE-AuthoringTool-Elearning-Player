"use client";

import { stopSpeaking } from "@/lib/audio/tts";

/** Pause and reset every `<audio>` under `root`. */
function pauseAudioInRoot(root: ParentNode) {
  root.querySelectorAll("audio").forEach((a) => {
    a.pause();
    try {
      a.currentTime = 0;
    } catch {
      /* ignore */
    }
  });
}

/** Cancel Web Animations API animations on `root` and descendants (story paths, page turns, emphasis). */
function cancelAnimationsInRoot(root: ParentNode) {
  const nodes: Element[] = [];
  if (root instanceof Element) nodes.push(root);
  root.querySelectorAll("*").forEach((el) => nodes.push(el));
  for (const el of nodes) {
    if (el instanceof HTMLElement && typeof el.getAnimations === "function") {
      el.getAnimations().forEach((anim) => anim.cancel());
    }
  }
}

/**
 * Stop TTS, recorded/HTML audio, and in-flight CSS/WAAPI animations within a lesson player subtree.
 * Used when tearing down preview or leaving the lesson player.
 */
export function teardownPlaybackInRoot(root: ParentNode | null | undefined) {
  stopSpeaking();
  if (!root) return;
  pauseAudioInRoot(root);
  cancelAnimationsInRoot(root);
}
