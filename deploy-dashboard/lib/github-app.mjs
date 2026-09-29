import { createSign } from "node:crypto";

const API_ORIGIN = "https://api.github.com";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function normalizedPrivateKey(value) {
  const key = String(value || "").replace(/\\n/g, "\n").trim();
  if (!key.includes("BEGIN") || !key.includes("PRIVATE KEY")) {
    throw new Error("WKE_GITHUB_APP_PRIVATE_KEY is invalid.");
  }
  return key;
}

export function createGitHubAppJwt({ appId, privateKey, now = Date.now() }) {
  const nowSeconds = Math.floor(now / 1_000);
  const header = encode({ alg: "RS256", typ: "JWT" });
  const payload = encode({ iat: nowSeconds - 30, exp: nowSeconds + 9 * 60, iss: String(appId) });
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(normalizedPrivateKey(privateKey), "base64url")}`;
}

export function createGitHubAppTokenProvider({
  appId,
  privateKey,
  installationId,
  fetchImplementation = fetch,
  now = () => Date.now(),
}) {
  let cached = null;
  return async function installationToken() {
    if (cached && cached.expiresAt - 60_000 > now()) return cached.token;
    const jwt = createGitHubAppJwt({ appId, privateKey, now: now() });
    const response = await fetchImplementation(
      `${API_ORIGIN}/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${jwt}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "wke-deploy-dashboard",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    const payload = await response.json();
    if (!response.ok || !payload.token || !payload.expires_at) {
      throw new Error(`GitHub App token request failed (${response.status}).`);
    }
    cached = { token: payload.token, expiresAt: Date.parse(payload.expires_at) };
    return cached.token;
  };
}
