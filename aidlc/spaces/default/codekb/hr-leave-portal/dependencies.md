# Dependencies: hr-leave-portal

Library versions are listed once in `technology-stack.md`; this file records how the parts depend on each other and on outside resources.

## Internal Dependencies

### Between CDK stacks (`app.py`)

| Consumer | Uses | From |
|---|---|---|
| StateMachineStack | `hr_email_topic` | NotificationStack |
| StateMachineStack | `api_function` (adds env `HR_STATE_MACHINE_ARN` + `states:StartExecution` policy) | BackendStack |
| AgentRuntimeStack | `table`, `user_pool`, `user_pool_client` | BackendStack |
| AgentRuntimeStack | `hr_email_topic` | NotificationStack |

`StateMachineStack` mutates a BackendStack resource (the Lambda's env and role policy) with values from its own stack, so references run in both directions between these two stacks. A new UI stack would consume BackendStack (`api.url`, `user_pool`, `user_pool_client`) and AgentRuntimeStack (runtime ARN).

### Between Python modules

See the import graph in `code-structure.md`. Key points:
- `api/` and `hrAgent/` do not import each other; both encode the same DynamoDB key schema separately.
- `hrAgent/app/agent/tools/` has no `__init__.py` (namespace package import from `main.py`).
- Two packages share the name `hr_leave_portal` (`hr_leave_portal/` for CDK, `src/hr_leave_portal/` as the uv project package). `python3 app.py` resolves the root one first because the script directory leads `sys.path`.

### Runtime configuration (environment variables)

| Variable | Read by | Set by |
|---|---|---|
| `TABLE_NAME` | `api/services/employee_service.py`, `leave_service.py`; agent tools | BackendStack (Lambda); AgentRuntimeStack (runtime) |
| `HR_STATE_MACHINE_ARN` | `api/services/hr_request_service.py` | StateMachineStack |
| `HR_EMAIL_TOPIC_ARN` | `hrAgent/app/agent/tools/email_tools.py` | AgentRuntimeStack |
| `MEMORY_AGENTMEMORY_ID` | `hrAgent/app/agent/memory/session.py` | nothing in CDK (memory disabled when deployed by CDK) |
| `AWS_REGION` | `memory/session.py` | AgentCore runtime |
| `LOCAL_DEV` | documented in agent README | `.env.local` (not opened) |

## External Dependencies

### Build-time / deploy-time

| Dependency | Needed by | Produced by |
|---|---|---|
| SSM `/hr-leave-portal/fastapi-layer-arn` | BackendStack synth | `scripts/build_layer.sh` |
| Lambda layer `fastapi` (x86_64, python3.14) | `ApiFunction` | `scripts/build_layer.sh` |
| SSM `/hr-leave-portal/agent-image-uri` | AgentRuntimeStack synth | `scripts/build_and_push_agent.sh` |
| ECR repo `hr-agent` image (linux/arm64) | AgentCore Runtime | `scripts/build_and_push_agent.sh` |
| ECR Public `public.ecr.aws/docker/library/python:3.12-slim-trixie` | agent Dockerfile | Docker Hub library mirror |
| PyPI (or `UV_DEFAULT_INDEX`/`UV_INDEX`) | layer build, agent image | n/a |
| npm registry | `ui/` | n/a |
| CDK bootstrap in target account/region | all stacks (assets) | `cdk bootstrap` (not scripted) |

### Runtime

| Dependency | Used by |
|---|---|
| DynamoDB `HrTable` | API services, agent tools |
| Step Functions `HrStateMachine` | API HR request service |
| Bedrock model access for `us.amazon.nova-2-lite-v1:0` (cross-region inference profile) | state machine, agent |
| Bedrock model access for `global.anthropic.claude-sonnet-5` (global inference profile) | agent email tool |
| SNS `HrEmailTopic` + confirmed email subscription | state machine, agent email tool |
| Cognito `HrUserPool` | API Gateway authorizer, AgentCore JWT authorizer |
| CloudWatch | state machine metric, logs, OpenTelemetry traces from the agent |

## Dependency Risks

- Layer packages are unpinned; each `build_layer.sh` run can change versions.
- `mangum` is absent from the root dev dependency group, so running `api/handler.py` locally needs a manual install.
- The Bedrock role policies use `resources=["*"]`.
- The layer is x86_64 while the agent image is arm64; a change of Lambda architecture would need a rebuilt layer.
