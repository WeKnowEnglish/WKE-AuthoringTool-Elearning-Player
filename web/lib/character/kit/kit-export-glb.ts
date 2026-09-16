import type { Group } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { downloadTextFile } from "./kit-download";

export async function exportKitGroupToGlb(group: Group, filename: string): Promise<void> {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(group, { binary: true });
  if (!(result instanceof ArrayBuffer)) {
    downloadTextFile(filename.replace(/\.glb$/i, ".gltf"), JSON.stringify(result), "model/gltf+json");
    return;
  }
  const blob = new Blob([result], { type: "model/gltf-binary" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
