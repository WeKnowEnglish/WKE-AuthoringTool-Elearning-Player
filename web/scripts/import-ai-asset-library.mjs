/**
 * Validate, optimize, classify, and upload an AI image collection to the shared
 * teacher Asset Library. Dry-run is the default; pass --apply to write.
 *
 * Usage (from web/):
 *   npm run assets:import -- --source "C:\\path\\to\\images" --owner-id <teacher-uuid>
 *   npm run assets:import -- --source "C:\\path\\to\\images" --owner-id <teacher-uuid> --apply
 */

import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import {
  buildAssetMetadata,
  collectionSlug,
  displayNameForFile,
  storageFilename,
} from "./asset-library-import-utils.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(SCRIPT_DIR, "..");
const BUCKET = "lesson_media";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_COLLECTION = "school-life-starter-2026-08";
const VALID_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function parseArgs(argv) {
  const valueFor = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const concurrencyRaw = Number.parseInt(valueFor("--concurrency") ?? "3", 10);
  const maxFilesRaw = Number.parseInt(valueFor("--max-files") ?? "0", 10);
  return {
    apply: argv.includes("--apply"),
    source: valueFor("--source") ?? process.env.ASSET_LIBRARY_SOURCE,
    ownerId: valueFor("--owner-id") ?? process.env.ASSET_LIBRARY_OWNER_ID,
    collection: collectionSlug(valueFor("--collection") ?? DEFAULT_COLLECTION),
    concurrency: Number.isFinite(concurrencyRaw) ? Math.min(Math.max(concurrencyRaw, 1), 6) : 3,
    maxFiles: Number.isFinite(maxFilesRaw) ? Math.max(maxFilesRaw, 0) : 0,
    report: valueFor("--report"),
  };
}

