# Build and Test Summary

## Overall Status

**Build: success. Tests: 52 passed, 0 failed.** The only failure is the collection error in `tests/unit/test_hr_leave_portal_stack.py`, which existed before this work.

- Prerequisites and commands: `build-instructions.md`.
- Raw results: `test-results.md`.

## Test Types Generated

| Type | Status |
|---|---|
| Unit (UI, Vitest + Testing Library on jsdom) | 11 files, 35 tests: 32 from Code Generation, 3 added here (FR3.3, FR9.1, FR9.4) |
| Unit (Python: API CORS, agent actor id, CDK assertions) | 3 files, 17 tests |
| Build checks | ESLint, `tsc -b` + Vite production build, full CDK synth of all 6 stacks |
| Integration / performance / security instruction files | Not generated: the test strategy is Minimal |

## Coverage Expectations

- The express scope sets no line-coverage floor, and none is configured.
- The Minimal strategy asks for at least one test per requirement group and a happy-path test per component. Both are met (see the matrix).
- Requirement coverage: 47 of 48 requirements are built. FR5.5 is deferred (see `cross-unit-traceability.md`).

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-STRATEGY-1 | Testing Contract `strategy_volume[0]`; NFR6 | At least one test per requirement group FR1 to FR9 | All 9 groups tested | `test-results.md` § Unit Tests | build-and-test | Met |
| TC-STRATEGY-2 | Testing Contract `strategy_volume[1]` | A happy-path test per new component | Every new component has at least one passing test | `test-results.md` § Unit Tests | build-and-test | Met |
| TC-SCOPE-1 | Testing Contract `scope_floor[0]`; NFR6 | Existing suite not made worse | Only the error that existed before | `uv run pytest tests/unit` | build-and-test | Met |
| NFR3 | `requirements.md` NFR3 | Lint and build with no errors | Both exit 0 | `test-results.md` § Build | build-and-test | Met |
| BROWSER-1 | FR8.2, FR8.3, FR8.5, FR9.2 layout, NFR4, NFR5, NFR7 | Correct in real browsers | jsdom only | Vitest runs | build-and-test | Unverified (browser-only gap, called out at the gate) |

## Readiness

- **Build-ready**: yes.
- **Test-ready**: yes. Unit suites are green and the commands are recorded.
- **Deployment-ready**: yes for `cdk deploy --all` (the synth passes). The behaviours below can only be confirmed after deploying.

## Known Limitations and Outstanding Items

- **Needs a deployed environment** (the deployment stages later in this plan own these checks):
  - The browser calls AgentCore directly (CORS and the Cognito access token). This decides FR5.5.
  - The forwarded `Authorization` header gives the agent the user's `sub` (FR6.3).
  - The browser can read API Gateway's own 401/403 responses (FR6.1).
- **Real-browser checks not run**: the look, the RTL layout, accessibility and browser support were checked only in jsdom.
- **Origins**: API Gateway's 401/403 responses carry only the CloudFront origin, so local dev on `localhost:5173` sees those errors as network errors.
- **Bundle size**: the 891 kB JS chunk warning is advisory.
- **Dependencies**: `npm audit` reported 10 moderate advisories, which have not been reviewed.
- **Old test file**: `tests/unit/test_hr_leave_portal_stack.py` still fails, as it did before this work. It is out of scope.
