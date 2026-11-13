# Auth Release 2 - Customer Recovery Release Runbook

Stage 0F hardens the customer password-recovery error contract and weak-password UX. It does not add a migration, change RLS, change CI, or change the Admin recovery flow.

## Scope and ownership

- Release owner: maintainer named in the production release ticket. This document does not assign a person by default.
- Database approval/rollback: backend/DBA on-call.
- Application/VPS rollback: infrastructure on-call.
- Production approval: required before merge/deploy. Do not deploy from the personal `origin` repository.
- Dependency order: PR #5 must merge before PR #6. This Stage 0F work is independent of that PR chain and must not be merged or deployed as part of it without a separate approval.

## What changed

- `POST /api/auth/customer/reset-password` now returns a safe machine-readable `code`:
  - `invalid_input`, `invalid_request`, `payload_too_large`, `rate_limited`, `service_unavailable`
  - `invalid_token`, `password_rejected`, `unavailable`, `success`
  - `forbidden`
- `needsNewLink` is explicit: validation/rate-limit/service-configuration failures keep the token; invalid, rejected, and unavailable outcomes require a new link.
- The recovery form distinguishes a password-policy rejection from an expired/replayed link and shows localized copy for ID, EN, and ZH-CN.
- A pre-claim validation error no longer gets mislabeled as an expired link.
- Password-policy rejection is terminal for that link: request a new link. Ambiguous update failures are never reported as success.
- Rate-limit and access-token limits remain documented limitations; this stage does not add Redis or distributed rate limiting.

## Required production configuration

Set these as runtime environment values on the VPS, not as Docker build arguments and never in Git:

- `CUSTOMER_RECOVERY_TOKEN_SECRET`: at least 32 characters. Stable across restarts and instances. Do not use a `NEXT_PUBLIC_` prefix. Rotating it invalidates all outstanding recovery links.
- `RESEND_API_KEY`: server-only.
- `RESEND_FROM_EMAIL`: verified sender/domain.
- `RESEND_API_URL`: leave unset in production. Non-local plaintext endpoints are rejected.
- Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `NEXT_PUBLIC_SITE_URL`: canonical public HTTPS origin, no path/query. It is embedded at image build time. The recovery email contains `<origin>/auth/reset-password#token=...`; keep the token in the fragment.

Do not print secret values in CI logs, shell history, tickets, or screenshots. Check presence only:

```bash
test -n "$CUSTOMER_RECOVERY_TOKEN_SECRET"
test -n "$RESEND_API_KEY"
test -n "$RESEND_FROM_EMAIL"
test -n "$SUPABASE_SERVICE_ROLE_KEY"
```

Supabase Auth must have the intended password policy and recovery-token lifetime. The application schema requires 8-128 characters and confirmation match; a stricter Supabase policy can still reject a schema-valid password. That rejection consumes the link and asks the user for a new one.

## Pre-deploy gate

1. Confirm the release commit and clean application tree.
2. Create and record a production database backup or PITR restore point. Record the timestamp in the release ticket.
3. Review the additive migration `supabase/migrations/20261109120000_customer_password_recovery.sql` if it has not already been applied in production. It creates `public.customer_password_recovery` and four service-role-only RPCs. It does not alter existing tables.
4. Run the migration dry run before applying:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_ID" --password "$SUPABASE_DB_PASSWORD" --yes
supabase migration list --linked
supabase db push --linked --dry-run --skip-vault
```

5. Confirm the VPS `.env.docker` contains the runtime values above, then:

```bash
docker compose --env-file .env.docker config --quiet
```

6. Confirm the production image will be built with the final canonical `NEXT_PUBLIC_SITE_URL`. Changing it only at container runtime does not update the bundle.

Do not proceed if the backup, migration approval, or required env validation is missing.

## Local verification before release

Run from the release candidate worktree with synthetic/local credentials only. Do not point automated tests at production.

```bash
node scripts/verify-customer-recovery-error-contract.cjs
node scripts/verify-customer-password-recovery-backend.cjs
node scripts/verify-customer-password-recovery-http.cjs
node scripts/verify-customer-password-recovery.cjs
node scripts/verify-customer-recovery-ui.cjs
node scripts/verify-admin-auth.cjs
node scripts/verify-auth-cookie-refresh.cjs
node scripts/verify-auth-cookie-http.cjs
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Expected Stage 0F evidence:

- Error contract: 10/10 cases, 42 assertions.
- Backend: 38/38 cases, 127 assertions.
- HTTP: 15/15 cases, 211 assertions (includes pre-claim validation preserving the token).
- Database: 29/29 cases.
- Browser UI: 12/12 cases, including localized password-policy rejection at mobile/desktop widths.
- Admin auth: 19/19 cases.
- Auth cookie proxy: 55/55 cases, 825 assertions.
- Auth cookie HTTP: 30/30 cases, 525 assertions.
- Lint, TypeScript, production build, and `git diff --check` pass.

The browser verifier uses a synthetic intercepted `password_rejected` response because the default local GoTrue policy does not reject a schema-valid password. Real Supabase policy rejection must be checked manually against an authorized test account after approval.

## Deploy

The company repository has `.github/workflows/deploy.yml`; the personal `origin` repository does not. A push to the personal repository does not deploy production.

The company workflow runs on `push` to `main` or manual dispatch:

