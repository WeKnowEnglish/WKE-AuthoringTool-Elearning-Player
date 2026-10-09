# Shared writing in the live classroom

Teachers and students use one document for joint sentence building, shared stories,
and live feedback. The teacher can write alongside the students without leaving
the classroom or opening a separate activity page.

## Teacher workflow

1. Open a class-linked live classroom and have enrolled students join normally.
2. Select **Learn**, then **Shared document**.
3. Enter a document title and writing prompt, then choose **Start shared document**.
4. Write together. Changes appear on everyone's screen. Formatting includes
   paragraphs, headings, bold, underline, and lists.
5. Choose **Collect** when the writing is ready. This locks editing and saves a
   shared submission. Review the writing before choosing **Complete**.
6. **Complete** closes the document for everyone and keeps the classroom active.

Students need current classroom access and enrollment. They do not need a separate
document link, document code, or Submit action for this whole-class workflow.
On phones the writing area uses the full width; **Show class video** opens the
video panel without leaving the document or reconnecting the call.
Refreshing restores the active document. A lost document connection pauses editing
and shows a reconnect message. A failed save stays visible and offers a retry;
completion is blocked until the collected work has saved.

## Implementation

The classroom embeds the existing Document activity in whole-class mode. Liveblocks
and its Yjs/Tiptap integration merge simultaneous edits. The current classroom
shares its existing Liveblocks client with the nested document room. The Supabase
native classroom creates an isolated document client because it has no outer
Liveblocks provider. Both shells use the same editor and launch API.

The document entry and provider-token endpoints derive identity from authenticated
classroom access and recorded round ownership. They recheck enrollment, teacher
ownership, class/session status, and the room-to-round binding. Client-provided
identity does not grant access.

Active rounds and collected submissions are recorded in `document_rounds` and
`document_submissions`. Collection freezes the snapshot for retries and prevents a
failed write from silently dropping student work. This change uses existing tables
and requires no database migration or new dependency.

## Verification

Focused tests cover shared editing permissions, immediate launch, current account
access, collection failure/retry, immutable submissions, and completion guards.

Run the real browser acceptance journey from `web` with configured preview fixture
credentials and an explicit disposable-fixture opt-in:

```powershell
$env:SHARED_DOCUMENT_SMOKE_CONFIRMATION = 'disposable-preview-classroom'
node --env-file=.env.local scripts/smoke-shared-document.mjs --base-url https://preview.weknowenglish.online
```

The script creates its own class and three enrolled student accounts, uses four
isolated browser contexts, checks concurrent writing, refresh, a disconnected
collaboration socket, usable phone editor width and video toggle, authorization, collected database content,
and completion without ending the class. It removes only its own fixtures and
provider rooms. Reports and screenshots are written under the worktree's ignored
`.codex-build/shared-document-smoke` directory. Video is a separate acceptance scope.
