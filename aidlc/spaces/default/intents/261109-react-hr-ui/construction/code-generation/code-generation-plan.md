# Code Generation Plan: React HR Portal UI, hrAgent Chat and UI Hosting Stacks

## Summary

- Builds: a bilingual (English/Arabic, RTL) React portal styled like Health Holding, with Amplify sign-in, employee/leave/HR-request screens and a streaming hrAgent chat, plus two CDK stacks that host it on S3 + CloudFront, and the small backend and agent fixes
- Touches: `ui/` (app source, tests, config), new `hr_leave_portal/ui_hosting_stack.py` and `hr_leave_portal/ui_deployment_stack.py`, `hr_leave_portal/backend_stack.py`, `hr_leave_portal/agent_runtime_stack.py`, new `api/cors.py` + `api/handler.py`, `hrAgent/app/agent/parse.py` + `main.py`, `app.py`, `README.md`
- Tests: about 14 unit tests: Vitest + Testing Library for the UI (FR1, FR2, FR3, FR4, FR5, FR8, FR9), pytest for the agent actor id (FR6.3), the API origin list (FR6.2) and the CDK stacks (FR6.1, FR7)

## Context

- Scope: express, zero-Unit work, brownfield. Inputs: `aidlc/spaces/default/intents/261109-react-hr-ui/inception/requirements-analysis/requirements.md` (FR1-FR9, NFR1-NFR7) and the code knowledge base `aidlc/spaces/default/codekb/hr-leave-portal/`.
- No design stages ran, so the design decisions this plan makes are recorded under Design Decisions below.

## Design Decisions

- **Breaking the origin cycle (requirements open question 1).** The UI needs backend outputs, and the backend needs the UI's CloudFront domain. The work is split into two stacks:
  - `HrLeavePortalUiHosting` holds the private S3 bucket and the CloudFront distribution. It depends on nothing, so it deploys first.
  - `BackendStack` takes the distribution's domain as `allowed_origins`.
  - `HrLeavePortalUiDeployment` runs the `BucketDeployment` that uploads `ui/dist` plus `config.json`. It depends on the hosting, backend and agent stacks.
  - Alternatives considered: (a) an SSM parameter filled on a second deploy, rejected because it needs two deploys and a manual step; (b) leaving origins at `*`, rejected because the person chose to restrict them (Q4 A).
- **hrAgent path.** The browser calls the AgentCore data-plane endpoint directly with the Cognito access token (Q3 A). The streaming proxy behind the API (FR5.5) is built only if the deployed runtime rejects browser CORS requests. That can't be checked from this machine, so the client goes through a single `agentClient` module with one configurable base URL, which keeps the switch to a proxy limited to one file. The deploy check is written into the README and `code-summary.md`.
- **Actor id from the JWT (FR6.3).** The runtime forwards the `Authorization` header to the container through its request-header allowlist. The agent decodes the already-validated JWT payload to read `sub`, and the body's `actorId` is ignored. If the installed `aws_bedrockagentcore` L2 does not expose the allowlist, use the CloudFormation property override `RequestHeaderConfiguration.RequestHeaderAllowlist` on the underlying `CfnRuntime`.
- **Libraries added** (named here so they may be installed):
  - dependencies: `react-router-dom` (routes), `@fontsource/ibm-plex-sans-arabic` (self-hosted Arabic + Latin font)
  - dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
  - Translations use a small in-house context with `en.json`/`ar.json` instead of an i18n library, to keep dependencies low.
- **Design tokens.** One file, `ui/src/theme/tokens.css`, holds the FR8.1 palette as CSS variables. The Amplify `ThemeProvider` theme is built from the same values.

## Steps

### Step 1: Project structure and production configuration skeleton
- [x] Install the libraries named above in `ui/` with `npm install`.
- [x] Create the `ui/src/` layout: `config/`, `auth/`, `api/`, `agent/`, `i18n/`, `theme/`, `components/`, `pages/`, `test/`.
- [x] Remove the template counter from `ui/src/App.tsx` and its unused logo imports. This fixes the current `npm run build` failure (NFR3).
- [x] Add `ui/public/config.json.example` and a dev `ui/public/config.json` with placeholder values. Add `ui/public/config.json` to `ui/.gitignore`.
- Traces: FR7.3, NFR3.

