function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const baseUrl = new URL(required("CONTROL_PLANE_SUPABASE_URL")).origin;
const serviceRoleKey = required("CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY");

async function upsert(resource, conflict, body, select) {
  const url = new URL(`/rest/v1/${resource}`, baseUrl);
  url.searchParams.set("on_conflict", conflict);
  url.searchParams.set("select", select);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${resource} bootstrap failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  return (await response.json())[0];
}

const organization = await upsert(
  "deploy_organizations",
  "slug",
  { slug: "we-know-english", name: "We Know English", plan_tier: "team" },
  "id,slug,name",
);
const project = await upsert(
  "deploy_projects",
  "organization_id,slug",
  {
    organization_id: organization.id,
    slug: "wke-learning-platform",
    name: "We Know English learning platform",
    github_owner: process.env.WKE_GITHUB_OWNER?.trim() || "WeKnowEnglish",
    github_repository: process.env.WKE_GITHUB_REPOSITORY?.trim() || "WKE-AuthoringTool-Elearning-Player",
    preview_domain: process.env.WKE_PREVIEW_DOMAIN?.trim() || "preview.weknowenglish.online",
    production_domain: process.env.WKE_PRODUCTION_DOMAIN?.trim() || "weknowenglish.online",
  },
  "id,organization_id,slug,name",
);

console.log(`CONTROL_PLANE_ORGANIZATION_ID=${organization.id}`);
console.log(`CONTROL_PLANE_PROJECT_ID=${project.id}`);
