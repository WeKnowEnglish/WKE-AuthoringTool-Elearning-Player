import { createHash, randomBytes } from "node:crypto";

const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function normalizedBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("CONTROL_PLANE_SUPABASE_URL must use HTTPS outside local development.");
  }
  return url.origin;
}

function filteredMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/token|secret|password|authorization|cookie|key/i.test(key)) continue;
    result[key] = entry;
  }
  return result;
}

export function hashSecurityContext(value) {
  return value ? sha256(value) : null;
}

export function readControlStoreConfig(environment = process.env) {
  const url = environment.CONTROL_PLANE_SUPABASE_URL?.trim();
  const serviceRoleKey = environment.CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missing = [];
  if (!url) missing.push("CONTROL_PLANE_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY");
  return {
    configured: missing.length === 0,
    missing,
    config: { url, serviceRoleKey },
  };
}

export function createControlStore({ url, serviceRoleKey, fetchImpl = fetch, now = () => Date.now() }) {
  if (!url || !serviceRoleKey) throw new Error("Control-plane database is not configured.");
  const baseUrl = normalizedBaseUrl(url);

  async function request(resource, { method = "GET", query = "", body, prefer } = {}) {
    const response = await fetchImpl(`${baseUrl}/rest/v1/${resource}${query ? `?${query}` : ""}`, {
      method,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Control-plane database request failed (${response.status}): ${detail}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function upsertGitHubUser(profile, role) {
    const rows = await request("deploy_users", {
      method: "POST",
      query: "on_conflict=github_user_id&select=id,github_user_id,github_login,display_name,avatar_url,status,global_role",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        github_user_id: profile.id,
        github_login: profile.login,
        display_name: profile.name || profile.login,
        avatar_url: profile.avatar_url || null,
        global_role: role,
        status: "active",
        last_login_at: new Date(now()).toISOString(),
        updated_at: new Date(now()).toISOString(),
      },
    });
    return rows?.[0] || null;
  }

  async function createSession(userId, context = {}) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = sha256(token);
    const expiresAt = new Date(now() + SESSION_LIFETIME_SECONDS * 1_000).toISOString();
    await request("deploy_sessions", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        token_hash: tokenHash,
        user_id: userId,
        expires_at: expiresAt,
        ip_hash: hashSecurityContext(context.ip),
        user_agent_hash: hashSecurityContext(context.userAgent),
      },
    });
    return { token, expiresAt, maxAge: SESSION_LIFETIME_SECONDS };
  }

  async function getSession(token, context = {}) {
    if (!token) return null;
    const sessionRows = await request("deploy_sessions", {
      query: `token_hash=eq.${sha256(token)}&select=user_id,expires_at,revoked_at,user_agent_hash&limit=1`,
    });
    const session = sessionRows?.[0];
    if (!session || session.revoked_at || Date.parse(session.expires_at) <= now()) return null;
    if (
      session.user_agent_hash &&
      context.userAgent &&
      session.user_agent_hash !== hashSecurityContext(context.userAgent)
    ) return null;
    const userRows = await request("deploy_users", {
      query: `id=eq.${encodeURIComponent(session.user_id)}&select=id,github_user_id,github_login,display_name,avatar_url,status,global_role&limit=1`,
    });
    const user = userRows?.[0];
    if (!user || user.status !== "active") return null;
    return {
      id: user.id,
      login: user.github_login,
      displayName: user.display_name || user.github_login,
      avatarUrl: user.avatar_url || null,
      role: user.global_role,
      authMethod: "github",
      expiresAt: session.expires_at,
    };
  }

  async function revokeSession(token) {
    if (!token) return;
    await request("deploy_sessions", {
      method: "PATCH",
      query: `token_hash=eq.${sha256(token)}&revoked_at=is.null`,
      prefer: "return=minimal",
      body: { revoked_at: new Date(now()).toISOString() },
    });
  }

  async function appendAuditEvent(event) {
    await request("deploy_audit_events", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        organization_id: event.organizationId || null,
        project_id: event.projectId || null,
        actor_user_id: event.actorUserId || null,
        actor_login: event.actorLogin || "system",
        event: event.name,
        outcome: event.outcome || "observed",
        source_ip_hash: hashSecurityContext(event.ip),
        user_agent_hash: hashSecurityContext(event.userAgent),
        metadata: filteredMetadata(event.metadata),
      },
    });
  }

  async function upsertCredential(record) {
    const rows = await request("deploy_credentials", {
      method: "POST",
      query: "on_conflict=organization_id,project_id,kind,label&select=id,organization_id,project_id,kind,label,key_version,expires_at,last_rotated_at",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        organization_id: record.organizationId,
        project_id: record.projectId,
        kind: record.kind,
        label: record.label,
        ciphertext: record.ciphertext,
        key_version: record.keyVersion,
        expires_at: record.expiresAt || null,
        last_rotated_at: new Date(now()).toISOString(),
        updated_at: new Date(now()).toISOString(),
      },
    });
    return rows?.[0] || null;
  }

  async function getCredential(record) {
    const query = [
      `organization_id=eq.${encodeURIComponent(record.organizationId)}`,
      `project_id=eq.${encodeURIComponent(record.projectId)}`,
      `kind=eq.${encodeURIComponent(record.kind)}`,
      `label=eq.${encodeURIComponent(record.label)}`,
      "select=id,ciphertext,key_version,expires_at,last_rotated_at",
      "limit=1",
    ].join("&");
    const rows = await request("deploy_credentials", { query });
    return rows?.[0] || null;
  }

  async function ensureMembership({ organizationId, userId, role }) {
    const rows = await request("deploy_memberships", {
      method: "POST",
      query: "on_conflict=organization_id,user_id&select=organization_id,user_id,role",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        organization_id: organizationId,
        user_id: userId,
        role,
        updated_at: new Date(now()).toISOString(),
      },
    });
    return rows?.[0] || null;
  }

  async function getMembership({ organizationId, userId }) {
    const rows = await request("deploy_memberships", {
      query: [
        `organization_id=eq.${encodeURIComponent(organizationId)}`,
        `user_id=eq.${encodeURIComponent(userId)}`,
        "select=organization_id,user_id,role",
        "limit=1",
      ].join("&"),
    });
    return rows?.[0] || null;
  }

  async function listEligibleAdministrators(organizationId) {
    const rows = await request("deploy_memberships", {
      query: [
        `organization_id=eq.${encodeURIComponent(organizationId)}`,
        "role=in.(owner,administrator)",
        "select=user_id,role",
      ].join("&"),
    });
    return rows || [];
  }

  async function getProject({ organizationId, projectId }) {
    const rows = await request("deploy_projects", {
      query: [
        `id=eq.${encodeURIComponent(projectId)}`,
        `organization_id=eq.${encodeURIComponent(organizationId)}`,
        "status=eq.active",
        "select=id,organization_id,slug,name,github_owner,github_repository,preview_domain,production_domain,status,settings",
        "limit=1",
      ].join("&"),
    });
    return rows?.[0] || null;
  }

  async function createDeploymentJob(record) {
    const body = {
      organization_id: record.organizationId,
      project_id: record.projectId,
      requested_by: record.requestedBy,
      environment: record.environment,
      preview_slot_key: record.previewSlotKey || null,
      action: record.action,
      status: record.status || "queued",
      source_branch: record.sourceBranch || null,
      commit_sha: record.commitSha,
      idempotency_key: record.idempotencyKey,
      approvals_required: record.approvalsRequired || 0,
      metadata: filteredMetadata(record.metadata),
    };
    const rows = await request("deploy_jobs", {
      method: "POST",
      query: "on_conflict=idempotency_key&select=*",
      prefer: "resolution=ignore-duplicates,return=representation",
      body,
    });
    if (rows?.[0]) return { job: rows[0], created: true };
    const existing = await request("deploy_jobs", {
      query: `idempotency_key=eq.${encodeURIComponent(record.idempotencyKey)}&select=*&limit=1`,
    });
    if (!existing?.[0]) throw new Error("The deployment job could not be created.");
    return { job: existing[0], created: false };
  }

  async function getDeploymentJob(jobId) {
    const rows = await request("deploy_jobs", {
      query: `id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`,
    });
    return rows?.[0] || null;
  }

  async function listPendingDeploymentJobs({ organizationId, projectId }) {
    return (await request("deploy_jobs", {
      query: [
        `organization_id=eq.${encodeURIComponent(organizationId)}`,
        `project_id=eq.${encodeURIComponent(projectId)}`,
        "status=eq.queued",
        "order=created_at.asc",
        "select=*",
      ].join("&"),
    })) || [];
  }

  async function listActiveDeploymentJobs({ organizationId, projectId }) {
    return (await request("deploy_jobs", {
      query: [
        `organization_id=eq.${encodeURIComponent(organizationId)}`,
        `project_id=eq.${encodeURIComponent(projectId)}`,
        "status=in.(authorized,running)",
        "order=created_at.asc",
        "select=*",
      ].join("&"),
    })) || [];
  }

  async function transitionDeploymentJob(jobId, fromStatus, toStatus, patch = {}) {
    const allowedPatch = {};
    for (const key of ["provider_job_id", "artifact_digest", "error_message", "metadata"]) {
      if (patch[key] !== undefined) allowedPatch[key] = key === "metadata" ? filteredMetadata(patch[key]) : patch[key];
    }
    const timestamp = new Date(now()).toISOString();
    const body = { ...allowedPatch, status: toStatus, updated_at: timestamp };
    if (toStatus === "running") body.started_at = timestamp;
    if (["succeeded", "failed", "cancelled"].includes(toStatus)) body.completed_at = timestamp;
    const rows = await request("deploy_jobs", {
      method: "PATCH",
      query: `id=eq.${encodeURIComponent(jobId)}&status=eq.${encodeURIComponent(fromStatus)}&select=*`,
      prefer: "return=representation",
      body,
    });
    return rows?.[0] || null;
  }

  async function recordApproval({ jobId, userId, decision = "approved", reason }) {
    const rows = await request("deploy_approvals", {
      method: "POST",
      query: "on_conflict=job_id,user_id&select=id,job_id,user_id,decision,reason,created_at",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: { job_id: jobId, user_id: userId, decision, reason: reason || null },
    });
    if (rows?.[0]) return { approval: rows[0], created: true };
    const existing = await request("deploy_approvals", {
      query: `job_id=eq.${encodeURIComponent(jobId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
    });
    return { approval: existing?.[0] || null, created: false };
  }

  return {
    upsertGitHubUser,
    createSession,
    getSession,
    revokeSession,
    appendAuditEvent,
    upsertCredential,
    getCredential,
    ensureMembership,
    getMembership,
    listEligibleAdministrators,
    getProject,
    createDeploymentJob,
    getDeploymentJob,
    listPendingDeploymentJobs,
    listActiveDeploymentJobs,
    transitionDeploymentJob,
    recordApproval,
  };
}

export function getConfiguredControlStore(environment = process.env) {
  const readiness = readControlStoreConfig(environment);
  if (!readiness.configured) return null;
  return createControlStore({
    url: readiness.config.url,
    serviceRoleKey: readiness.config.serviceRoleKey,
  });
}
