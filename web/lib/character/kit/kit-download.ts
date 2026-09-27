import type { CharacterKitDocument } from "./kit-types";
import { kitToPrettyJson } from "./kit-storage";

export function downloadTextFile(filename: string, text: string, mime = "application/json"): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadKitJson(kit: CharacterKitDocument): void {
  const safeName = kit.id.replace(/[^a-zA-Z0-9_-]+/g, "-") || "kit";
  downloadTextFile(`${safeName}.wke-kit.json`, kitToPrettyJson(kit));
}
