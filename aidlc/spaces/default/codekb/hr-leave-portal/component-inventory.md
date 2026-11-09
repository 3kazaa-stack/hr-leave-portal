# Component Inventory: hr-leave-portal

Each heading below is a component name used in the Scope of Analysis block of `reverse-engineering-timestamp.md`.

## Infrastructure (CDK)

### CDK App
- **Location**: `app.py`, `cdk.json`
- **Responsibility**: instantiates the four stacks and wires objects between them (topic, Lambda, table, user pool, client). No env/account/region is set on stacks (environment-agnostic).
- **Depends on**: all four stack classes.

### NotificationStack
- **Location**: `hr_leave_portal/notification_stack.py` (construct id `HrLeavePortalNotifications`)
- **Responsibility**: SNS topic `HrEmailTopic` with an email subscription to a hard-coded address (TODO in code). Output `HrEmailTopicArn`.
- **Exposes**: `hr_email_topic`.

### BackendStack
- **Location**: `hr_leave_portal/backend_stack.py` (construct id `HrLeavePortalBackend`)
- **Responsibility**: DynamoDB `HrTable` (PK/SK, GSI1, on-demand, DESTROY); Lambda `ApiFunction` (Python 3.14, `handler.lambda_handler`, asset `api/`, FastAPI layer from SSM `/hr-leave-portal/fastapi-layer-arn`); Cognito `HrUserPool` + `HrUserPoolClient`; API Gateway `HrApi` (LambdaRestApi, Cognito authorizer, CORS all). Outputs `ApiUrl`, `TableName`, `UserPoolId`, `UserPoolClientId`.
- **Exposes**: `api_function`, `table`, `user_pool`, `user_pool_client`, `api`.

### StateMachineStack
- **Location**: `hr_leave_portal/state_machine_stack.py` (construct id `HrLeavePortalStateMachine`)
- **Responsibility**: loads the ASL JSON, injects the topic ARN, creates `CfnStateMachine` `HrStateMachine` with a role allowed `bedrock:InvokeModel` (`*`), SNS publish, `cloudwatch:PutMetricData` (`*`). Adds `HR_STATE_MACHINE_ARN` env and `states:StartExecution` to `ApiFunction`. Output `HrStateMachineArn`.
- **Depends on**: NotificationStack (topic), BackendStack (Lambda).

### AgentRuntimeStack
- **Location**: `hr_leave_portal/agent_runtime_stack.py` (construct id `HrLeavePortalAgentRuntime`)
- **Responsibility**: AgentCore `Runtime` `hrAgent` from the image URI in SSM `/hr-leave-portal/agent-image-uri`, HTTP protocol, Cognito JWT authorizer (pool + client from BackendStack), env `TABLE_NAME`, `HR_EMAIL_TOPIC_ARN`. Grants table read/write, topic publish, Bedrock invoke (`*`), ECR pull. Output `AgentRuntimeArn`.
- **Depends on**: BackendStack (table, user pool, client), NotificationStack (topic).

### HR State Machine Definition
- **Location**: `state_machines/hr_state_machine_definition.json`
- **Responsibility**: JSONata workflow: `Route By Request Type` → (`Build TimeOff Body` | `Bedrock InvokeModel`) → `SNS Publish` → `PutMetricData`.

### Build Scripts
- **Location**: `scripts/build_layer.sh`, `scripts/build_and_push_agent.sh`
- **Responsibility**: publish the FastAPI layer (x86_64, Python 3.14) and push the agent image (`linux/arm64`, Finch or Docker) to ECR repo `hr-agent`; both write the result to SSM for CDK.

## Backend API (`api/`)

### API Handler
- **Location**: `api/handler.py`
- **Responsibility**: FastAPI app "HR Leave Portal", CORS middleware (`*`), includes the three routers, `lambda_handler = Mangum(app)`.

### API Models
- **Location**: `api/models.py`
- **Responsibility**: Pydantic inputs `EmployeeIn`, `LeaveIn`, `LeaveUpdate`, `TimeOffRequestIn`, `HrRequestIn`. No response models.

### Employee Controller
- **Location**: `api/controllers/employee_controller.py`
- **Responsibility**: `POST /employees`, `GET /employees`, `GET /employees/{employee_id}`.
- **Depends on**: Employee Service.

### Leave Controller
- **Location**: `api/controllers/leave_controller.py`
- **Responsibility**: `POST /employees/{id}/leave`, `PUT /employees/{id}/leave/{start_date}`, `GET /employees/{id}/leave`.
- **Depends on**: Leave Service.

### HR Request Controller
- **Location**: `api/controllers/hr_request_controller.py`
- **Responsibility**: `POST /hr-requests/time-off`, `POST /hr-requests` (both 202).
- **Depends on**: HR Request Service.

