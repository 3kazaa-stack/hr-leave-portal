# Unit Test Instructions: React HR Portal UI, hrAgent Chat and UI Hosting Stacks

Strategy: Minimal (requirement-driven: about one test per requirement group, a happy-path floor per component). Methodology: test-after (see the Testing Contract in `code-generation-plan.md`).

## Test Framework Setup

### UI (`ui/`)
- Runner: Vitest with the `jsdom` environment, configured in the `test` block of `ui/vite.config.ts`.
- Setup file: `ui/src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and clears `localStorage` and `document.documentElement` attributes after each test.
- Libraries: `@testing-library/react`, `@testing-library/user-event`.
- Install once: `npm --prefix ui install`.

### Python (repo root)
- Runner: pytest 8.4.2 from the root `pyproject.toml` dev group, run through `uv run`.
- CDK assertions: `aws_cdk.assertions.Template` (from `aws-cdk-lib`).
- The agent test puts `hrAgent/app/agent` on `sys.path` and imports `parse` only. It needs no Strands or AgentCore packages.
- The API test imports `api/cors.py` only. It needs no Mangum.

## How to Run This Work's Tests

Run each command from the repository root. Every command lists only the test files this work adds.

UI:

```bash
npm --prefix ui test -- src/config/config.test.ts src/api/client.test.ts src/agent/agentClient.test.ts src/pages/validation.test.ts src/i18n/i18n.test.ts src/theme/tokens.test.ts src/pages/EmployeesPage.test.tsx src/pages/EmployeeDetailPage.test.tsx src/pages/HrRequestsPage.test.tsx src/components/ChatPanel.test.tsx src/components/AppShell.test.tsx
```

Python (backend, agent, CDK):

```bash
uv run pytest tests/unit/test_api_cors.py tests/unit/test_agent_actor.py tests/unit/test_ui_stacks.py
```

Runner readiness check (Plan Step 2, before the first test step):

```bash
npm --prefix ui test -- src/test/smoke.test.ts
```

Run the UI commands through `npm --prefix ui test` (or from inside `ui/`). `npm --prefix ui exec -- vitest` keeps the repository root as the working directory, so Vitest never loads `ui/vite.config.ts` (jsdom and the setup file) and the DOM tests fail.

## Test Map

| Test file | Covers |
|---|---|
| `ui/src/config/config.test.ts` | FR7.3: valid config loads; missing field gives a readable error |
| `ui/src/api/client.test.ts` | FR1.4: ID token sent; FR1.5: 401 raises session-expired |
| `ui/src/agent/agentClient.test.ts` | FR5.2: streamed chunks in order, Bearer access token and session id sent; FR5.4: 500 raises a typed error |
| `ui/src/pages/validation.test.ts` | FR2.2, FR2.3, FR3.2, FR3.4, FR4.2 rules, pass and fail |
| `ui/src/i18n/i18n.test.ts` | FR9.3: `en`/`ar` key sets match; FR9.2: Arabic sets `dir="rtl"` `lang="ar"` |
| `ui/src/theme/tokens.test.ts` | FR8.1: no colour literal outside `tokens.css` |
| `ui/src/pages/EmployeesPage.test.tsx` | FR2.1 list renders; FR2.3 empty name blocked |
| `ui/src/pages/EmployeeDetailPage.test.tsx` | FR3.1 leave list; FR3.4 overwrite warning |
| `ui/src/pages/HrRequestsPage.test.tsx` | FR4.1 `user_id` = Cognito `sub`; FR4.3 confirmation |
| `ui/src/components/ChatPanel.test.tsx` | FR5.2 text shows while streaming; FR5.3 new conversation changes the session id |
| `ui/src/components/AppShell.test.tsx` | FR1.1 sign-up hidden; FR8.4 logo fallback to text title |
| `tests/unit/test_api_cors.py` | FR6.2: configured origins, localhost default, never `*` |
| `tests/unit/test_agent_actor.py` | FR6.3: `sub` from the JWT wins over the body `actorId`; no header gives `"default"` |
| `tests/unit/test_ui_stacks.py` | FR7.1 private bucket + OAC + HTTPS redirect; FR7.4 SPA error responses; FR7.6 `UiUrl` output; FR6.1 `DEFAULT_4XX` Gateway Response |

## Expected Coverage Targets

The express scope sets no line-coverage floor, and none is configured. The obligation is the Minimal strategy: every requirement group FR1 to FR9 has at least one test above, and every new component has a happy-path test. Build and Test checks this on the full suite.

## Mocking and Stubbing

- **Amplify Auth**: `vi.mock('aws-amplify/auth')`. `fetchAuthSession` returns fixed `idToken`/`accessToken` strings and `getCurrentUser` returns `{ username, userId: 'sub-123' }`.
- **fetch**: `vi.spyOn(globalThis, 'fetch')`. For the agent stream, return `new Response(new ReadableStream(...))` that enqueues SSE lines such as `data: {"event":{"contentBlockDelta":{"delta":{"text":"Hel"}}}}\n\n`.
- **Authenticator**: in `AppShell.test.tsx`, mock `@aws-amplify/ui-react` so `Authenticator` records its props; assert `hideSignUp` is true.
- **CDK**: synthesize the stacks inside one `cdk.App` with a fixed `env` (`account="111111111111"`, `region="us-east-1"`). SSM `value_for_string_parameter` stays a token, so no AWS calls are made. `BucketDeployment` needs `ui/dist` to exist; the test creates a temporary `ui/dist` with an `index.html` inside the project's pytest `tmp_path` and passes its path to the stack.
- **Agent JWT**: build the token in the test as `header.payload.sig` with base64url JSON (`{"sub": "user-x"}`). No signing library is needed because the agent does not re-verify the signature.

## Test Data

- Employees: `{ employeeId: 'a1b2c3d4', name: 'Jane Doe', department: 'Finance', startDate: '2026-01-15', role: 'employee' }` plus storage keys, to check that they are not displayed.
- Leave: `{ employeeId: 'a1b2c3d4', startDate: '2026-12-01', endDate: '2026-12-05', note: '' }`.
- Fixtures live next to the tests in `ui/src/test/fixtures.ts`. No test reaches AWS.

## Existing Suite

`tests/unit/test_hr_leave_portal_stack.py` fails before this work because it imports a missing stack class. It is not part of the commands above and is not changed.
