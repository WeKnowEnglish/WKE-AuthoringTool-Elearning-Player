import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGitHubAuthorizationUrl,
  createOAuthTransaction,
  roleForGitHubLogin,
  safeNextPath,
  verifyOAuthState,
} from "./github-oauth.mjs";

test("OAuth transaction uses PKCE and rejects external return URLs", () => {
  const transaction = createOAuthTransaction("https://evil.example/");
  assert.equal(transaction.nextPath, "/deployments");
  assert.ok(transaction.state.length >= 40);
  assert.ok(transaction.verifier.length >= 43);
  assert.ok(transaction.challenge.length >= 43);
  assert.equal(verifyOAuthState(transaction.state, transaction.state), true);
  assert.equal(verifyOAuthState(transaction.state, `${transaction.state}x`), false);
});

test("GitHub authorization requests PKCE and disables account creation", () => {
  const url = buildGitHubAuthorizationUrl({
    clientId: "client",
    redirectUri: "https://deploy.example.com/api/auth/github/callback",
    state: "state",
    challenge: "challenge",
  });
  assert.equal(url.origin, "https://github.com");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("allow_signup"), "false");
  assert.equal(url.searchParams.get("scope"), "read:user");
});

test("roles are assigned only from the explicit login map", () => {
  assert.equal(roleForGitHubLogin({ trusted: "owner" }, "Trusted"), "owner");
  assert.equal(roleForGitHubLogin({ trusted: "owner" }, "unknown"), null);
  assert.equal(safeNextPath("//evil.example"), "/deployments");
});
