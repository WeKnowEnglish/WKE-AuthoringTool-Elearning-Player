# Teacher communications

Last updated: 2026-09-29

## Purpose

This subsystem gives administrators an auditable way to email prospective or current teachers and
gives authenticated teachers a small private direct-message inbox. It deliberately excludes
students and parents from messaging in the first release.

## Routes

- `/teacher/admin/communications` — admin-only one-recipient email composer and send history.
- `/teacher/messages` — authenticated teacher directory, conversations, unread state, and messages.

## Email configuration

The application reuses the existing Resend integration. Production needs these server-only
environment variables:

```text
RESEND_API_KEY=re_...
COMMUNICATIONS_FROM_EMAIL=We Know English <community@notify.weknowenglish.online>
COMMUNICATIONS_REPLY_TO=teachers@weknowenglish.online
```

Recommended domain arrangement:

1. Create a monitored mailbox such as `teachers@weknowenglish.online` with the business mailbox
   provider.
2. Verify a sending subdomain such as `notify.weknowenglish.online` in Resend.
3. Add the SPF and DKIM records supplied by Resend to DNS.
4. Add DMARC for the main domain and begin with monitoring before tightening enforcement.
5. Send test messages to multiple providers and confirm replies reach the monitored mailbox.

Do not replace the main domain's mailbox MX records with inbound-processing records unless moving
all mailbox delivery is an explicit decision. A sending subdomain keeps those responsibilities
separate.

`admin_email_sends.status = 'sent'` currently means that Resend accepted the API request. Delivery,
bounce, and complaint webhooks are a future slice.

## Database and privacy

Migration `153_teacher_communications.sql` creates:

- `admin_email_sends`, accessible only through the service-role-backed admin actions;
- `teacher_profiles`, containing safe teacher-directory fields rather than Auth records;
- `teacher_conversations` and `teacher_conversation_members`;
- `teacher_messages`, enabled for Supabase Realtime.

Row-level security limits conversations and messages to their members. Conversation creation uses a
security-definer function that verifies both the caller's teacher role and the selected directory
profile. Browser roles cannot read the admin email log, insert conversations directly, or change
conversation membership.

## Rollout

1. Apply migration 153 to a non-production Supabase project.
2. Configure the three email environment variables in that environment.
3. Send one test email from the admin page and verify the reply path.
4. Test messaging with two non-production teacher accounts in separate browsers.
5. Verify each account cannot query a conversation it does not belong to.
6. Apply the migration and environment configuration in production.

If messaging must be disabled after rollout, remove the Inbox navigation entry or gate the route
while leaving the durable rows in place. Do not drop communication tables as a rollback because
that would destroy correspondence history.

## Next slices

- Resend delivery/bounce webhook verification and status updates.
- Saved email templates and a prospective-teacher contact list with consent/source fields.
- Throttled email notifications for unread in-app messages.
- Profile editing, conversation archive controls, and admin announcements.
- Attachments and group conversations only after retention and moderation rules are decided.