### Step 2: Verify the test runners and record the commands
- [x] Add a `test` section to `ui/vite.config.ts` (jsdom, setup file `ui/src/test/setup.ts` that loads jest-dom) and a `"test": "vitest --run"` script.
- [x] Confirm `cd ui && npx vitest --run src/test/smoke.test.ts` runs (temporary smoke test, removed in Step 14).
- [x] Confirm `uv run pytest tests/unit/test_ui_stacks.py tests/unit/test_agent_actor.py tests/unit/test_api_cors.py` is collectable (files created in later steps).
- Traces: NFR6.

### Step 3: Runtime config and data model (implement)
- [x] `ui/src/config/config.ts` fetches and validates `/config.json` (region, apiUrl, userPoolId, userPoolClientId, agentRuntimeArn) before Amplify is configured. A missing or invalid file shows a clear start-up error screen.
- [x] `ui/src/api/types.ts` holds the TypeScript types for Employee, Leave and the HR request payloads, with the storage keys `PK`/`SK`/`GSI1*` left out of display types.
- Traces: FR7.3.

### Step 4: Config tests (write and run)
- [x] `ui/src/config/config.test.ts`: a valid config loads; a missing field throws a readable error.
- Traces: FR7.3.

### Step 5: Data access (implement)
- [x] `ui/src/api/client.ts` is the REST client. It sends `Authorization: <ID token>` from `fetchAuthSession()`, sends dates as `YYYY-MM-DD`, maps 401 to a session-expired event, and maps 404 and 422 to typed errors.
- [x] Functions cover all 8 operations: listEmployees(filter), getEmployee, createEmployee, listLeave(month), createLeave, updateLeave, submitTimeOff, submitHrRequest.
- [x] `ui/src/agent/agentClient.ts` POSTs to `https://bedrock-agentcore.<region>.amazonaws.com/runtimes/<encoded ARN>/invocations?qualifier=DEFAULT` with `Authorization: Bearer <access token>`, `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` and `{prompt}`. It reads the response body as a stream, parses SSE `data:` lines and yields `contentBlockDelta.delta.text` chunks. An `AbortSignal` cancels the call. Errors are typed: network, http status, stream cut off.
- [x] `ui/src/agent/session.ts` generates a session id of at least 33 characters with `crypto.randomUUID()`.
- Traces: FR1.4, FR1.5, FR2-FR4 (API calls), FR5.2, FR5.3, FR5.4.

### Step 6: Data access tests (write and run)
- [x] `ui/src/api/client.test.ts` (mocked `fetch` and Amplify session): the ID token header is sent; a 401 raises session-expired.
- [x] `ui/src/agent/agentClient.test.ts`: a mocked SSE stream yields the text chunks in order; the request carries the Bearer access token and session-id header; a 500 raises a typed error.
- Traces: FR1.4, FR1.5, FR5.2, FR5.4.

### Step 7: Business logic: validation, translations and theme (implement)
- [x] `ui/src/pages/validation.ts` holds the form rules: required name/department (FR2.3), a hire-date range needing both dates with from ≤ to (FR2.2), end ≥ start for leave (FR3.2), a non-empty HR prompt (FR4.2), and overwrite detection when a new leave has the same start date as an existing one (FR3.4).
- [x] `ui/src/i18n/en.json`, `ar.json` and `I18nProvider.tsx` handle the language choice: stored in `localStorage`, defaulting to the browser's preferred language when it is Arabic, otherwise English. The provider sets `<html lang dir>`, provides `t(key)`, and formats dates with `Intl.DateTimeFormat` using the Gregorian calendar (FR9.1-FR9.4). The Amplify Authenticator labels are translated through Amplify `I18n` with the same dictionaries.
- [x] `ui/src/theme/tokens.css` holds the FR8.1 palette, the font, spacing and radius. `theme/amplifyTheme.ts` builds the Authenticator theme from the same tokens. `theme/global.css` uses logical CSS properties (`margin-inline-start`, `inset-inline-end` and so on) so the RTL layout mirrors without separate stylesheets (FR9.2).
- Traces: FR2.2, FR2.3, FR3.2, FR3.4, FR4.2, FR8.1, FR8.5, FR9.1-FR9.4.

