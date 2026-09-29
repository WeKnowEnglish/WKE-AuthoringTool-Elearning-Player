import assert from "node:assert/strict";
import test from "node:test";

import {
  canApproveDeployment,
  deploymentIdempotencyKey,
  productionApprovalPolicy,
} from "./deployment-policy.mjs";

const projectId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";

test("deployment idempotency keys are deterministic and scoped to a project", () => {
  const first = deploymentIdempotencyKey({ projectId, requestId });
  assert.equal(first, deploymentIdempotencyKey({ projectId, requestId }));
  assert.equal(first.length, 64);
  assert.notEqual(
    first,
    deploymentIdempotencyKey({ projectId: "33333333-3333-4333-8333-333333333333", requestId }),
  );
});

test("production approval requires a distinct administrator by default", () => {
  assert.deepEqual(
    productionApprovalPolicy({ eligibleAdministratorIds: ["requester", "reviewer"], requesterId: "requester" }),
    { allowed: true, approvalsRequired: 1, mode: "two-person", reason: null },
  );
  assert.equal(
    productionApprovalPolicy({ eligibleAdministratorIds: ["requester"], requesterId: "requester" }).allowed,
    false,
  );
});

test("single administrator release requires explicit break glass", () => {
  assert.deepEqual(
    productionApprovalPolicy({
      eligibleAdministratorIds: ["requester"],
      requesterId: "requester",
      singleAdministratorBreakGlass: true,
    }),
    { allowed: true, approvalsRequired: 0, mode: "single-admin-break-glass", reason: null },
  );
});

test("requesters cannot approve their own deployment", () => {
  assert.equal(
    canApproveDeployment({ requesterId: "same", approverId: "same", approverRole: "owner", status: "queued" }).allowed,
    false,
  );
  assert.equal(
    canApproveDeployment({ requesterId: "one", approverId: "two", approverRole: "administrator", status: "queued" }).allowed,
    true,
  );
});
