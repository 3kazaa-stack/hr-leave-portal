# Test Results: Build and Test (2026-11-09)

All checks ran on macOS in this workspace. UI tests run in Vitest with the jsdom DOM emulator; none ran in a real browser engine.

## Build

| Check | Command | Exit | Result |
|---|---|---|---|
| UI lint | `npm --prefix ui run lint` | 0 | 0 problems |
| UI build | `npm --prefix ui run build` | 0 | Built `ui/dist`. Advisory warning: the main JS chunk is 891.77 kB (246.54 kB gzip), over Vite's 500 kB notice |
| CDK synth | `CDK_OUTDIR=cdk.out/build-and-test-synth uv run python app.py` | 0 | All 6 stack templates produced. The Backend template references `UiDistribution` (5 references) for the CORS origin |

## Unit Tests

Commands from `construction/code-generation/unit-test-instructions.md`, each run once:

| Suite | Command | Exit | Total | Passed | Failed | Skipped |
|---|---|---|---|---|---|---|
| UI (11 files) | `npm --prefix ui test` (the same 11 files the instructions list) | 0 | 35 | 35 | 0 | 0 |
| Python (3 files) | `uv run pytest tests/unit/test_api_cors.py tests/unit/test_agent_actor.py tests/unit/test_ui_stacks.py` | 0 | 17 | 17 | 0 | 0 |

The UI count is 35 rather than Code Generation's 32 because this stage added 3 tests:

- `ui/src/pages/EmployeeDetailPage.test.tsx`, FR3.3: editing leave sends a PUT on the original start date, and the start date can't be edited.
- `ui/src/i18n/i18n.test.ts`, FR9.1: the first visit is in Arabic only when the browser prefers Arabic.
- `ui/src/i18n/i18n.test.ts`, FR9.4: dates are shown per language on the Gregorian calendar, and invalid input is left as it is.

## Existing Suite (Regression Check)

| Command | Exit | Result |
|---|---|---|
| `uv run pytest tests/unit` | 2 | Collection error in `tests/unit/test_hr_leave_portal_stack.py`: `ModuleNotFoundError: No module named 'hr_leave_portal.hr_leave_portal_stack'` |

This error existed before this work. The code scan recorded it in `code-quality-assessment.md` and the requirements in NFR6. The file was not changed, and no other existing test exists. It is not a regression.

## Coverage

The express Testing Contract sets no line-coverage floor, and none is configured in the project, so no coverage report was produced. Coverage is measured as requirement coverage (see `cross-unit-traceability.md`).

## Failure Details

None. No command failed except the existing collection error above.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-STRATEGY-1 | `code-generation-plan.md` § Testing Contract `obligations.strategy_volume[0]`, as specified by requirements NFR6 | At least one verifiable test per requirement group FR1 to FR9 | Every group FR1 to FR9 has at least one test, plus 3 added here (FR3.3, FR9.1, FR9.4) | Test names carry FR ids; UI 35/35, Python 17/17 | build-and-test | Met |
| TC-STRATEGY-2 | Testing Contract `obligations.strategy_volume[1]` | A happy-path unit test per new component | Config, REST client, agent client, validation, i18n, theme tokens, the 3 pages, AppShell (with Brand and AuthHeader), ChatPanel, `api/cors.py`, agent `parse.py`, UI hosting stack, UI deployment stack, backend CORS changes, agent header allowlist: each has at least one passing test | Same runs as above | build-and-test | Met |
| TC-SCOPE-1 | Testing Contract `obligations.scope_floor[0]`, with NFR6's baseline | The existing suite is not made worse | Same single collection error as before the work; no new failures | `uv run pytest tests/unit` | build-and-test | Met |
| NFR3 | `requirements.md` NFR3 | `npm run build` and `npm run lint` finish with no errors | Both exit 0 | Build table above | build-and-test | Met |
| BROWSER-1 | `requirements.md` FR8.2, FR8.3, FR8.5, FR9.2 (no overflow after flipping layout), NFR4, NFR5, NFR7 | Visual style, RTL mirroring without overflow, streaming responsiveness, accessibility and browser support behave correctly in real browsers | Checked only in jsdom (DOM structure, attributes, `dir`/`lang`, streamed text order). No real browser engine ran | Vitest/jsdom runs above | build-and-test | Unverified (browser-only gap, called out at the approval gate) |

No `Pending` verdicts remain.
