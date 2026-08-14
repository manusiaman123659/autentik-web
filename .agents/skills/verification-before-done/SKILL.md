---
name: verification-before-done
description: Use this skill at the end of every task in this project, before reporting a task as complete — especially after running lint/build, after a database migration, or after any change to an auth/RLS/payment/checkout-adjacent file. Also use when reviewing another session's "done" report.
---

# Verification Before "Done"

In this project, "lint passed and build passed" has repeatedly turned out to be
necessary but not sufficient — several real bugs (a stray duplicate line from an
"insert instead of replace" edit, a GRANT statement with the wrong argument
count, a return-type change that silently dropped SECURITY DEFINER) were caught
only because the actual file contents or SQL were shown and re-read, not just
summarized as "fixed."

## Before saying a task is complete

1. **Paste the full lint output, not a summary.** "0 errors, only pre-existing
   warnings" is only trustworthy if the actual list of files/line numbers is
   shown and can be diffed against the previous run's list. A shrinking or
   changing file list without explanation is a signal to double-check, not to
   round it down to "still just pre-existing stuff."

2. **For anything involving SQL (migrations, RPC functions, RLS policies):
   show the full definition, not a description of what changed.** "I added a
   guard" is not verifiable. The actual `CREATE FUNCTION ... $$ ... $$` block,
   the actual `CREATE POLICY` statement, and the actual `GRANT` line are what
   get reviewed — see the `supabase-migration-safety` skill for the specific
   checklist.

3. **After an edit that replaces a line/section, re-read the file to confirm
   there isn't a stale duplicate left behind.** A tool call that "adds" new
   content next to old content instead of truly replacing it is a real failure
   mode that has happened in this project. Read the target section back after
   the edit, don't just trust the diff view.

4. **When a task said "verify X before implementing" or "check Y first,"
   actually report the result of that check** — don't skip straight to
   "done, X works." If a required verification step (e.g. "check whether the
   admin manual-order feature depends on the policy being dropped") wasn't
   actually performed, say so explicitly rather than implying it was.

5. **Manual/runtime testing is a separate step from lint+build and must be
   called out as still-pending if it hasn't happened.** Lint and build only
   catch type/syntax errors — they prove nothing about whether a checkout
   flow actually decrements stock correctly, whether a chat widget actually
   opens, or whether a migration was actually applied to the live database.
   Say clearly which of these have and haven't been tried.

6. **Database migrations are not "done" until applied.** Writing the `.sql`
   file and passing `npm run build` does not mean the schema exists yet in
   Supabase. Always state explicitly that the migration still needs to be run
   in the SQL editor (or applied via the project's migration tooling) before
   the feature works at runtime.

7. **Don't commit automatically.** Report lint/build results and wait for
   explicit approval before running `git commit` — this project reviews
   before every commit, not after.

## When reporting to the user

Structure the "done" report so each of the above is checkable at a glance:
what was changed (file list), what was verified (full lint output, full SQL,
what was actually tested by hand vs still pending), and what manual step (if
any) remains before the feature is live.
