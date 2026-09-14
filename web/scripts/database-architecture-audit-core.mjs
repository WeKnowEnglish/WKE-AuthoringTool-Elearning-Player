export const REQUIRED_JOURNEYS = Object.freeze([
  "identity",
  "class-membership",
  "homework-finalization",
  "learning-progress",
  "rewards",
  "parent-access",
  "diagnostics",
  "classroom-recovery",
]);

const REQUIRED_ENTRY_FIELDS = Object.freeze([
  "name",
  "kind",
  "owner",
  "sensitivity",
  "authority",
  "migration",
  "access",
  "usage",
]);

const CLIENT_ROLES = new Set(["anon", "authenticated", "public"]);
const POLICY_PRIVILEGES = new Set(["select", "insert", "update", "delete"]);

function issue(code, severity, blocking, subject, message, evidence = {}) {
  return { code, severity, blocking, subject, message, evidence };
}

function normalizedRole(role) {
  return String(role || "").trim().toLowerCase();
}

function objectKey(object) {
  return `${object.schema || "public"}.${object.name}`;
}

function policyAllows(policy, role, privilege) {
  const roles = (policy.roles || []).map(normalizedRole);
  const command = String(policy.command || "all").toLowerCase();
  return (
    (roles.includes("public") || roles.includes(role)) &&
    (command === "all" || command === privilege)
  );
}

function hasLeadingIndex(foreignKey, indexes) {
  const sourceColumns = foreignKey.columns || [];
  if (sourceColumns.length === 0) return false;
  return indexes.some((index) => {
    if (index.schema !== foreignKey.schema || index.table !== foreignKey.table) return false;
    if (index.valid === false) return false;
    const columns = index.columns || [];
    return sourceColumns.every((column, position) => columns[position] === column);
  });
}

function hasFixedSearchPath(fn) {
  return (fn.config || []).some((setting) =>
    String(setting).toLowerCase().startsWith("search_path="),
  );
}

function functionIsClientExecutable(fn, functionGrants) {
  return functionGrants.some(
    (grant) =>
      grant.schema === fn.schema &&
      grant.name === fn.name &&
      normalizedRole(grant.role) &&
      CLIENT_ROLES.has(normalizedRole(grant.role)) &&
      String(grant.privilege || "").toLowerCase() === "execute",
  );
}

export function analyzeSnapshot(snapshot, { criticalObjects = null } = {}) {
  const findings = [];
  const tables = snapshot.tables || [];
  const grants = snapshot.tableGrants || [];
  const policies = snapshot.policies || [];
  const indexes = snapshot.indexes || [];
  const foreignKeys = snapshot.foreignKeys || [];
  const functions = snapshot.functions || [];
  const functionGrants = snapshot.functionGrants || [];

  for (const table of tables.filter(
    (candidate) => candidate.schema === "public" && candidate.kind === "table",
  )) {
    const key = objectKey(table);
    const directGrants = grants.filter(
      (grant) =>
        grant.schema === table.schema &&
        grant.table === table.name &&
        CLIENT_ROLES.has(normalizedRole(grant.role)) &&
        POLICY_PRIVILEGES.has(String(grant.privilege || "").toLowerCase()),
    );
    if (directGrants.length === 0) continue;

    if (!table.rlsEnabled) {
      findings.push(
        issue(
          "client_grant_without_rls",
          "P1",
          true,
          key,
          "A browser-facing role has a data privilege on a public table without row-level security.",
          { grants: directGrants },
        ),
      );
      continue;
    }

    const missingPrivilegesByRole = new Map();
    for (const grant of directGrants) {
      const role = normalizedRole(grant.role);
      const privilege = String(grant.privilege).toLowerCase();
      const applicable = policies.some(
        (policy) =>
          policy.schema === table.schema &&
          policy.table === table.name &&
          policyAllows(policy, role, privilege),
      );
      if (!applicable) {
        const privileges = missingPrivilegesByRole.get(role) || [];
        privileges.push(privilege);
        missingPrivilegesByRole.set(role, privileges);
      }
    }
    if (!criticalObjects || criticalObjects.has(key)) {
      for (const [role, privileges] of missingPrivilegesByRole) {
        const uniquePrivileges = [...new Set(privileges)].sort();
        findings.push(
          issue(
            "grant_without_applicable_policy",
            "P2",
            false,
            key,
            `Role ${role} has ${uniquePrivileges.map((value) => value.toUpperCase()).join(", ")} but no matching policy; this is deny-by-default but may indicate drift.`,
            { role, privileges: uniquePrivileges },
          ),
        );
      }
    }
  }

  for (const foreignKey of foreignKeys) {
    const subject = `${foreignKey.schema}.${foreignKey.table}.${foreignKey.name}`;
    if (foreignKey.validated === false) {
      findings.push(
        issue(
          "unvalidated_foreign_key",
          "P1",
          false,
          subject,
          "The foreign key is not validated, so historical rows may violate the relationship.",
        ),
      );
    }
    if (!hasLeadingIndex(foreignKey, indexes)) {
      findings.push(
        issue(
          "foreign_key_without_leading_index",
          "P2",
          false,
          subject,
          "The foreign-key columns are not the leading columns of a valid index.",
          { columns: foreignKey.columns, references: foreignKey.references },
        ),
      );
    }
  }

  for (const fn of functions) {
    if (
      fn.securityDefiner &&
      functionIsClientExecutable(fn, functionGrants) &&
      !hasFixedSearchPath(fn)
    ) {
      findings.push(
        issue(
          "client_executable_security_definer_without_search_path",
          "P1",
          true,
          objectKey(fn),
          "A client-executable SECURITY DEFINER function does not pin search_path.",
        ),
      );
    }
  }

  return findings;
}