### Employee Service
- **Location**: `api/services/employee_service.py`
- **Responsibility**: create/save/get/list/list-by-hire-date employees in DynamoDB (`TABLE_NAME`).

### Leave Service
- **Location**: `api/services/leave_service.py`
- **Responsibility**: save leave, list leave by employee and optional month.

### HR Request Service
- **Location**: `api/services/hr_request_service.py`
- **Responsibility**: `StartExecution` on `HR_STATE_MACHINE_ARN` with `TimeOff` or `BenefitsInquiry` input; returns `executionArn`.

## HR Agent (`hrAgent/`)

### Agent Entrypoint
- **Location**: `hrAgent/app/agent/main.py`
- **Responsibility**: `BedrockAgentCoreApp` with an async streaming `@app.entrypoint`; builds/caches a Strands `Agent` per `(session_id, actor_id)` with the HR system prompt and 11 tools.
- **Depends on**: Payload Parser, Model Loader, Memory Session Manager, Agent Employee Tools, Agent Leave Tools, Agent Email Tools.

### Payload Parser
- **Location**: `hrAgent/app/agent/parse.py`
- **Responsibility**: validate payload; return `(prompt | messages, actorId)`.

### Model Loader
- **Location**: `hrAgent/app/agent/model/load.py`
- **Responsibility**: `BedrockModel(model_id="us.amazon.nova-2-lite-v1:0")`.

### Memory Session Manager
- **Location**: `hrAgent/app/agent/memory/session.py`
- **Responsibility**: returns an `AgentCoreMemorySessionManager` when `MEMORY_AGENTMEMORY_ID` is set, else `None` (the deployed CDK runtime does not set it).

### Agent Employee Tools
- **Location**: `hrAgent/app/agent/tools/employee_tools.py`
- **Responsibility**: create/save/get/list/list-by-hire-date/delete employees in DynamoDB.

### Agent Leave Tools
- **Location**: `hrAgent/app/agent/tools/leave_tools.py`
- **Responsibility**: save/list leave in DynamoDB.

### Agent Email Tools
- **Location**: `hrAgent/app/agent/tools/email_tools.py`
- **Responsibility**: draft a leave email with Bedrock `global.anthropic.claude-sonnet-5`; publish an email to the HR SNS topic.

### AgentCore Project Config
- **Location**: `hrAgent/agentcore/agentcore.json`, `aws-targets.json`, `hrAgent/dev.sh`, `hrAgent/app/agent/Dockerfile`, `pyproject.toml`
- **Responsibility**: AgentCore CLI project (runtime `agent`, Container build, HTTP; memory `agentMemory` with SEMANTIC, USER_PREFERENCE, SUMMARIZATION, EPISODIC strategies); local dev launcher; Python 3.12-slim image running `opentelemetry-instrument python -m main` as non-root user.

## Front End (`ui/`)

### UI App Shell
- **Location**: `ui/src/main.tsx`, `ui/src/App.tsx`, `ui/index.html`, `ui/src/App.css`, `ui/src/index.css`
- **Responsibility**: unmodified Vite React-TS template. `main.tsx` renders `<App />` in `StrictMode` into `#root`. `App.tsx` renders one counter button and imports `reactLogo`/`viteLogo` without using them. Page title is `ui`. No routing, auth, API client, Amplify configuration, or environment variables.

### UI Build Config
- **Location**: `ui/package.json`, `ui/vite.config.ts`, `ui/tsconfig.json`, `ui/tsconfig.app.json`, `ui/tsconfig.node.json`, `ui/eslint.config.js`
- **Responsibility**: Vite 8 + `@vitejs/plugin-react`; scripts `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`; strict-ish TS (`noUnusedLocals`, `noUnusedParameters`); ESLint flat config with react-hooks and react-refresh. Dependencies already include `aws-amplify` and `@aws-amplify/ui-react` (unused).

## Other

### Project Scaffold Stub
- **Location**: `src/hr_leave_portal/__init__.py`
- **Responsibility**: `main()` printing a greeting, referenced by `[project.scripts]` in `pyproject.toml`. Not used by the CDK app.

### CDK Unit Test
- **Location**: `tests/unit/test_hr_leave_portal_stack.py`
- **Responsibility**: stale `cdk init` sample that imports a nonexistent `HrLeavePortalStack`; fails on import.

## Gaps Relevant to the Intent

- No UI hosting stack (S3 bucket, CloudFront distribution, Route 53, certificate) exists.
- No component passes stack outputs (API URL, user pool, client, runtime ARN, region) to the UI.
- No proxy between a browser and the AgentCore runtime exists.
