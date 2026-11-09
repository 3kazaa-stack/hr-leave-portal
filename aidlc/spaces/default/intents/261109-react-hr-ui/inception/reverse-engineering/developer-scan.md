# Developer Code Scan: hr-leave-portal

Snapshot commit: `82fa07f8255eaaf4f32ab483a6ce4af1a6bb1cd9` · Scan date: 2026-11-09 · Breadth: full repo (`./`) · Depth: Minimal

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `app.py`, `cdk.json`, `pyproject.toml`, `.python-version`, `.gitignore`, `README.md`, `source.bat`
  - `api/` (`handler.py`, `models.py`, `controllers/*.py`, `services/*.py`)
  - `hr_leave_portal/` (`backend_stack.py`, `notification_stack.py`, `state_machine_stack.py`, `agent_runtime_stack.py`, `__init__.py`)
  - `state_machines/hr_state_machine_definition.json`
  - `scripts/build_layer.sh`, `scripts/build_and_push_agent.sh`
  - `hrAgent/` (`dev.sh`, `.gitignore`, `agentcore/agentcore.json`, `agentcore/aws-targets.json`, `app/agent/main.py`, `parse.py`, `model/`, `memory/`, `tools/`, `Dockerfile`, `.dockerignore`, `.gitignore`, `pyproject.toml`, `README.md`)
  - `ui/` (`package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `index.html`, `.gitignore`, `README.md`, `src/main.tsx`, `src/App.tsx`)
  - `src/hr_leave_portal/__init__.py`
  - `tests/` (`__init__.py`, `unit/__init__.py`, `unit/test_hr_leave_portal_stack.py`)
  - `tools/` (empty directory)
- **Skimmed only**:
  - `ui/src/App.css`, `ui/src/index.css` (Vite template styles)
  - `ui/src/assets/`, `ui/public/` (template images/icons, not opened)
  - `uv.lock`, `hrAgent/app/agent/uv.lock`, `ui/package-lock.json` (lockfiles, not read line by line)
  - `api/controllers/employee_controller.pycd` (empty stray file)
- **Left out**:
  - `.git/`
  - `.venv/`
  - `hrAgent/app/agent/.venv/`
  - `ui/node_modules/`
  - `cdk.out/`
  - `__pycache__/` (in `api/`, `api/controllers/`, `api/services/`, `hr_leave_portal/`)
  - `fastapi-layer.zip` (gitignored build output)
  - `hrAgent/agentcore/.env.local` (gitignored local secrets file, not opened)
  - `hrAgent/agentcore/.cli/traces/` (gitignored CLI scratch)
  - AI-DLC install and workspace (`.kiro/`, `aidlc/`, AI-DLC sections of `AGENTS.md` and `.gitignore`), per brief

### Packages Found
- `hr-leave-portal` (root) — CDK app (infrastructure) — Python 3.14 — defines 4 CloudFormation stacks
- `api` — AWS Lambda function source (FastAPI + Mangum) — Python 3.14 — REST API for employees, leave, HR requests
- `hrAgent/app/agent` (`agent`) — AgentCore Runtime container (Strands agent) — Python 3.12 image — conversational HR assistant
- `ui` — Vite + React 19 + TypeScript SPA — TypeScript — unmodified Vite template with Amplify deps installed
- `src/hr_leave_portal` — uv project-script stub (`main()` prints hello) — Python — unused scaffold

### Build System
- **Type**: uv (Python, `uv_build` backend) + AWS CDK v2 (`python3 app.py`); npm + Vite for `ui/`; uv + hatchling + Docker/Finch for the agent image
- **Config Files**: `pyproject.toml`, `uv.lock`, `cdk.json`, `.python-version`; `ui/package.json`, `ui/vite.config.ts`, `ui/tsconfig*.json`; `hrAgent/app/agent/pyproject.toml`, `Dockerfile`, `hrAgent/agentcore/agentcore.json`
- **Build Dependencies**: `scripts/build_layer.sh` → SSM `/hr-leave-portal/fastapi-layer-arn` → `BackendStack`; `scripts/build_and_push_agent.sh` → ECR `hr-agent` + SSM `/hr-leave-portal/agent-image-uri` → `AgentRuntimeStack`; `NotificationStack` + `BackendStack` → `StateMachineStack`, `AgentRuntimeStack`

### APIs Discovered
- REST (API Gateway `LambdaRestApi` proxy → FastAPI) — `api/controllers/` — 8 operations (see api-documentation.md)
- AgentCore Runtime HTTP invocation (`@app.entrypoint`, streaming) — `hrAgent/app/agent/main.py` — 1 entrypoint (`POST /invocations`)
- Step Functions state machine input contract — `state_machines/hr_state_machine_definition.json` — 2 request types
- Agent tool surface (Strands `@tool`) — `hrAgent/app/agent/tools/` + `main.py` — 11 tools

### Frameworks & Libraries
- aws-cdk-lib — >=2.273.0,<3 — infrastructure (incl. `aws_bedrockagentcore` L2)
- constructs — >=10.5.0,<11 — CDK construct base
- fastapi / pydantic / mangum / aws-lambda-powertools[tracer] — unpinned in layer build — REST API in Lambda (powertools installed, not used)
- boto3[crt] — >=1.43.121 (dev) — AWS SDK
- strands-agents — >=1.62.0,<2 — agent framework
- bedrock-agentcore[strands-agents] — >=1.18.1,<2 — AgentCore Runtime app + Memory integration
- aws-opentelemetry-distro — ~=0.21.0 — agent tracing
- react / react-dom — ^19.3.1 — UI
- aws-amplify — ^6.22.2; @aws-amplify/ui-react — ^6.15.7 — installed, not yet used
- vite ^8.3.6, typescript ~6.0.3, eslint ^10.14.0 — UI tooling
- pytest — 8.4.2 (dev)

### Test Coverage
- **Test Directories**: `tests/unit/`
- **Test Frameworks**: pytest + `aws_cdk.assertions`
- **Coverage Config**: absent
- The only test file imports `hr_leave_portal.hr_leave_portal_stack.HrLeavePortalStack`, which does not exist (stale `cdk init` sample). No tests for `api/`, `hrAgent/` or `ui/`.

### Code Quality Indicators
- **Linting**: ESLint flat config in `ui/eslint.config.js`; no Python linter/formatter configured
- **CI/CD**: none found (no `.github/`, buildspec, or pipeline files)
- **Documentation**: root `README.md` is the unedited CDK template (mentions a nonexistent SQS queue and `requirements.txt`); `hrAgent/app/agent/README.md` is the AgentCore CLI template, accurate for the payload contract; `ui/README.md` is the Vite template

### Technical Debt Signals
- Hard-coded personal email `HR_EMAIL_ADDRESS` with a TODO — `hr_leave_portal/notification_stack.py:8-9`
- Stale broken test — `tests/unit/test_hr_leave_portal_stack.py:3`
- `ui/src/App.tsx:2-3` imports `reactLogo`/`viteLogo` unused while `tsconfig.app.json` sets `noUnusedLocals: true` → `npm run build` (`tsc -b`) is expected to fail
- `CORSMiddleware(allow_origins=["*"])` and API Gateway `ALL_ORIGINS` — `api/handler.py:9-11`, `backend_stack.py:87-90`
- `resources=["*"]` for `bedrock:InvokeModel` and `cloudwatch:PutMetricData` — `state_machine_stack.py:37-45`, `agent_runtime_stack.py:56-63`
- `RemovalPolicy.DESTROY` on DynamoDB table and Cognito user pool — `backend_stack.py:31,74`
- Agent sample tool `add_numbers` left in production tool list — `hrAgent/app/agent/main.py:52-57`
- `actorId` taken from request body, not from the JWT — `hrAgent/app/agent/parse.py:31-36`
- `agentcore.json` declares `agentMemory`, but `AgentRuntimeStack` creates no Memory and never sets `MEMORY_AGENTMEMORY_ID` → memory session manager is `None` in the deployed runtime (`memory/session.py:10-15`)
- Module-level `os.environ[...]` reads in services/tools raise `KeyError` at import if env is missing (`api/services/*.py`, `hrAgent/app/agent/tools/*.py`)
- Duplicated DynamoDB access code in `api/services/` and `hrAgent/app/agent/tools/` (same key schema, two copies)
- No pagination on DynamoDB `query` calls (`employee_service.list_all`, `leave_service.list_for_employee`)
- Two Python packages named `hr_leave_portal` (`hr_leave_portal/` and `src/hr_leave_portal/`)
- Stray empty file `api/controllers/employee_controller.pycd`
- Unused dependency: `aws-lambda-powertools` in the layer

## Handoff Summary
- **Intent-relevant finding**: The REST API (`BackendStack`, `backend_stack.py:85-97`) is an API Gateway `LambdaRestApi` proxy to FastAPI with a Cognito User Pools authorizer on every method; the same user pool/client (`HrUserPool`, `HrUserPoolClient`, USER_PASSWORD + SRP flows, no hosted-UI domain, self sign-up off) also gates the AgentCore runtime `hrAgent` through `RuntimeAuthorizerConfiguration.using_cognito` (`agent_runtime_stack.py:36-47`). Stack outputs `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `AgentRuntimeArn` are what a UI needs. The existing `ui/` is an untouched Vite React-TS template with `aws-amplify` and `@aws-amplify/ui-react` already in `package.json` but not imported; no UI hosting stack exists.
- **Risks / follow-up**:
  - Browser → AgentCore: the runtime is invoked at the regional `bedrock-agentcore` data-plane endpoint with a Bearer JWT and `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id`; responses stream (async generator). Whether that endpoint answers browser CORS preflight is not established by this repo; design must decide direct call vs. a proxy (e.g. a Lambda/API route).
  - Token type: API Gateway Cognito authorizer validates the ID token by default; the AgentCore Cognito JWT authorizer checks `client_id` from the access token. The UI likely needs to send different tokens to each (verify at design).
  - No Gateway Responses with CORS headers are configured, so 401/403 from API Gateway reach the browser without CORS headers.
  - CORS is wildcard on both API Gateway and FastAPI; a UI stack should let the origin be tightened.
  - `ui` build is likely broken today (unused imports + `noUnusedLocals`).
  - The test suite is broken before any change (stale import); the test baseline will show a failure.
  - Deploying needs SSM parameters written by `scripts/` first; a new UI stack must fit this order (`app.py`).
