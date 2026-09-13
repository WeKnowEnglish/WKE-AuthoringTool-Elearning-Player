# Stripe lesson-pack payments

## Environments

Use Stripe sandbox keys for local development and live keys only in the production deployment.
The signing secret belongs to one specific webhook endpoint and mode; it is not the API key.

Local development:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_ORIGIN=http://localhost:3000
```

Production:

```dotenv
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_ORIGIN=https://weknowenglish.online
```

The hosted Checkout integration does not need a browser-side publishable key.

## Production webhook

Endpoint:

```text
POST https://weknowenglish.online/api/webhooks/stripe
```

Subscribe only to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `refund.created`
- `refund.updated`
- `refund.failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

## Fulfillment guarantees

A paid Checkout Session grants lessons only when its session ID, live/test mode, total,
currency, internal order reference, guardian, student, package, quantity, and lesson count all
match the stored order. The credit-grant database transaction is idempotent.

Webhook deliveries are claimed before processing. Completed event IDs are ignored on repeat;
failed or stale claims can be retried.

## Refund and dispute policy boundary

Refund and dispute events flag the order for administrator review and appear on Admin →
Packages. The webhook never silently removes lessons from a child. An administrator must compare
the refund with lessons already booked or used, then apply the school's approved entitlement
policy.

## Acceptance test

1. Apply all Supabase migrations.
2. Complete one sandbox purchase for a purpose-created parent and child.
3. Confirm one paid order, one `pack_purchase` ledger row, and the expected lesson balance.
4. Resend the same Stripe event and confirm the balance does not change.
5. Test an expired Checkout Session.
6. Create a partial sandbox refund and confirm an administrator review item appears.
7. Create a full sandbox refund and confirm the order becomes `refunded` without silently
   changing the child's lesson balance.
8. Test dispute-created and dispute-closed events.
9. After sandbox acceptance, make one controlled live purchase and verify a `2xx` delivery in
   Stripe Workbench.