### Step 8: Business logic tests (write and run)
- [x] `ui/src/pages/validation.test.ts`: covers each rule's pass and fail case.
- [x] `ui/src/i18n/i18n.test.ts`: `en.json` and `ar.json` have identical key sets; switching to Arabic sets `dir="rtl"` and `lang="ar"`.
- [x] `ui/src/theme/tokens.test.ts`: no hex colour literal appears in `ui/src/**/*.tsx` or any `.css` other than `tokens.css`.
- Traces: FR2-FR4 validation, FR8.1, FR9.2, FR9.3.

### Step 9: Backend and agent changes (implement)
- [x] `api/cors.py` provides `allowed_origins()`, which reads the comma-separated `ALLOWED_ORIGINS` env var and never returns `*`. `api/handler.py` uses it in `CORSMiddleware`.
- [x] `backend_stack.py`:
  - takes an `allowed_origins: list[str]` parameter and uses it in API Gateway `CorsOptions`
  - sets `ALLOWED_ORIGINS` on the Lambda
  - adds Gateway Responses `DEFAULT_4XX` and `DEFAULT_5XX` with `Access-Control-Allow-Origin` (the CloudFront origin) and the allowed headers
- [x] `agent_runtime_stack.py` allowlists the `Authorization` request header on the runtime.
- [x] `hrAgent/app/agent/parse.py` adds `actor_id_from_headers(headers)`, which decodes the JWT payload (base64url, no signature re-check because AgentCore already validated it) and returns `sub`. `parse_payload` stops reading `actorId` from the body. `main.py` passes `context.request_headers` and falls back to `"default"` only when no token is present (local `agentcore dev`), logging a warning.
- Traces: FR6.1, FR6.2, FR6.3.

### Step 10: Backend and agent tests (write and run)
- [x] `tests/unit/test_api_cors.py`: covers a two-origin env, an empty env (localhost only), and that `*` is never returned.
- [x] `tests/unit/test_agent_actor.py`: a JWT with `sub` X gives actor X even when the body says `actorId: Y`; a missing header gives `"default"`.
- Traces: FR6.2, FR6.3.

### Step 11: Frontend (implement)
- [x] `ui/src/main.tsx` loads the config, configures Amplify, then renders `I18nProvider`, `ThemeProvider` and `Authenticator` (`hideSignUp`, logo slot in its header, forced password change built in).
- [x] `ui/src/components/AppShell.tsx` is the navy header with the logo `<img src="/brand/logo.svg">` falling back to the text "HR Leave Portal" if the file is missing (FR8.4), navigation, the language switch, the username and sign-out. It also listens for the session-expired event and signs out with a message (FR1.5).
- [x] Pages:
  - `EmployeesPage` (list, hire-date filter, create form)
  - `EmployeeDetailPage` (details, 404 message, leave list with month filter, record/edit leave with overwrite confirmation)
  - `HrRequestsPage` (time-off and free-text forms, `user_id` = Cognito `sub`, sent-to-HR confirmation)
  - All pages have loading, empty and error states and `data-testid` on interactive elements.
- [x] `ui/src/components/ChatPanel.tsx` is a drawer reachable from every screen. It streams replies, offers "New conversation", shows errors with Retry, sets `dir="auto"` on each message (FR9.5), and raises a data-changed signal after each reply so open pages refetch (FR5.6).
- [x] Self-hosted IBM Plex Sans Arabic is imported in `main.tsx`. Pages use white rounded cards on the `#F3F4FB` background (FR8.2), and the Authenticator is themed (FR8.3).
- [x] Add `ui/public/brand/README.md` explaining where to drop the official logo.
- Traces: FR1.1-FR1.5, FR2.1-FR2.4, FR3.1-FR3.4, FR4.1-FR4.3, FR5.1-FR5.6, FR8.2-FR8.5, FR9.5, NFR4, NFR5.