function loadEnv() {
  const envPath = path.join(WEB_DIR, ".env.local");
  if (!fs.existsSync(envPath)) throw new Error("Missing web/.env.local");
  const values = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    values[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const url = values.SUPABASE_URL || values.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in web/.env.local");
  return { url, key };
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function dHash(buffer) {
  const { data } = await sharp(buffer)
    .resize(9, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

async function prepareFile(sourceDir, filename, collection, importedOn) {
  const sourcePath = path.join(sourceDir, filename);
  const sourceBuffer = await fs.promises.readFile(sourcePath);
  if (!sourceBuffer.length) throw new Error("empty file");

  const image = sharp(sourceBuffer, { failOn: "error" });
  const [metadata, stats] = await Promise.all([image.metadata(), image.clone().stats()]);
  if (!metadata.width || !metadata.height) throw new Error("image dimensions unavailable");

  const uploadBuffer = await image
    .clone()
    .rotate()
    .webp({ quality: 90, alphaQuality: 100, smartSubsample: true, effort: 5 })
    .toBuffer();
  if (uploadBuffer.length > MAX_UPLOAD_BYTES) throw new Error("optimized image exceeds the 10 MB upload limit");

  return {
    filename,
    sourcePath,
    sourceBytes: sourceBuffer.length,
    uploadBytes: uploadBuffer.length,
    sourceSha256: sha256(sourceBuffer),
    uploadSha256: sha256(uploadBuffer),
    phash: await dHash(uploadBuffer),
    uploadBuffer,
    width: metadata.width,
    height: metadata.height,
    hasAlpha: Boolean(metadata.hasAlpha),
    isOpaque: stats.isOpaque,
    outputFilename: storageFilename(filename),
    metadata: buildAssetMetadata({
      filename,
      collection,
      width: metadata.width,
      height: metadata.height,
      isOpaque: stats.isOpaque,
      importedOn,
    }),
  };
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function fetchExistingAssets(supabase) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("media_assets")
      .select("id,sha256_hash,original_filename,public_url,meta_item_name,meta_categories,meta_tags,meta_alternative_names,meta_notes")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }
  return rows;
}

function mergeUnique(...lists) {
  return [...new Set(lists.flat().filter(Boolean))].sort();
}

async function mergeDuplicateMetadata(supabase, existing, asset) {
  const alternativeNames = mergeUnique(
    existing.meta_alternative_names ?? [],
    asset.metadata.meta_alternative_names,
    existing.meta_item_name !== asset.metadata.meta_item_name ? [asset.metadata.meta_item_name.toLowerCase()] : [],
  );
  const categories = mergeUnique(existing.meta_categories ?? [], asset.metadata.meta_categories);
  const tags = mergeUnique(existing.meta_tags ?? [], asset.metadata.meta_tags);
  const extraNote = existing.original_filename !== asset.filename ? ` Also provided as source file: ${asset.filename}.` : "";
  const notes = `${existing.meta_notes ?? ""}${extraNote}`.trim().slice(0, 500) || null;
  const importerOwnedMetadata = (existing.meta_notes ?? "").includes(
    "AI-generated illustration imported from the WKE Image Library.",
  );
  const itemName = importerOwnedMetadata
    ? asset.metadata.meta_item_name
    : existing.meta_item_name;
  const changed =
    itemName !== existing.meta_item_name ||
    JSON.stringify(alternativeNames) !== JSON.stringify([...(existing.meta_alternative_names ?? [])].sort()) ||
    JSON.stringify(categories) !== JSON.stringify([...(existing.meta_categories ?? [])].sort()) ||
    JSON.stringify(tags) !== JSON.stringify([...(existing.meta_tags ?? [])].sort()) ||
    notes !== (existing.meta_notes ?? null);
  if (!changed) return false;

  const { error } = await supabase
    .from("media_assets")
    .update({
      meta_item_name: itemName,
      meta_alternative_names: alternativeNames,
      meta_categories: categories,
      meta_tags: tags,
      meta_notes: notes,
    })
    .eq("id", existing.id);
  if (error) throw new Error(`duplicate metadata merge: ${error.message}`);
  return true;
}

async function uploadPrepared(supabase, ownerId, collection, asset) {
  const storagePath = `${ownerId}/ai-library/${collection}/${randomUUID()}-${asset.outputFilename}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, asset.uploadBuffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError) throw new Error(`storage upload: ${uploadError.message}`);

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const { data: row, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      storage_path: storagePath,
      public_url: publicData.publicUrl,
      original_filename: asset.filename.slice(0, 255),
      content_type: "image/webp",
      uploaded_by: ownerId,
      sha256_hash: asset.uploadSha256,
      phash: asset.phash,
      ...asset.metadata,
    })
    .select("id,public_url")
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`catalog insert (uploaded object rolled back): ${insertError.message}`);
  }
  return { id: row.id, publicUrl: row.public_url, storagePath };
}

function reportRow(asset) {
  return {
    filename: asset.filename,
    displayName: asset.metadata.meta_item_name,
    sourceBytes: asset.sourceBytes,
    uploadBytes: asset.uploadBytes,
    width: asset.width,
    height: asset.height,
    transparent: !asset.isOpaque,
    categories: asset.metadata.meta_categories,
    tags: asset.metadata.meta_tags,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.source) throw new Error("Pass --source <image-directory> (or set ASSET_LIBRARY_SOURCE)");
  if (!options.ownerId) throw new Error("Pass --owner-id <teacher-uuid> (or set ASSET_LIBRARY_OWNER_ID)");
  const sourceDir = path.resolve(options.source);
  const stat = await fs.promises.stat(sourceDir).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`Source directory not found: ${sourceDir}`);

  const importedOn = new Date().toISOString().slice(0, 10);
  const allEntries = await fs.promises.readdir(sourceDir, { withFileTypes: true });
  const unsupported = allEntries
    .filter((entry) => entry.isFile() && !VALID_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort();
  let filenames = allEntries
    .filter((entry) => entry.isFile() && VALID_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  if (options.maxFiles > 0) filenames = filenames.slice(0, options.maxFiles);

  const { url, key } = loadEnv();
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(options.ownerId);
  if (ownerError) throw ownerError;
  if (!ownerData.user || ownerData.user.app_metadata?.role !== "teacher") {
    throw new Error(`Owner ${options.ownerId} is not a teacher account`);
  }

  console.log(`${options.apply ? "IMPORT" : "DRY RUN"}: ${filenames.length} supported files from ${sourceDir}`);
  console.log(`Collection: ${options.collection}; owner: ${ownerData.user.email ?? options.ownerId}`);

  const invalid = [];
  const prepared = (
    await mapPool(filenames, options.concurrency, async (filename, index) => {
      try {
        const asset = await prepareFile(sourceDir, filename, options.collection, importedOn);
        console.log(`[${index + 1}/${filenames.length}] prepared ${filename} -> ${asset.outputFilename}`);
        return asset;
      } catch (error) {
        invalid.push({ filename, error: error instanceof Error ? error.message : String(error) });
        console.warn(`[${index + 1}/${filenames.length}] SKIP ${filename}: ${invalid.at(-1).error}`);
        return null;
      }
    })
  ).filter(Boolean);

  const existing = await fetchExistingAssets(supabase);
  const existingByHash = new Map(existing.filter((row) => row.sha256_hash).map((row) => [row.sha256_hash, row]));
  const localHashes = new Map();
  const ready = [];
  const duplicates = [];
  const duplicateWork = [];
  for (const asset of prepared) {
    const remote = existingByHash.get(asset.sourceSha256) ?? existingByHash.get(asset.uploadSha256);
    const local = localHashes.get(asset.sourceSha256) ?? localHashes.get(asset.uploadSha256);
    if (remote) {
      duplicates.push({ filename: asset.filename, kind: "existing-library", existingId: remote.id, publicUrl: remote.public_url });
      duplicateWork.push({ asset, remote });
      continue;
    }
    if (local) {
      duplicates.push({ filename: asset.filename, kind: "within-source", sameAs: local.filename });
      local.metadata.meta_alternative_names = mergeUnique(
        local.metadata.meta_alternative_names,
        asset.metadata.meta_alternative_names,
        [asset.metadata.meta_item_name.toLowerCase()],
      );
      local.metadata.meta_categories = mergeUnique(local.metadata.meta_categories, asset.metadata.meta_categories);
      local.metadata.meta_tags = mergeUnique(local.metadata.meta_tags, asset.metadata.meta_tags);
      local.metadata.meta_notes = `${local.metadata.meta_notes} Also provided as source file: ${asset.filename}.`.slice(0, 500);
      continue;
    }
    localHashes.set(asset.sourceSha256, asset);
    localHashes.set(asset.uploadSha256, asset);
    ready.push(asset);
  }

  const results = [];
  if (options.apply) {
    await mapPool(duplicateWork, options.concurrency, async ({ asset, remote }) => {
      try {
        const metadataMerged = await mergeDuplicateMetadata(supabase, remote, asset);
        results.push({
          filename: asset.filename,
          status: "duplicate-reused",
          id: remote.id,
          publicUrl: remote.public_url,
          metadataMerged,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ filename: asset.filename, status: "failed", error: message });
        console.error(`FAIL duplicate reuse ${asset.filename}: ${message}`);
      }
    });
    await mapPool(ready, options.concurrency, async (asset, index) => {
      try {
        const uploaded = await uploadPrepared(supabase, options.ownerId, options.collection, asset);
        results.push({ filename: asset.filename, status: "uploaded", ...uploaded });
        console.log(`[${index + 1}/${ready.length}] uploaded ${displayNameForFile(asset.filename)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ filename: asset.filename, status: "failed", error: message });
        console.error(`[${index + 1}/${ready.length}] FAIL ${asset.filename}: ${message}`);
      }
    });
  }

  const totalSourceBytes = prepared.reduce((sum, asset) => sum + asset.sourceBytes, 0);
  const totalUploadBytes = prepared.reduce((sum, asset) => sum + asset.uploadBytes, 0);
  const summary = {
    mode: options.apply ? "apply" : "dry-run",
    source: sourceDir,
    collection: options.collection,
    ownerId: options.ownerId,
    scanned: filenames.length + unsupported.length,
    prepared: prepared.length,
    invalid: invalid.length,
    unsupported: unsupported.length,
    duplicates: duplicates.length,
    ready: ready.length,
    uploaded: results.filter((row) => row.status === "uploaded").length,
    reused: results.filter((row) => row.status === "duplicate-reused").length,
    failed: results.filter((row) => row.status === "failed").length,
    sourceMegabytes: Number((totalSourceBytes / 1024 / 1024).toFixed(2)),
    optimizedMegabytes: Number((totalUploadBytes / 1024 / 1024).toFixed(2)),
    reductionPercent: totalSourceBytes ? Math.round(100 * (1 - totalUploadBytes / totalSourceBytes)) : 0,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    invalid,
    unsupported,
    duplicates,
    results,
    assets: prepared.map(reportRow),
  };

  if (options.report) {
    const reportPath = path.resolve(options.report);
    await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.promises.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Report: ${reportPath}`);
  }

  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