1. `validate`: lint and production build with public build secrets.
2. `migrate`: `supabase db push --linked --yes --skip-vault` after the dry run.
3. `deploy`: SSH to the VPS, fast-forward to the expected commit, rebuild the image, and wait for the container.

Required approvals:

- Merge to company `main` only after review.
- If the GitHub `production` environment has required reviewers, wait for approval before `migrate`/`deploy`.
- Do not bypass a failed validate/migrate job.

## Post-deploy smoke test

Use only an authorized test account. Never use a real customer account or production mailbox for automated tests.

1. `GET /auth/forgot-password`, `/auth/reset-password`, `/auth/login`, `/admin/login` load over HTTPS without console errors and with anti-cache/noindex headers on auth responses.
2. Request a reset for the test customer. Confirm one email is sent; the URL must contain `/auth/reset-password#token=...`, not a query string.
3. Invalid/replayed/expired token shows the invalid-link state and offers a new link.
4. A schema-valid password rejected by the Supabase policy shows the localized password-policy state, not “invalid link”, and requires a new link. Confirm the UI copy in ID, EN, and ZH-CN.
5. A pre-claim validation failure (for example, confirmation mismatch) does not consume the token; correcting the input and resubmitting the same link succeeds.
6. Successful reset updates the password, revokes the customer's sessions, and the customer can sign in. An unrelated Admin session remains active.
7. Confirm reverse-proxy/access logs do not contain raw tokens, passwords, or recovery secrets. Redact query strings and fragments for `/auth/*`.
8. Confirm the VPS container is healthy and the image revision matches the approved commit.

## Rollback

### Application rollback

1. Stop further deploys.
2. Record the failed commit, timestamp, and observed symptom.
3. Rebuild/redeploy the previous approved commit using the same build-time `NEXT_PUBLIC_*` values. The workflow deploy step builds from a Git revision; do not edit `.env.docker` or the VPS checkout to fake a rollback.
4. Confirm `/auth/*`, `/admin/login`, and the store load after rollback.

### Database rollback

The recovery migration is additive. If the application is rolled back but the table remains, old code ignores it. Do not drop the table while recovery requests may be in flight.

If the migration itself must be reversed:

1. Stop app traffic/recovery requests.
2. Restore the pre-deploy backup/PITR restore point, or, with DBA approval, revoke RPC access and drop the four recovery functions and the table. Dropping the table loses recovery attempt audit data.
3. Never delete terminal recovery rows manually outside an approved retention job.
4. Confirm login and Admin auth still work before reopening traffic.

### Secret compromise

Rotate `CUSTOMER_RECOVERY_TOKEN_SECRET` and redeploy. All outstanding recovery links become invalid by design. Rotate Resend credentials in the provider and update VPS runtime env. Do not rotate secrets as a normal rollback step.

## CI audit and recommendations

Current company workflow facts:

- `.github/workflows/deploy.yml` triggers on company `main` push and manual dispatch.
- `validate` runs lint and build only. There is no PR workflow, no unit/integration test step, and no separate typecheck step (build performs typecheck).
- `migrate` applies pending Supabase migrations automatically after `validate`, using `supabase db push --yes`. It does run `--dry-run` first.
- `deploy` rebuilds the Docker image on the VPS with `APP_REVISION="$GITHUB_SHA"` and waits for health.
- Build-time env is limited to the four public values. Customer recovery secrets are runtime-only and must be in `.env.docker` on the VPS.

Recommendations, not applied in Stage 0F:

1. Add a pull-request workflow that runs `npm run lint`, `npx tsc --noEmit`, the targeted Stage 0F verifiers, and `npm run build`; require it before merge.
2. Protect company `main` and require review/status checks.
3. Require a manual approval or a separate gated workflow for `migrate`; automatic migration on every main push is a production risk.
4. Add a pre-migration backup/snapshot step or make the backup a documented prerequisite with an explicit gate.
5. Add post-deploy smoke checks for `/auth/forgot-password`, `/auth/reset-password`, `/auth/login`, and `/admin/login`.
6. Keep Supabase CLI and Node versions pinned and document the local/production version difference.
7. Do not add the customer recovery secrets to workflow build env or repository files.

## Known limitations

- Rate limiting is in-memory and best effort per instance. Multi-instance deployments do not share counters.
- Email delivery depends on Resend. Definitive failures fail the row; ambiguous timeouts return an unconfirmed/unavailable result and require a new link.
- A password-policy rejection is intentionally terminal for the link.
- Live Supabase Auth policy, Resend delivery, and production CDN/proxy behavior require manual approval and an authorized test account.
- The application cannot guarantee immediate invalidation of already-issued access JWTs; global logout revokes refresh sessions.

## Release checklist

- [ ] Production approval recorded.
- [ ] Migration reviewed and dry-run output attached.
- [ ] Database backup/PITR restore point recorded.
- [ ] VPS runtime secrets present (presence check only).
- [ ] Build uses canonical HTTPS `NEXT_PUBLIC_SITE_URL`.
- [ ] Local verifiers, lint, typecheck, build, and diff check pass.
- [ ] Authorized test-account smoke test passes in ID/EN/ZH-CN.
- [ ] Logs checked for token/password leakage.
- [ ] Rollback owner and previous image revision recorded.
