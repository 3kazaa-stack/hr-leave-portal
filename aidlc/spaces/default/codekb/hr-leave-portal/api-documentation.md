# API Documentation: hr-leave-portal

## 1. REST API (`HrApi`)

- **Base URL**: CloudFormation output `HrLeavePortalBackend.ApiUrl` (API Gateway REST API, stage `prod` by CDK default, form `https://<id>.execute-api.<region>.amazonaws.com/prod/`).
- **Integration**: `LambdaRestApi` proxy (`ANY /` and `ANY /{proxy+}`) → Lambda `ApiFunction` → FastAPI via Mangum (`api/handler.py`). Timeout 10 s, 512 MB.
- **Auth**: every method uses the Cognito User Pools authorizer `HrAuthorizer` on `HrUserPool`. Send `Authorization: <Cognito ID token>` (no OAuth scopes configured, so the ID token is what the authorizer accepts). Missing/invalid token → `401` from API Gateway (no CORS headers on that response).
- **CORS**: API Gateway preflight allows all origins and methods; FastAPI `CORSMiddleware` allows `*` origins, methods, headers.
- **Errors**: FastAPI defaults: `422` with `{"detail": [...]}` for validation errors, `404 {"detail": "Employee not found"}`, unhandled boto3 errors → `500` (`Internal Server Error`).
- **Rate limiting**: none configured beyond API Gateway account defaults.
- **Versioning / OpenAPI file**: none in repo; FastAPI would serve `/openapi.json` and `/docs` through the proxy (behind the authorizer).

### Endpoints

| # | Method & path | Request | Success response | Source |
|---|---|---|---|---|
| 1 | `POST /employees` | Body `EmployeeIn`: `name` str, `department` str, `startDate` date `YYYY-MM-DD`, `role` str = `"employee"` | `201` employee item | `employee_controller.py:9-11` |
| 2 | `GET /employees` | Query optional `hiredFrom`, `hiredTo` (dates; both needed to filter, inclusive) | `200 {"employees": [Employee]}` | `employee_controller.py:14-23` |
| 3 | `GET /employees/{employee_id}` | Path `employee_id` | `200` employee item, or `404` | `employee_controller.py:26-32` |
| 4 | `POST /employees/{employee_id}/leave` | Body `LeaveIn`: `startDate` date, `endDate` date, `note` str = `""` | `201` leave item | `leave_controller.py:11-14` |
| 5 | `PUT /employees/{employee_id}/leave/{start_date}` | Path `start_date` date; body `LeaveUpdate`: `endDate` date, `note` str = `""` | `200` leave item (create-or-replace) | `leave_controller.py:17-21` |
| 6 | `GET /employees/{employee_id}/leave` | Query optional `month` matching `^\d{4}-\d{2}$` | `200 {"leave": [Leave]}` | `leave_controller.py:24-28` |
| 7 | `POST /hr-requests/time-off` | Body `TimeOffRequestIn`: `user_id` str, `start_date` date, `end_date` date | `202 {"executionArn": str}` | `hr_request_controller.py:9-11` |
| 8 | `POST /hr-requests` | Body `HrRequestIn`: `user_id` str, `prompt` str | `202 {"executionArn": str}` | `hr_request_controller.py:14-16` |

Not exposed by the API: update employee (other than a new id), delete employee, delete leave, HR request status/result, any "current user" endpoint.

### Response Shapes (DynamoDB items returned as-is)

```json
// Employee
{ "PK": "USER", "SK": "a1b2c3d4", "GSI1PK": "USER_BY_DATE", "GSI1SK": "2026-01-15",
  "employeeId": "a1b2c3d4", "name": "Jane Doe", "department": "Finance",
  "startDate": "2026-01-15", "role": "employee" }

// Leave
{ "PK": "a1b2c3d4", "SK": "2026-12-01", "employeeId": "a1b2c3d4",
  "startDate": "2026-12-01", "endDate": "2026-12-05", "note": "" }
```

Notes for a UI client:
- Responses include the storage keys (`PK`, `SK`, `GSI1*`).
- Lists are a single DynamoDB `query` page (no pagination token returned; 1 MB page limit).
- `GET /employees/{id}/leave` without `month` returns every item under `PK=<id>`.
- Field casing differs: camelCase for employees/leave, snake_case for HR requests.
- `user_id` in HR requests is free text; nothing checks it against an employee or the caller.