### Step 12: Frontend tests (write and run)
- [x] `ui/src/pages/EmployeesPage.test.tsx`: renders the mocked employee list; submitting with an empty name shows an error and sends nothing.
- [x] `ui/src/pages/EmployeeDetailPage.test.tsx`: shows leave entries; the overwrite warning appears for a duplicate start date.
- [x] `ui/src/pages/HrRequestsPage.test.tsx`: the time-off submit sends the signed-in `sub` as `user_id` and shows the confirmation.
- [x] `ui/src/components/ChatPanel.test.tsx`: streamed chunks appear before the stream ends; "New conversation" changes the session id.
- [x] `ui/src/components/AppShell.test.tsx`: the sign-in screen hides sign-up (Authenticator rendered with `hideSignUp`); a missing logo falls back to the text title.
- Traces: FR1.1, FR2, FR3, FR4, FR5, FR8.4.

### Step 13: Environment and build configuration (CDK)
- [x] `hr_leave_portal/ui_hosting_stack.py`:
  - private bucket with `BlockPublicAccess.BLOCK_ALL`, `enforce_ssl`, S3-managed encryption
  - CloudFront `Distribution` with an `S3BucketOrigin.with_origin_access_control`, `REDIRECT_TO_HTTPS`, a `ResponseHeadersPolicy` (HSTS, nosniff, frame DENY, referrer policy), default root `index.html`, and error responses 403/404 → `/index.html` 200
  - outputs `UiUrl` and exposes `distribution_domain`
- [x] `hr_leave_portal/ui_deployment_stack.py`: `BucketDeployment` of `ui/dist` plus `Source.json_data("config.json", {...})` built from the backend and agent stack values, with CloudFront invalidation of `/*`.
- [x] Wire `app.py` in this order: Notifications → UiHosting → Backend(allowed_origins=[`https://<domain>`, `http://localhost:5173`]) → StateMachine → AgentRuntime → UiDeployment.
- [x] `tests/unit/test_ui_stacks.py` (pytest + `aws_cdk.assertions`):
  - the bucket blocks all public access
  - the distribution uses OAC and redirects to HTTPS
  - error responses map to `/index.html`
  - the backend has a `DEFAULT_4XX` Gateway Response
  - `UiUrl` is output
- Traces: FR6.1, FR7.1, FR7.2, FR7.4, FR7.5, FR7.6, NFR1, NFR2.

### Step 14: Documentation and traceability
- [x] Remove the temporary smoke test. Run `npm run lint`, `npm run build` and `npm test` in `ui/` (NFR3, NFR6).
- [x] Update `README.md` with a "Web UI" section:
  - local dev (`npm run dev` with `ui/public/config.json` from the stack outputs)
  - deploy order (`scripts/build_layer.sh`, `scripts/build_and_push_agent.sh`, `npm --prefix ui run build`, `cdk deploy --all`)
  - creating a user (`aws cognito-idp admin-create-user`)
  - adding the logo
  - the post-deploy check that the browser can call AgentCore directly, and how to switch to the proxy if it can't
- Traces: FR7.5, FR8.4, FR5.5.

## Testing Contract
```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c8f84e35190e007d9863fad236154d0269ab9bf633fc2a3ff106ed965ba4a9b9",
  "contract_sha256": "sha256:bb76c1b22f8307be6e5780d50cabab891684449d5b164bd0e825e9e4e5c61e5b"
}
```

## Notes

- The existing `tests/unit/test_hr_leave_portal_stack.py` already fails before this work (it imports a stack class that doesn't exist). It is left unchanged and does not count as a regression.
- Nothing is deployed by this stage. The direct AgentCore browser call (and with it whether FR5.5's proxy is needed) is checked after deployment.
