import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const migrationsDir = join(projectDir, "supabase", "migrations");
const cliScriptPath = join(
  projectDir,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const cleanIdentifier = (value) => value.replaceAll('"', "").trim();
const qualified = (schema, name) =>
  `${cleanIdentifier(schema || "public")}.${cleanIdentifier(name)}`;

const customChecks = new Map([
  [
    "002_grants_anon_authenticated.sql",
    {
      label: "API grants for the initial learning tables",
      expression:
        "has_table_privilege('anon', 'public.modules', 'SELECT') " +
        "and has_table_privilege('authenticated', 'public.modules', 'SELECT,INSERT,UPDATE,DELETE') " +
        "and has_table_privilege('authenticated', 'public.student_lesson_progress', 'SELECT,INSERT,UPDATE,DELETE')",
    },
  ],
  [
    "003_seed_grade3_lesson1.sql",
    {
      label: "Grade 3 hello-school seed module",
      optional: true,
      expression:
        "exists (select 1 from public.modules where slug = 'g3-hello-school')",
    },
  ],
  [
    "004_grade3_four_modules_curriculum.sql",
    {
      label: "Grade 3 curriculum module seeds",
      optional: true,
      expression:
        "(select count(*) from public.modules where slug in ('g3-numbers-colors', 'g3-my-day', 'g3-my-family')) = 3",
    },
  ],
  [
    "007_seed_listen_color_write_activity.sql",
    {
      label: "listen_color_write demo activity",
      optional: true,
      expression:
        "exists (select 1 from public.lesson_screens where payload ->> 'subtype' = 'listen_color_write')",
    },
  ],
  [
    "008_seed_four_new_activities.sql",
    {
      label: "four seeded interaction subtypes",
      optional: true,
      expression:
        "(select count(distinct payload ->> 'subtype') from public.lesson_screens " +
        "where payload ->> 'subtype' in ('letter_mixup', 'word_shape_hunt', 'table_complete', 'sorting_game')) = 4",
    },
  ],
  [
    "019_presentation_to_story_note.sql",
    {
      label: "intentional documentation-only migration",
      expression: "true",
    },
  ],
  [
    "023_seed_explore_demo.sql",
    {
      label: "explore demo activity",
      optional: true,
      expression:
        "exists (select 1 from public.lesson_screens where payload ->> 'subtype' = 'explore')",
    },
  ],
  [
    "025_evidence_id_text.sql",
    {
      label: "student_learning_evidence.id uses text",
      expression:
        "exists (select 1 from information_schema.columns where table_schema = 'public' " +
        "and table_name = 'student_learning_evidence' and column_name = 'id' and data_type = 'text')",
    },
  ],
  [
    "036_seed_live_game_question_sets.sql",
    {
      label: "system live-game question-set seed",
      optional: true,
      expression:
        "exists (select 1 from public.live_game_question_sets where slug = 'grade56-adjectives')",
    },
  ],
  [
    "039_secure_live_game_question_access.sql",
    {
      label: "teacher-only published question-set policy",
      expression:
        "exists (select 1 from pg_policies where schemaname = 'public' " +
        "and tablename = 'live_game_question_sets' " +
        "and policyname = 'live_game_question_sets_published_select' " +
        "and qual ilike '%app_metadata%' and qual ilike '%teacher%')",
    },
  ],
  [
    "124_teacher_space_items_formats.sql",
    {
      label: "teacher-space format constraint includes picture_story",
      expression:
        "exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid " +
        "join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' " +
        "and t.relname = 'teacher_space_items' and c.conname = 'teacher_space_items_format_check' " +
        "and pg_get_constraintdef(c.oid) ilike '%picture_story%')",
    },
  ],
  [
    "136_guard_legacy_homework_rewards.sql",
    {
      label: "legacy homework replay reward guard",
      expression:
        "exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace " +
        "where n.nspname = 'public' and p.proname = 'complete_primary_homework' " +
        "and pg_get_functiondef(p.oid) ilike '%if not v_was_completed%')",
    },
  ],
  [
    "138_word_list_quiz_formats.sql",
    {
      label: "wordsearch/crossword/memory format constraints",
      expression:
        "(select count(*) from pg_constraint c join pg_class t on t.oid = c.conrelid " +
        "join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' " +
        "and (t.relname, c.conname) in " +
        "(('studio_activities', 'studio_activities_format_check'), " +
        "('teacher_space_items', 'teacher_space_items_format_check'), " +
        "('wke_library_items', 'wke_library_items_format_check')) " +
        "and pg_get_constraintdef(c.oid) ilike '%wordsearch%' " +
        "and pg_get_constraintdef(c.oid) ilike '%crossword%' " +
        "and pg_get_constraintdef(c.oid) ilike '%memory%') = 3",
    },
  ],
  [
    "140_homework_collection_speaking_recordings.sql",
    {
      label: "homework collection speaking recordings table and policies",
      expression:
        "to_regclass('public.homework_collection_speaking_recordings') is not null " +
        "and exists (select 1 from pg_policies where schemaname = 'public' " +
        "and tablename = 'homework_collection_speaking_recordings' " +
        "and policyname = 'homework_collection_speaking_teacher_select') " +
        "and exists (select 1 from pg_policies where schemaname = 'storage' " +
        "and tablename = 'objects' and policyname = 'homework_collection_voice_teacher_read')",
    },
  ],
  [
    "141_student_course_session_runs.sql",
    {
      label: "student course session runs table and student-owned policies",
      expression:
        "to_regclass('public.student_course_session_runs') is not null " +
        "and (select count(*) from pg_policies where schemaname = 'public' " +
        "and tablename = 'student_course_session_runs' " +
        "and policyname in ('student_course_session_runs_student_select', " +
        "'student_course_session_runs_student_insert', " +
        "'student_course_session_runs_student_update')) = 3",
    },
  ],
  [
    "142_homework_collection_media.sql",
    {
      label: "homework collection media table, policies, and private bucket",
      expression:
        "to_regclass('public.homework_collection_media') is not null " +
        "and exists (select 1 from storage.buckets where id = 'homework_media') " +
        "and (select count(*) from pg_policies where schemaname = 'public' " +
        "and tablename = 'homework_collection_media' " +
        "and policyname in ('homework_collection_media_student_select', " +
        "'homework_collection_media_teacher_select')) = 2",
    },
  ],
]);

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--.*$/gm, " ");
}

