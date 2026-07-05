/**
 * Validates grammar catalog and all registered poster modules.
 *
 * Run from Lesson Player/web:
 *   npm run validate:grammar
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { grammarCatalogSchema } from "../lib/grammar-builder/catalog-schema";
import { loadPosterModuleBySlug } from "../lib/grammar-builder/load-poster-module-by-slug";
import {
  getRegisteredPosterModuleFiles,
  POSTER_JSON_BY_FILE,
} from "../lib/grammar-builder/poster-module-registry";
import { parseGrammarModule } from "../lib/grammar-builder/validate-module";

const CONTENT_DIR = join(process.cwd(), "content/grammar");
const CATALOG_PATH = join(CONTENT_DIR, "catalog.json");

function main() {
  let failed = false;

  const catalogRaw = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const catalogResult = grammarCatalogSchema.safeParse(catalogRaw);
  if (!catalogResult.success) {
    console.error("FAIL catalog.json: invalid catalog schema");
    for (const issue of catalogResult.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const catalog = catalogResult.data;
  console.log(`OK  catalog.json (${catalog.modules.length} modules)`);

  for (const entry of catalog.modules) {
    const filePath = join(CONTENT_DIR, entry.file);
    if (!existsSync(filePath)) {
      failed = true;
      console.error(`FAIL ${entry.slug}: missing file ${entry.file}`);
      continue;
    }

    if (!(entry.file in POSTER_JSON_BY_FILE)) {
      failed = true;
      console.error(
        `FAIL ${entry.slug}: ${entry.file} is not registered in poster-module-registry.ts`,
      );
      continue;
    }

    try {
      const raw = JSON.parse(readFileSync(filePath, "utf8"));
      const module = parseGrammarModule(raw);
      if (entry.status === "published" && module.displayMode !== "poster") {
        throw new Error(`published module must have displayMode: poster`);
      }
      if (entry.difficulty && module.difficulty && entry.difficulty !== module.difficulty) {
        throw new Error(
          `catalog difficulty ${entry.difficulty} != module difficulty ${module.difficulty}`,
        );
      }
      if (entry.status === "published") {
        loadPosterModuleBySlug(entry.slug);
      }
      console.log(`OK  ${entry.slug} (${entry.file})`);
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAIL ${entry.slug}: ${message}`);
    }
  }

  const catalogFiles = new Set(catalog.modules.map((entry) => entry.file));
  const contentJsonFiles = readdirSync(CONTENT_DIR).filter(
    (file) => file.endsWith(".json") && file !== "catalog.json",
  );

  for (const file of contentJsonFiles) {
    if (!catalogFiles.has(file)) {
      failed = true;
      console.error(`FAIL orphan content file not in catalog: ${file}`);
    }
  }

  const registeredFiles = new Set(getRegisteredPosterModuleFiles());
  for (const file of registeredFiles) {
    if (!catalogFiles.has(file)) {
      failed = true;
      console.error(`FAIL registry file not in catalog: ${file}`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

main();
