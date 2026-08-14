---
name: supabase-migration-safety
description: Use this skill whenever writing, editing, or reviewing a Supabase SQL migration in this project (supabase/migrations/*.sql) — especially any function callable by anon/public users, or any change to an existing SECURITY DEFINER function. Also use before approving any migration for the user to apply.
---

# Supabase Migration Safety Checklist

This project has a public-facing anon role that must go through `SECURITY DEFINER`
functions to bypass RLS for a few narrow, legitimate write paths (checkout, chat
rate-limit, career applications, etc.). Every migration touching a function callable
by `anon` MUST be checked against this list before it is presented as ready to apply.
Real bugs were caught by exactly these checks in this project's history (migrations
0005, 0006, 0008, 0009) — do not skip them.

## Checklist — walk through every item, do not assume "it was fine last time"

1. **SECURITY DEFINER is explicit in THIS statement.** `CREATE OR REPLACE FUNCTION`
   does NOT inherit `SECURITY DEFINER` or `SET search_path` from a previous
   definition — if the new statement doesn't say `security definer` and
   `set search_path = public` (or the project's equivalent) explicitly, it silently
   reverts to `SECURITY INVOKER` with no search_path override. This breaks silently:
   no error at migration time, the function just starts failing at runtime for anon
   callers with "permission denied for table X".

2. **Return type changes require DROP, not CREATE OR REPLACE.** Postgres refuses
   `CREATE OR REPLACE FUNCTION` if the return type changes (`cannot change return
   type of existing function`). If a function's return type is changing, the
   migration must `DROP FUNCTION` first, then `CREATE FUNCTION`. Dropping the
   function also drops its GRANTs — they must be re-issued explicitly in the same
   migration.

3. **GRANT signature must match the function signature exactly.** Argument count
   and types must match character-for-character with the `CREATE FUNCTION`
   parameter list (default values do NOT create a second overload — a GRANT with
   fewer arguments than the full signature will fail with "function does not
   exist" and can abort the whole migration). When in doubt, copy the exact
   parameter type list from the `CREATE FUNCTION` line into the `GRANT EXECUTE ON
   FUNCTION` line.

4. **Anon-callable functions must not accept an ID that lets the caller target
   someone else's data.** The safe pattern in this project: functions take a
   `session_id` (from an httpOnly, server-generated cookie the client never reads)
   and resolve the target row from that — they never accept a `conversation_id`,
   `order_id`, or similar directly from the caller. If a new function *does*
   accept such an ID as an argument, stop and flag it — that's the exact shape of
   an authorization bypass bug.

5. **RLS policy on the underlying table(s) — confirm it isn't accidentally open.**
   Read the actual `CREATE POLICY` statement, don't assume "there's probably a
   policy for this." Confirm staff-only policies use `is_staff()` (checks an
   active profile with `role in ('admin','editor')`), not just
   `auth.role() = 'authenticated'` — an authenticated-but-not-staff user must
   still be rejected.

6. **Rate-limiting / abuse guard for any new anon-writable endpoint.** A public
   RPC with no rate limit can be hammered to burn a paid quota (e.g. the Gemini
   free tier) or flood a table/inbox. Check whether the new write path needs a
   guard similar to `track_chat_message` (window + max count) or a simple
   "reject if last write was < N seconds ago" check on the locked row.

7. **Show the full function body, not a summary, before it's approved to run.**
   When reporting a migration plan back to the user, paste the complete
   `CREATE [OR REPLACE] FUNCTION ... $$ ... $$;` block verbatim, plus the exact
   `GRANT` statements. A prose summary ("added a guard for X") is not sufficient
   for anyone to actually verify SECURITY DEFINER / search_path / GRANT
   correctness — those are the exact details a summary tends to drop.

8. **New migrations are additive files, never edits to already-applied ones.**
   This project numbers migrations sequentially (0001, 0002, ...) and never edits
   a migration file once it may have been applied. A fix to something in an
   earlier migration is a new migration that alters/drops/recreates, not a diff
   to the old file.

## When reviewing (not authoring) a migration

Do not accept "it's fine, I checked" without evidence. Ask for:
- The full text of every function definition being added or replaced
- Confirmation, with the actual policy SQL quoted, of what RLS currently allows
  for `anon` on the tables involved
- The exact GRANT statements and their argument signatures

If any of the above wasn't verified against the actual file contents (not memory
or a prior session's summary), say so explicitly rather than presenting it as
confirmed.
