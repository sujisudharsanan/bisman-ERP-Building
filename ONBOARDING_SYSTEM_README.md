# Onboarding System (Trial & Registered Clients)

## Overview
This subsystem provides two distinct onboarding flows:
1. Trial User Onboarding (public, frictionless, 14-day trial)
2. Registered Client Onboarding (enterprise-grade wizard)

Implements scalable, secure, accessible UI with backend validation, duplicate detection, magic link resume, and structured activity logging.

## Components
- Frontend Pages:
  - `src/app/onboarding/trial/page.tsx` – 4-step lightweight trial form
  - `src/app/onboarding/clients/new/page.tsx` – Enterprise wizard (8 steps)
- Shared UI: `src/components/onboarding/*` (Stepper, ProgressBar, FormField, SaveDraftButton)
- Types: `src/types/onboarding.ts`
- Validation: `src/lib/validation/onboarding.ts`
- Backend Routes: `my-backend/src/routes/trialOnboarding.ts` mounted at `/api/public/onboarding/*`
- Extended Client schema with onboarding metadata + magic link & activity models.

## New Prisma Models & Fields
Added to `Client`:
- `onboarding_status`, `trial_start_date`, `trial_end_date`, `modules_enabled`, `notification_prefs`, `preferred_language`, `timezone`, `mfa_enabled`, `duplicate_check`, `onboarding_activity`
New models:
- `OnboardingMagicLink` (hashed token storage)
- `ClientOnboardingActivity` (step/action log)

Run migrations:
```bash
npx prisma migrate dev --name onboarding_system
npx prisma generate
```

## Trial Flow
1. User fills minimal data; password strength enforced.
2. Automatic trial start/end (14 days).
3. MFA toggle captured (`mfa_enabled`).
4. Save Draft (stores partial data, returns `client_id`).
5. Magic Link issuance: returns raw token; frontend builds resume URL.
6. Resume endpoint validates token hash and returns status.
7. Activity logged for create, autosave, magic link issuance, resume.

## Registered Wizard Flow
- Step-by-step with validation per section.
- Duplicate detection runs server-side in `clientManagement.ts` (tax ID or name similarity).
- Risk & KYC metadata stored.
- Autosave draft placeholder (extend with dedicated draft route later).
- Final submission calls existing `/api/system/clients` creation with extended meta.

## Security Practices
- Magic link tokens hashed (SHA-256) before storage.
- Password strength check (length + complexity) for trial.
- Duplicate detection prevents conflicting tax IDs (409) and warns on near matches.
- Input sanitized (basic newline stripping) server-side.
- Minimal exposure of internal IDs.
- OWASP alignment: validate inputs, avoid raw token storage, rate limit (add later), CORS enforced via existing middleware.

## Accessibility
- Semantic headings per section.
- `aria-label` and `role="alert"` for errors.
- Keyboard focus for tooltips and interactive elements.

## Next Enhancements
- Add rate-limiting & captcha for trial public endpoints.
- Implement geolocation + address auto-complete.
- Integrate OCR pipeline for compliance docs.
- Add autosave route for registered wizard with granular step updates.
- Publish activity logs via secured Next.js API proxy.

## Environment Variables (Optional)
- `CLIENT_ID_SERVICE_URL` / `CLIENT_ID_SERVICE_KEY` for server-side client code generation.

## Draft & Magic Link Resume
Frontend constructs: `https://<frontend-host>/onboarding/trial/resume/<token>` (UI page pending). The GET endpoint returns `client_id`, `onboarding_status`, and trial end date allowing UI to reload state.

### Implemented Additions (Post Initial Draft)
Added lightweight in-memory rate limiting (30 requests / 15 min per IP+path) inside `trialOnboarding.ts`.
Added primitive demo CAPTCHA (`captcha_answer` = reverse first 3 letters of `full_name`) for non-draft submissions – replace with real provider (hCaptcha/ReCaptcha) later.
Added minimal status endpoint: `GET /api/public/onboarding/trial/:clientId/minimal` for draft prefill.
Added resume UI page: `src/app/onboarding/trial/resume/[token]/page.tsx` consuming `resume/:token` and linking back to main form with `client_id` query param.
Prefill logic on trial form reads `client_id` from query and calls minimal endpoint to hydrate company name.
Fallback JSON storage: When Prisma new models not yet migrated, activity & magic link data stored under `settings.enterprise.activity_log` and `settings.enterprise.magic_links`.

### Replacing Demo CAPTCHA
To integrate real CAPTCHA later:
1. Frontend obtains provider token (e.g., hCaptcha) after user interaction.
2. Send token in request body `captcha_token`.
3. Backend verifies via provider API (server-to-server) before processing.
4. Remove demo `captcha_answer` logic entirely.

### Hardening Rate Limiting
For production scale replace in-memory limiter with:
- Redis sliding window or token bucket (e.g., rate-limiter-flexible) keyed by IP + email.
- Include exponential backoff responses (Retry-After header).
- Add structured log when threshold exceeded for abuse monitoring.

## Migration Notes
If production database already has clients, add columns via migration. Prisma model changes require a migration; existing records get null defaults.

## Testing Checklist
- Trial form: strong/weak password scenarios
- Draft save & magic link issuance
- Resume token expiry (manually adjust `expires_at`)
- Duplicate tax ID conflict (returns 409)
- Registered wizard finish creates client with meta fields

## Logging & Monitoring
- Use `ClientOnboardingActivity` for onboarding funnel analysis.
- Extend existing audit log integration later.

## Contact
For architectural questions see `DOCUMENTATION_INDEX.md` or internal platform channel.
