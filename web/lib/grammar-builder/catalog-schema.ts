import { z } from "zod";
import { grammarDifficultySchema } from "./schema";

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const grammarJsonFilePattern = /^[a-z0-9-]+\.json$/;

export const grammarCatalogEntrySchema = z
  .object({
    slug: z.string().regex(slugPattern),
    title: z.string().min(1),
    description: z.string().optional(),
    difficulty: grammarDifficultySchema.optional(),
    file: z
      .string()
      .regex(grammarJsonFilePattern)
      .refine((file) => file !== "catalog.json", "catalog.json is not a module file"),
    status: z.enum(["draft", "published"]),
    thumbnailEmoji: z.string().optional(),
    sortOrder: z.number().int().min(1).optional(),
    topicGroup: z.string().min(1).optional(),
    legacyRoutes: z.array(z.string()).optional(),
  })
  .strict();

export const grammarCatalogSchema = z
  .object({
    version: z.literal(1),
    modules: z.array(grammarCatalogEntrySchema).min(1),
  })
  .strict()
  .superRefine((catalog, ctx) => {
    const slugs = new Set<string>();
    const files = new Set<string>();

    catalog.modules.forEach((entry, index) => {
      if (slugs.has(entry.slug)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate catalog slug: ${entry.slug}`,
          path: ["modules", index, "slug"],
        });
      }
      slugs.add(entry.slug);

      if (files.has(entry.file)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate catalog file: ${entry.file}`,
          path: ["modules", index, "file"],
        });
      }
      files.add(entry.file);
    });
  });

export type GrammarCatalogEntry = z.infer<typeof grammarCatalogEntrySchema>;
export type GrammarCatalog = z.infer<typeof grammarCatalogSchema>;

export const QUESTIONS_POSTER_SLUG = "there-is-there-are-questions-a1";
export const AFFIRMATIVE_POSTER_SLUG = "there-is-there-are-affirmative-a1";

/** @deprecated Use QUESTIONS_POSTER_SLUG */
export const PILOT_POSTER_SLUG = QUESTIONS_POSTER_SLUG;
