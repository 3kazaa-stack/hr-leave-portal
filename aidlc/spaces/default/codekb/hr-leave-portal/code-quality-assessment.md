# Code Quality Assessment: hr-leave-portal

## Summary Ratings

| Dimension | Rating | Evidence |
|---|---|---|
| Naming clarity | good | Descriptive module and function names (`list_by_hire_date`, `start_time_off_request`); agent tools have full docstrings. |
| Function size | good | All functions are short (under ~30 lines); stacks are single constructors. |
| Error handling | fair | Pydantic validation at the API boundary and `parse.py` validation in the agent; only one explicit `404`; boto3 errors fall through to `500`; no logging in `api/`. |
| Test presence | poor | One stale test that fails on import; no tests for `api/`, `hrAgent/`, `ui/`. |
| Duplication | fair | DynamoDB access logic duplicated between `api/services/` and `hrAgent/app/agent/tools/`. |
| Dead code | fair | `add_numbers` sample tool, unused UI imports, `src/hr_leave_portal` stub, empty `employee_controller.pycd`, empty `tools/` folder, unused powertools. |

## Testing

- **Framework**: pytest 8.4.2 with `aws_cdk.assertions`.
- **Tests present**: `tests/unit/test_hr_leave_portal_stack.py` (2 tests) imports `hr_leave_portal.hr_leave_portal_stack.HrLeavePortalStack`, which does not exist. A baseline run is expected to fail at collection (not run in this scan, per brief).
- **Coverage config**: none.
- **UI tests**: none; no test runner in `ui/package.json`.

## Linting and Formatting

- `ui/eslint.config.js`: ESLint flat config (`@eslint/js` recommended, `typescript-eslint` recommended, react-hooks, react-refresh/vite).
- `ui/tsconfig.app.json`: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. `ui/src/App.tsx` lines 2-3 import unused `reactLogo` and `viteLogo`, so `npm run build` (`tsc -b`) is expected to fail.
- Python: no Ruff/Black/flake8/mypy configuration. Minor style drift (trailing whitespace lines in `employee_service.py`, `leave_controller.py`).

## CI/CD

None: no GitHub Actions, CodePipeline, or buildspec. Deployment is manual: run the two scripts, then `cdk deploy`.

## Documentation

- Root `README.md`: unedited `cdk init` text; describes an SQS queue and `requirements.txt` that do not exist.
- `hrAgent/app/agent/README.md`: AgentCore CLI template; the payload section matches `parse.py`.
- `ui/README.md`: Vite template.
- Inline: agent tool docstrings are good; scripts have helpful comments; API code has few docstrings.

## Security Observations

| Finding | Location | Note |
|---|---|---|
| Wildcard CORS | `api/handler.py:9-11`, `backend_stack.py:87-90` | Any origin may call the API with a valid token. |
| No CORS on API Gateway error responses | `backend_stack.py` | 401/403 lack CORS headers. |
| No authorization beyond authentication | `api/`, `hrAgent/` | Any user in the pool can read and change all employees and leave; the agent can delete employees. |
| Caller-supplied identity | `hrAgent/app/agent/parse.py` (`actorId`), `api/models.py` (`user_id`) | Not derived from the JWT. |
| IAM `resources=["*"]` | `state_machine_stack.py:37-45`, `agent_runtime_stack.py:56-63,69-71` | `ecr:GetAuthorizationToken` requires `*`; Bedrock and CloudWatch could be scoped. |
| Hard-coded personal email | `notification_stack.py:9` | TODO says to change it. |
| `RemovalPolicy.DESTROY` | `backend_stack.py:31,74` | Table and user pool are deleted with the stack. |
| Prompt injection to email | `state_machine_definition.json`, `email_tools.py` | User prompt text goes to an LLM and then to the HR mailbox. |
| Secrets | none found in scanned files | `hrAgent/agentcore/.env.local` is gitignored and was not opened. |

## Technical Debt

- TODO count: 1 (`notification_stack.py:8`). No FIXME/HACK, no `# noqa` or `eslint-disable`.
- Lists are not paginated (`employee_service.list_all`, `leave_service.list_for_employee`, agent `list_*`).
- Unconditional `put_item` everywhere: `POST /employees/{id}/leave` silently overwrites leave with the same start date.
- Inconsistent JSON casing between resources (camelCase vs snake_case).
- AgentCore Memory declared but not provisioned.
- `lru_cache` keyed by caller-supplied `actor_id` holds up to 128 agents per container.
- No HR request status endpoint.

## Readiness for the Intent

- The REST API and both auth paths are usable by a SPA once tokens are wired; expect to address CORS on error responses and token type per target (ID token for API Gateway, likely access token for AgentCore).
- The UI starts from a template with a failing type check; fix the unused imports when replacing `App.tsx`.
- No regression suite protects the backend; changes to `backend_stack.py` (e.g. CORS origins) have no tests today.