export function validateRegistry(
  registry,
  { snapshot = null, latestMigration = null, pathExists = () => true } = {},
) {
  const findings = [];
  const entries = Array.isArray(registry?.objects) ? registry.objects : [];

  if (!registry || typeof registry !== "object") {
    return [issue("invalid_registry", "P1", true, "registry", "Registry must be an object.")];
  }

  if (latestMigration && registry.reviewedThroughMigration !== latestMigration) {
    findings.push(
      issue(
        "registry_review_is_stale",
        "P1",
        true,
        "registry",
        `Registry is reviewed through ${registry.reviewedThroughMigration || "nothing"}, but the latest migration is ${latestMigration}.`,
      ),
    );
  }

  const seen = new Set();
  const coveredJourneys = new Set();
  for (const entry of entries) {
    const key = `${entry.kind || "unknown"}:${entry.name || "unnamed"}`;
    if (seen.has(key)) {
      findings.push(issue("duplicate_registry_entry", "P1", true, key, "Registry entry is duplicated."));
    }
    seen.add(key);

    for (const field of REQUIRED_ENTRY_FIELDS) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
        findings.push(
          issue("missing_registry_field", "P1", true, key, `Required field ${field} is missing.`),
        );
      }
    }
    if (!Array.isArray(entry.journeys) || entry.journeys.length === 0) {
      findings.push(issue("missing_registry_journey", "P1", true, key, "At least one journey is required."));
    } else {
      entry.journeys.forEach((journey) => coveredJourneys.add(journey));
    }
    if (!Array.isArray(entry.relationships)) {
      findings.push(issue("missing_registry_relationships", "P1", true, key, "Relationships must be an array."));
    }
    if (!Array.isArray(entry.callSites) || entry.callSites.length === 0) {
      findings.push(issue("missing_registry_call_sites", "P1", true, key, "At least one call site is required."));
    } else {
      for (const callSite of entry.callSites) {
        if (!pathExists(callSite)) {
          findings.push(issue("missing_call_site", "P1", true, key, `Call site does not exist: ${callSite}`));
        }
      }
    }
    if (entry.migration && !pathExists(entry.migration)) {
      findings.push(issue("missing_migration", "P1", true, key, `Migration does not exist: ${entry.migration}`));
    }
    if (entry.usage === "unknown") {
      findings.push(
        issue(
          "usage_needs_verification",
          "P3",
          false,
          key,
          "Static evidence is insufficient; usage must be verified before cleanup.",
        ),
      );
    }
  }

  for (const journey of REQUIRED_JOURNEYS) {
    if (!coveredJourneys.has(journey)) {
      findings.push(
        issue("unmapped_required_journey", "P1", true, journey, "Required learning-critical journey is not mapped."),
      );
    }
  }

  if (snapshot) {
    const tables = new Set((snapshot.tables || []).map(objectKey));
    const functions = new Set((snapshot.functions || []).map(objectKey));
    const policyTables = new Set((snapshot.policies || []).map((policy) => `${policy.schema}.${policy.table}`));
    for (const entry of entries) {
      if (entry.kind === "table" && !tables.has(entry.name)) {
        findings.push(issue("registered_object_missing", "P1", true, entry.name, "Registered table is absent from linked metadata."));
      }
      if (entry.kind === "function" && !functions.has(entry.name)) {
        findings.push(issue("registered_object_missing", "P1", true, entry.name, "Registered function is absent from linked metadata."));
      }
      if (entry.kind === "policy-surface" && !policyTables.has(entry.name)) {
        findings.push(issue("registered_policy_surface_missing", "P1", true, entry.name, "Registered policy surface has no linked policies."));
      }
    }
  }

  return findings;
}

export function summarizeSnapshot(snapshot) {
  return {
    tablesAndViews: (snapshot.tables || []).length,
    functions: (snapshot.functions || []).length,
    triggers: (snapshot.triggers || []).length,
    foreignKeys: (snapshot.foreignKeys || []).length,
    indexes: (snapshot.indexes || []).length,
    policies: (snapshot.policies || []).length,
    tableGrants: (snapshot.tableGrants || []).length,
    functionGrants: (snapshot.functionGrants || []).length,
  };
}

export function assertMetadataOnlySql(sql) {
  const withoutComments = String(sql)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ");
  const banned = /\b(insert|update|delete|merge|alter|create|drop|truncate|grant|revoke|call|copy)\b/i;
  if (banned.test(withoutComments)) {
    throw new Error(`Architecture snapshot SQL must be metadata-only; found ${banned.exec(withoutComments)?.[1]}.`);
  }
  if (!/^\s*(with\b|select\b)/i.test(withoutComments)) {
    throw new Error("Architecture snapshot SQL must begin with WITH or SELECT.");
  }
}
