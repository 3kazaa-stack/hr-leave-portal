# Technology Stack: hr-leave-portal

## Languages

| Language | Version | Where |
|---|---|---|
| Python | 3.14 (`.python-version`, `requires-python >=3.14`) | CDK app, `api/` Lambda (runtime `PYTHON_3_14`) |
| Python | 3.12 (container base `python:3.12-slim-trixie`; `requires-python >=3.10`) | `hrAgent/app/agent` |
| TypeScript | ~6.0.3 | `ui/` |
| JSON (ASL, JSONata query language) | n/a | `state_machines/` |
| Bash / zsh | n/a | `scripts/`, `hrAgent/dev.sh` |

## Frameworks and Libraries

| Name | Version constraint | Purpose | Declared in |
|---|---|---|---|
| aws-cdk-lib | >=2.273.0,<3.0.0 | IaC (incl. `aws_bedrockagentcore`) | `pyproject.toml` |
| constructs | >=10.5.0,<11.0.0 | CDK constructs | `pyproject.toml` |
| fastapi | unpinned (layer); >=0.162.0 (dev) | REST framework | `scripts/build_layer.sh`, `pyproject.toml` dev |
| pydantic | unpinned (layer) | Request validation | `scripts/build_layer.sh` |
| mangum | unpinned (layer); not in dev deps | ASGI → Lambda adapter | `scripts/build_layer.sh` |
| aws-lambda-powertools[tracer] | unpinned (layer) | Installed, not imported | `scripts/build_layer.sh` |
| boto3 | Lambda runtime-provided; boto3[crt] >=1.43.121 (dev) | AWS SDK | runtime / `pyproject.toml` dev |
| uvicorn | >=0.54.0 (dev) | Local ASGI server | `pyproject.toml` dev |
| pytest | ==8.4.2 (dev) | Tests | `pyproject.toml` dev |
| strands-agents | >=1.62.0,<2.0.0 | Agent framework | `hrAgent/app/agent/pyproject.toml` |
| bedrock-agentcore[strands-agents] | >=1.18.1,<2.0.0 | AgentCore Runtime app, Memory integration | same |
| botocore[crt] | ~=1.43.0 | AWS SDK core | same |
| aws-opentelemetry-distro | ~=0.21.0 | Agent tracing (`opentelemetry-instrument`) | same |
| react, react-dom | ^19.3.1 | UI | `ui/package.json` |
| aws-amplify | ^6.22.2 | Cognito auth client (installed, unused) | `ui/package.json` |
| @aws-amplify/ui-react | ^6.15.7 | Authenticator UI (installed, unused) | `ui/package.json` |
| vite | ^8.3.6 | Dev server / bundler | `ui/package.json` |
| @vitejs/plugin-react | ^6.1.2 | React plugin for Vite | `ui/package.json` |
| eslint ^10.14.0, typescript-eslint ^8.72.1, eslint-plugin-react-hooks ^7.1.1, eslint-plugin-react-refresh ^0.5.7, @eslint/js ^10.0.1, globals ^17.13.0 | | Linting | `ui/package.json` |
| @types/react ^19.3.0, @types/react-dom ^19.3.0, @types/node ^24.19.2 | | Types | `ui/package.json` |

Lockfiles pin exact versions: `uv.lock`, `hrAgent/app/agent/uv.lock`, `ui/package-lock.json` (not read line by line in this scan).

## AWS Services

| Service | Use |
|---|---|
| API Gateway (REST) | `HrApi` proxy with Cognito authorizer |
| AWS Lambda | `ApiFunction` (x86_64, 512 MB, 10 s) + FastAPI layer |
| Amazon DynamoDB | `HrTable` single table + GSI1, on-demand |
| Amazon Cognito | `HrUserPool`, `HrUserPoolClient` |
| AWS Step Functions | `HrStateMachine` (Standard, JSONata) |
| Amazon Bedrock | `us.amazon.nova-2-lite-v1:0` (state machine, agent), `global.anthropic.claude-sonnet-5` (email tool) |
| Amazon Bedrock AgentCore Runtime | `hrAgent` runtime (container, HTTP, arm64) |
| Amazon Bedrock AgentCore Memory | declared in `agentcore.json` only; not provisioned by CDK |
| Amazon SNS | `HrEmailTopic` email notifications |
| Amazon CloudWatch | `HR/HrRequests` metric; Lambda/agent logs |
| Amazon ECR | `hr-agent` repository (created by script, scan on push) |
| AWS Systems Manager Parameter Store | `/hr-leave-portal/fastapi-layer-arn`, `/hr-leave-portal/agent-image-uri` |

## Tooling

- **uv** for Python environments and builds (`uv run cdk deploy ...` per script output).
- **AWS CDK CLI** (`cdk.json` app `python3 app.py`).
- **AgentCore CLI** (`agentcore dev`, `agentcore deploy`, `agentcore invoke`).
- **Finch** (default) or Docker for the agent image.
- **AWS CLI** in both scripts.
- **npm** for `ui/`.