function unique(values) {
  return [...new Set(values)];
}

function collectMatches(sql, pattern, mapper) {
  return unique([...sql.matchAll(pattern)].map(mapper));
}

function objectChecks(sql) {
  const tables = collectMatches(
    sql,
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:([a-z_][a-z0-9_]*|"[^"]+")\.)?([a-z_][a-z0-9_]*|"[^"]+")/gi,
    (match) => qualified(match[1], match[2]),
  );
  const functions = collectMatches(
    sql,
    /create\s+(?:or\s+replace\s+)?function\s+(?:([a-z_][a-z0-9_]*|"[^"]+")\.)?([a-z_][a-z0-9_]*|"[^"]+")/gi,
    (match) => qualified(match[1], match[2]),
  );

  const columns = [];
  for (const alter of sql.matchAll(
    /alter\s+table\s+(?:only\s+)?(?:([a-z_][a-z0-9_]*|"[^"]+")\.)?([a-z_][a-z0-9_]*|"[^"]+")([\s\S]*?);/gi,
  )) {
    const table = qualified(alter[1], alter[2]);
    for (const column of alter[3].matchAll(
      /add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*|"[^"]+")/gi,
    )) {
      columns.push(`${table}.${cleanIdentifier(column[1])}`);
    }
  }

  const stableExpressions = [
    ...tables.map((table) => `to_regclass(${sqlLiteral(table)}) is not null`),
    ...functions.map((fn) => {
      const [schema, name] = fn.split(".");
      return (
        "exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace " +
        `where n.nspname = ${sqlLiteral(schema)} and p.proname = ${sqlLiteral(name)})`
      );
    }),
    ...unique(columns).map((column) => {
      const [schema, table, name] = column.split(".");
      return (
        "exists (select 1 from information_schema.columns " +
        `where table_schema = ${sqlLiteral(schema)} and table_name = ${sqlLiteral(table)} ` +
        `and column_name = ${sqlLiteral(name)})`
      );
    }),
  ];
  if (stableExpressions.length > 0) {
    return {
      expression: stableExpressions.join(" and "),
      label: `${tables.length} table(s), ${functions.length} function(s), ${unique(columns).length} added column(s)`,
    };
  }

  const indexes = collectMatches(
    sql,
    /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(?:([a-z_][a-z0-9_]*|"[^"]+")\.)?([a-z_][a-z0-9_]*|"[^"]+")/gi,
    (match) => qualified(match[1], match[2]),
  );
  if (indexes.length > 0) {
    return {
      expression: indexes
        .map((index) => `to_regclass(${sqlLiteral(index)}) is not null`)
        .join(" and "),
      label: `${indexes.length} index(es)`,
    };
  }

  const constraints = [];
  for (const alter of sql.matchAll(
    /alter\s+table\s+(?:only\s+)?(?:([a-z_][a-z0-9_]*|"[^"]+")\.)?([a-z_][a-z0-9_]*|"[^"]+")([\s\S]*?);/gi,
  )) {
    const [schema, table] = qualified(alter[1], alter[2]).split(".");
    for (const constraint of alter[3].matchAll(
      /add\s+constraint\s+([a-z_][a-z0-9_]*|"[^"]+")/gi,
    )) {
      constraints.push({ schema, table, name: cleanIdentifier(constraint[1]) });
    }
  }
  if (constraints.length > 0) {
    return {
      expression: constraints
        .map(
          ({ schema, table, name }) =>
            "exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid " +
            "join pg_namespace n on n.oid = t.relnamespace " +
            `where n.nspname = ${sqlLiteral(schema)} and t.relname = ${sqlLiteral(table)} ` +
            `and c.conname = ${sqlLiteral(name)})`,
        )
        .join(" and "),
      label: `${constraints.length} constraint(s)`,
    };
  }

  const policies = [
    ...sql.matchAll(
      /create\s+policy\s+(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s+on\s+(?:([a-z_][a-z0-9_]*|"[^"]+")\.)?([a-z_][a-z0-9_]*|"[^"]+")/gi,
    ),
  ].map((match) => ({
    name: match[1] || match[2],
    schema: cleanIdentifier(match[3] || "public"),
    table: cleanIdentifier(match[4]),
  }));
  if (policies.length > 0) {
    return {
      expression: policies
        .map(
          ({ schema, table, name }) =>
            "exists (select 1 from pg_policies " +
            `where schemaname = ${sqlLiteral(schema)} and tablename = ${sqlLiteral(table)} ` +
            `and policyname = ${sqlLiteral(name)})`,
        )
        .join(" and "),
      label: `${policies.length} policy/policies`,
    };
  }

  const triggers = [
    ...sql.matchAll(
      /create\s+trigger\s+([a-z_][a-z0-9_]*|"[^"]+")[\s\S]*?\s+on\s+(?:([a-z_][a-z0-9_]*|"[^"]+")\.)?([a-z_][a-z0-9_]*|"[^"]+")/gi,
    ),
  ].map((match) => ({
    name: cleanIdentifier(match[1]),
    schema: cleanIdentifier(match[2] || "public"),
    table: cleanIdentifier(match[3]),
  }));
  if (triggers.length > 0) {
    return {
      expression: triggers
        .map(
          ({ schema, table, name }) =>
            "exists (select 1 from pg_trigger g join pg_class t on t.oid = g.tgrelid " +
            "join pg_namespace n on n.oid = t.relnamespace " +
            `where n.nspname = ${sqlLiteral(schema)} and t.relname = ${sqlLiteral(table)} ` +
            `and g.tgname = ${sqlLiteral(name)} and not g.tgisinternal)`,
        )
        .join(" and "),
      label: `${triggers.length} trigger(s)`,
    };
  }

  throw new Error("No auditable marker found");
}

const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

const versionGroups = new Map();
const checks = migrationFiles.map((file) => {
  const version = file.split("_", 1)[0];
  versionGroups.set(version, [...(versionGroups.get(version) || []), file]);
  const custom = customChecks.get(file);
  if (custom) return { file, version, ...custom };

  const sql = stripComments(readFileSync(join(migrationsDir, file), "utf8"));
  try {
    return { file, version, ...objectChecks(sql) };
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
});

const values = checks
  .map(
    ({ file, version, label, expression, optional = false }) =>
      `(${sqlLiteral(file)}, ${sqlLiteral(version)}, ${sqlLiteral(label)}, ${optional ? "false" : "true"}, (${expression}))`,
  )
  .join(",\n");
const auditSql = `
with checks(file_name, version, expected_state, required, present) as (
  values
${values}
)
select file_name,
       version,
       expected_state,
       case when present then 'PASS' when required then 'MISSING' else 'OPTIONAL_MISSING' end as status
from checks
order by file_name;
`;

const tempDir = mkdtempSync(join(tmpdir(), "wke-supabase-audit-"));
const auditPath = join(tempDir, "audit.sql");
writeFileSync(auditPath, auditSql, "utf8");

try {
  const result = spawnSync(
    process.execPath,
    [
      cliScriptPath,
      "db",
      "query",
      "--linked",
      "--file",
      auditPath,
      "--output",
      "json",
    ],
    { cwd: projectDir, encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0) {
    process.stderr.write(
      result.stderr ||
        result.stdout ||
        result.error?.message ||
        "Supabase audit query failed.\n",
    );
    process.exit(result.status || 1);
  }

  const jsonStart = result.stdout.indexOf("{");
  if (jsonStart < 0) throw new Error("Supabase CLI returned no JSON result.");
  const payload = JSON.parse(result.stdout.slice(jsonStart));
  const rows = payload.rows || [];
  const missing = rows.filter((row) => row.status === "MISSING");
  const optionalMissing = rows.filter(
    (row) => row.status === "OPTIONAL_MISSING",
  );
  const duplicateVersions = [...versionGroups.entries()].filter(
    ([, files]) => files.length > 1,
  );

  console.log(
    `Checked ${rows.length} migration files across ${versionGroups.size} unique versions.`,
  );
  if (duplicateVersions.length > 0) {
    console.log("Duplicate legacy versions:");
    for (const [version, files] of duplicateVersions) {
      console.log(`  ${version}: ${files.join(", ")}`);
    }
  }

  if (optionalMissing.length > 0) {
    console.warn(
      `\n${optionalMissing.length} optional legacy seed check(s) are absent:`,
    );
    for (const row of optionalMissing) {
      console.warn(`  ${row.file_name}: ${row.expected_state}`);
    }
  }

  if (missing.length > 0) {
    console.error(
      `\n${missing.length} migration check(s) are missing from the linked schema:`,
    );
    for (const row of missing) {
      console.error(`  ${row.file_name}: ${row.expected_state}`);
    }
    process.exit(1);
  }

  console.log(
    "All migration baseline checks passed against the linked database.",
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
