# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-09
- Commit: 82fa07f8255eaaf4f32ab483a6ce4af1a6bb1cd9
- Intent: 261109-react-hr-ui
- Run type: NO_STORE first scan, full repository, depth Minimal
- Method: static reading only; no tests, builds, `cdk synth`, or programs were run
- Left out unopened: `.git/`, `.venv/`, `hrAgent/app/agent/.venv/`, `ui/node_modules/`, `cdk.out/`, `__pycache__/`, `fastapi-layer.zip`, `hrAgent/agentcore/.env.local`, `hrAgent/agentcore/.cli/traces/`, and AI-DLC's own install and workspace

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 261109-react-hr-ui
fingerprint: 8202c892967e62a91cd2ff4b9c8153d40e7e728d
analyzed:
  paths:
    - ./
  components:
    - CDK App
    - NotificationStack
    - BackendStack
    - StateMachineStack
    - AgentRuntimeStack
    - HR State Machine Definition
    - Build Scripts
    - API Handler
    - API Models
    - Employee Controller
    - Leave Controller
    - HR Request Controller
    - Employee Service
    - Leave Service
    - HR Request Service
    - Agent Entrypoint
    - Payload Parser
    - Model Loader
    - Memory Session Manager
    - Agent Employee Tools
    - Agent Leave Tools
    - Agent Email Tools
    - AgentCore Project Config
    - UI App Shell
    - UI Build Config
    - Project Scaffold Stub
    - CDK Unit Test
shallow:
  paths:
    - ui/src/assets/
    - ui/public/
    - uv.lock
    - hrAgent/app/agent/uv.lock
    - ui/package-lock.json
```
