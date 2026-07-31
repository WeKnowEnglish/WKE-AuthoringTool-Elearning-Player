import { parseWkeActivity } from "@/lib/wke-activity";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity/to-lesson-screen";
import {
  countLocalHotspotMedia,
  publishLocalHotspotMedia,
} from "@/lib/hotspots/publish-media";
import { resolveExploreHotspotsMediaUrls } from "@/lib/hotspots/resolve-media-asset-urls";
import type { ExploreHotspotsDocument } from "@/lib/hotspots/types";

export type StudioExploreHotspotsRef = {
  id: string;
  name: string;
  updatedAt: string;
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "explore-hotspots"
  );
}

/**
 * Walk all on-tap action sequences in all hotspot elements and rename any
 * duplicate action IDs. Activities saved with the old counter-based ID scheme
 * (`action-${hotspotId}-${actions.length + 1}`) produced collisions after
 * delete + re-add. This migration fixes them transparently on load.
 */
function deduplicateActionIds(doc: ExploreHotspotsDocument): ExploreHotspotsDocument {
  const seenIds = new Set<string>();
  let dirty = false;

  const elements = doc.layout.elements.map((el) => {
    if (el.kind !== "hotspot") return el;
    const onTap = el.onTap;
    if (!Array.isArray(onTap) || onTap.length === 0) return el;

    const fixedActions = onTap.map((action) => {
      if (!seenIds.has(action.id)) {
        seenIds.add(action.id);
        return action;
      }
      dirty = true;
      const newId = `${action.id}-${Math.random().toString(36).slice(2, 7)}`;
      seenIds.add(newId);
      return { ...action, id: newId };
    });

    return { ...el, onTap: fixedActions };
  });

  if (!dirty) return doc;
  return { ...doc, layout: { ...doc.layout, elements } };
}

export function validateExploreHotspotsDocument(
  raw: unknown,
): ExploreHotspotsDocument {
  const doc = parseWkeActivity(raw) as ExploreHotspotsDocument;
  return deduplicateActionIds(doc);
}

export async function listStudioExploreHotspots(): Promise<StudioExploreHotspotsRef[]> {
  const response = await fetch("/api/studio/activities?format=explore_hotspots&limit=100", {
    method: "GET",
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    activities?: Array<{ id: string; title: string; updated_at: string }>;
    error?: string;
  } | null;
  if (!response.ok || !payload?.ok || !Array.isArray(payload.activities)) {
    throw new Error(
      payload?.error ||
        `Could not list hotspot activities (${response.status}). Are you signed in as a teacher?`,
    );
  }
  return payload.activities.map((row) => ({
    id: row.id,
    name: row.title,
    updatedAt: row.updated_at,
  }));
}

export async function getStudioExploreHotspots(
  activityId: string,
): Promise<{ id: string; document: ExploreHotspotsDocument }> {
  // Skip pack — authoring is enough for the workspace and avoids duplicating large media.
  const response = await fetch(
    `/api/studio/activities/${encodeURIComponent(activityId)}?include_pack=0`,
    {
      method: "GET",
      credentials: "same-origin",
    },
  );
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    id?: string;
    format?: string;
    authoring?: unknown;
    error?: string;
  } | null;
  if (!response.ok || !payload?.ok || !payload.id) {
    throw new Error(payload?.error || `Could not load hotspot activity (${response.status}).`);
  }
  if (payload.format && payload.format !== "explore_hotspots") {
    throw new Error("That Activity Bank item is not an explore-hotspots activity.");
  }
  return {
    id: payload.id,
    document: validateExploreHotspotsDocument(payload.authoring),
  };
}

export async function saveExploreHotspotsToStudio(input: {
  activityId: string | null;
  document: ExploreHotspotsDocument;
}): Promise<StudioExploreHotspotsRef> {
  let document = validateExploreHotspotsDocument(input.document);

  if (countLocalHotspotMedia(document) > 0) {
    document = validateExploreHotspotsDocument(await publishLocalHotspotMedia(document));
    if (countLocalHotspotMedia(document) > 0) {
      throw new Error(
        "Could not upload all images. Check you’re signed in, then try Save again.",
      );
    }
  }

  document = validateExploreHotspotsDocument(
    await resolveExploreHotspotsMediaUrls(document),
  );

  const pack = wkeActivityToExploreHotspotsPayload(document);
  const response = await fetch("/api/studio/activities", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: input.activityId,
      format: "explore_hotspots",
      pack,
      authoring: document,
      title: document.name,
      filename: `${slugify(document.name)}.wkeactivity.json`,
      source: { via: "explore_hotspots_workspace" },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    id?: string;
    title?: string;
    created_at?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.ok || !payload.id) {
    throw new Error(
      payload?.error ||
        `Could not save hotspot activity (${response.status}). Apply migration 075 if explore_hotspots is rejected.`,
    );
  }

  return {
    id: payload.id,
    name: payload.title || document.name,
    updatedAt: payload.created_at || new Date().toISOString(),
  };
}

export function downloadExploreHotspotsJson(document: ExploreHotspotsDocument) {
  const valid = validateExploreHotspotsDocument(document);
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(valid, null, 2)}\n`], { type: "application/json" }),
  );
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(valid.name)}.wkeactivity.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