## 2. AgentCore Runtime (`hrAgent`)

- **Identifier**: CloudFormation output `HrLeavePortalAgentRuntime.AgentRuntimeArn`; runtime name `hrAgent`; protocol HTTP; container listens on 8080 (`Dockerfile`).
- **Invocation** (AgentCore data plane): `POST https://bedrock-agentcore.<region>.amazonaws.com/runtimes/<URL-encoded runtime ARN>/invocations?qualifier=DEFAULT`. The repo defines no explicit runtime endpoint, so the default endpoint applies.
- **Auth**: Cognito custom JWT authorizer (`RuntimeAuthorizerConfiguration.using_cognito(user_pool, [user_pool_client])`): `Authorization: Bearer <JWT>` from `HrUserPool`, issued to `HrUserPoolClient`. Allowed-client matching uses the `client_id` claim (Cognito access token). SigV4/IAM callers are not the configured path.
- **Headers**: `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` sets `context.session_id` (reuse to continue a conversation; the code falls back to `"default-session"` when absent). AgentCore requires session ids of at least 33 characters.
- **Body** (`parse.py`):

```json
{ "prompt": "List employees hired in 2026", "actorId": "user-123" }
```

  - `prompt` string, or `messages` array (`[{"role": ..., "content": [{...}]}]`, takes precedence; trailing `toolUse` blocks stripped).
  - `actorId` string, defaults to `"default"`; caller-supplied and not tied to the JWT.
  - Invalid shapes raise `ValueError` (surfaced as a runtime error).
- **Response**: the entrypoint is an async generator, so the runtime streams events (Server-Sent Events, `text/event-stream`). Each event is a Strands stream event dict `{"event": {...}}` (Bedrock ConverseStream shapes such as `contentBlockDelta.delta.text`, `contentBlockStart`, `messageStop`); empty `contentBlockStart` events are filtered.
- **CORS**: not configured in this repo. Whether the AgentCore data-plane endpoint accepts browser preflight requests must be checked before a UI calls it directly.
- **Local dev**: `hrAgent/dev.sh` → `agentcore dev` on `0.0.0.0:8080` (`POST /invocations`).

### Agent Tools (callable by the model, not over HTTP)

| Tool | Effect |
|---|---|
| `create_employee(name, department, start_date, role)` | PutItem new employee (generated id) |
| `save_employee(employee_id, name, department, start_date, role)` | PutItem create/overwrite |
| `get_employee(employee_id)` | GetItem |
| `list_employees()` | Query `PK=USER` |
| `list_employees_by_hire_date(hired_from, hired_to)` | Query GSI1 between dates |
| `delete_employee(employee_id)` | DeleteItem |
| `save_leave(employee_id, start_date, end_date, note)` | PutItem leave |
| `list_leave(employee_id, month)` | Query `PK=<id>`, optional month prefix |
| `generate_leave_email(employee_name, start_date, end_date, reason)` | Bedrock InvokeModel `global.anthropic.claude-sonnet-5` |
| `send_email_to_hr(subject, body)` | SNS Publish to `HR_EMAIL_TOPIC_ARN` |
| `add_numbers(a, b)` | Template sample tool |

## 3. Step Functions Input Contract (`HrStateMachine`)

Started only by the API (`hr_request_service.py`).

```json
{ "hr_request_type": "TimeOff", "user_id": "u1", "start_date": "2026-12-01", "end_date": "2026-12-05" }
{ "hr_request_type": "BenefitsInquiry", "user_id": "u1", "prompt": "..." }
```

`TimeOff` → fixed email text; any other type → Bedrock `us.amazon.nova-2-lite-v1:0` (`maxTokens` 200) → SNS publish → CloudWatch `HR/HrRequests` metric with `hr_request_type` and `user_id` dimensions.

## 4. Stack Outputs a UI Will Need

| Stack | Output |
|---|---|
| `HrLeavePortalBackend` | `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `TableName` |
| `HrLeavePortalAgentRuntime` | `AgentRuntimeArn` |
| `HrLeavePortalNotifications` | `HrEmailTopicArn` |
| `HrLeavePortalStateMachine` | `HrStateMachineArn` |

No output gives the region explicitly or a Cognito domain (none exists).
