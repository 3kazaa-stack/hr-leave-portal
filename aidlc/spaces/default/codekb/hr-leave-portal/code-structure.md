# Code Structure: hr-leave-portal

## Repository Layout

```text
hr-leave-portal/
├── app.py                         # CDK app entry: instantiates the 4 stacks
├── cdk.json                       # CDK toolkit config ("python3 app.py") + feature flags
├── pyproject.toml / uv.lock       # uv project: aws-cdk-lib, constructs; dev: boto3, fastapi, pytest, uvicorn
├── .python-version                # 3.14
├── README.md                      # unedited `cdk init` template text
├── source.bat                     # Windows venv helper from `cdk init`
├── api/                           # Lambda asset for ApiFunction (FastAPI)
│   ├── handler.py                 # FastAPI app, CORS middleware, routers, Mangum handler
│   ├── models.py                  # Pydantic request models
│   ├── controllers/               # APIRouter per resource
│   │   ├── employee_controller.py
│   │   ├── leave_controller.py
│   │   ├── hr_request_controller.py
│   │   └── employee_controller.pycd   # empty stray file
│   └── services/                  # boto3 data access / workflow start
│       ├── employee_service.py
│       ├── leave_service.py
│       └── hr_request_service.py
├── hr_leave_portal/               # CDK stacks (the package app.py imports)
│   ├── backend_stack.py
│   ├── notification_stack.py
│   ├── state_machine_stack.py
│   └── agent_runtime_stack.py
├── state_machines/
│   └── hr_state_machine_definition.json   # ASL (JSONata) definition
├── scripts/
│   ├── build_layer.sh             # builds + publishes FastAPI Lambda layer, writes SSM
│   └── build_and_push_agent.sh    # builds + pushes agent image to ECR, writes SSM
├── hrAgent/                       # AgentCore CLI project
│   ├── dev.sh                     # runs `agentcore dev` with exported creds
│   ├── agentcore/
│   │   ├── agentcore.json         # runtime + memory declaration (managedBy CDK)
│   │   └── aws-targets.json       # []
│   └── app/agent/                 # container build context
│       ├── main.py                # BedrockAgentCoreApp entrypoint, Strands Agent, tool list
│       ├── parse.py               # payload validation (prompt | messages, actorId)
│       ├── model/load.py          # BedrockModel(us.amazon.nova-2-lite-v1:0)
│       ├── memory/session.py      # AgentCore Memory session manager (if MEMORY_AGENTMEMORY_ID)
│       ├── tools/                 # Strands @tool functions (no __init__.py: namespace package)
│       │   ├── employee_tools.py
│       │   ├── leave_tools.py
│       │   └── email_tools.py
│       ├── Dockerfile, .dockerignore, pyproject.toml, uv.lock, README.md
├── ui/                            # Vite React-TS template (not yet built out)
│   ├── index.html, vite.config.ts, eslint.config.js, tsconfig*.json, package.json
│   ├── public/ (favicon.svg, icons.svg)
│   └── src/ (main.tsx, App.tsx, App.css, index.css, assets/)
├── src/hr_leave_portal/__init__.py   # uv scaffold stub: main() prints hello
├── tests/unit/test_hr_leave_portal_stack.py   # stale cdk-init test
└── tools/                         # empty
```

## File Classification

| Category | Files |
|---|---|
| Controller/Handler | `api/handler.py`, `api/controllers/*.py`, `hrAgent/app/agent/main.py` (entrypoint) |
| Model/Entity | `api/models.py` (Pydantic DTOs) |
| Service/UseCase | `api/services/hr_request_service.py` |
| Repository/DAO | `api/services/employee_service.py`, `api/services/leave_service.py`, `hrAgent/app/agent/tools/employee_tools.py`, `leave_tools.py` |
| Utility/Helper | `hrAgent/app/agent/parse.py`, `model/load.py`, `memory/session.py`, `tools/email_tools.py` |
| Configuration / IaC | `app.py`, `cdk.json`, `hr_leave_portal/*.py`, `state_machines/*.json`, `hrAgent/agentcore/*.json`, `pyproject.toml` files, `Dockerfile`, `ui/*.config.*`, `ui/tsconfig*.json` |
| Middleware | CORS middleware in `api/handler.py` |
| Build scripts | `scripts/*.sh`, `hrAgent/dev.sh`, `source.bat` |
| Test | `tests/unit/test_hr_leave_portal_stack.py` |
| Static/Asset | `ui/index.html`, `ui/src/*.css`, `ui/src/assets/*`, `ui/public/*` |
| UI component | `ui/src/main.tsx`, `ui/src/App.tsx` |

## Code Patterns

- **Controller → service layering (api/)**: each `APIRouter` validates input with Pydantic, calls a module-level service function, and returns plain dicts. Errors: only `GET /employees/{id}` raises `HTTPException(404)`; all others let boto3 exceptions become FastAPI 500s.
- **Flat imports in the Lambda**: `api/handler.py` imports `controllers`, `models`, `services` as top-level modules because the Lambda asset root is `api/`. Running locally needs `api/` on `PYTHONPATH`.
- **Module-level clients and env reads**: services and tools create boto3 clients/tables at import and read `os.environ["TABLE_NAME"]`, `["HR_STATE_MACHINE_ARN"]`, `["HR_EMAIL_TOPIC_ARN"]`; a missing variable fails at import.
- **Create-or-replace writes**: all writes are unconditional `put_item`.
- **Camel-case JSON** in employee/leave models (`startDate`, `endDate`) but snake_case in HR request models (`user_id`, `start_date`, `end_date`).
- **Agent**: Strands `Agent` built per `(session_id, actor_id)` and cached with `lru_cache(maxsize=128)`; `NullConversationManager`; `stream_async` events filtered and yielded (streaming response).
- **CDK**: one stack per concern, objects passed between stacks as constructor arguments; external build outputs pulled from SSM at synth time.

## Internal Dependency Graph

```text
app.py -> hr_leave_portal.{notification_stack, backend_stack, state_machine_stack, agent_runtime_stack}
state_machine_stack -> state_machines/hr_state_machine_definition.json (read from cwd)
api/handler.py -> controllers.{employee,leave,hr_request}_controller
controllers/employee_controller -> models.EmployeeIn, services.employee_service
controllers/leave_controller -> models.{LeaveIn, LeaveUpdate}, services.leave_service
controllers/hr_request_controller -> models.{HrRequestIn, TimeOffRequestIn}, services.hr_request_service
hrAgent/app/agent/main.py -> model.load, parse, memory.session, tools.{email,employee,leave}_tools
```

No circular imports found.
