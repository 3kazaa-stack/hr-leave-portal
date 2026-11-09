# Build Instructions: HR Leave Portal (Web UI, Backend, hrAgent, CDK)

## Prerequisites

- Node.js with npm. The UI uses Vite 8, React 19 and TypeScript 6.
- Python 3.14 and `uv` for the CDK app and Python tests.
- AWS CDK CLI (`npx cdk`), and AWS credentials for the target account.
- Docker or Finch, used by `scripts/build_and_push_agent.sh`.

## 1. Install Dependencies

```bash
npm --prefix ui install
uv sync
```

## 2. Environment and Config

- **Local UI dev**: `ui/public/config.json` (git-ignored) holds `region`, `apiUrl`, `userPoolId`, `userPoolClientId` and `agentRuntimeArn`. Copy it from `ui/public/config.json.example` and fill it from the stack outputs `HrLeavePortalBackend.ApiUrl`, `UserPoolId`, `UserPoolClientId` and `HrLeavePortalAgentRuntime.AgentRuntimeArn`.
- **Deployed UI**: `HrLeavePortalUiDeployment` writes `config.json` from those stacks; no manual step is needed.
- **SSM parameters** must exist before `cdk deploy`:
  - `/hr-leave-portal/fastapi-layer-arn`, written by `scripts/build_layer.sh`
  - `/hr-leave-portal/agent-image-uri`, written by `scripts/build_and_push_agent.sh`

## 3. Build

```bash
npm --prefix ui run lint      # ESLint, must report 0 problems
npm --prefix ui run build     # tsc -b && vite build → ui/dist/
uv run python app.py          # CDK synth; set CDK_OUTDIR to choose the output folder
```

`app.py` includes `HrLeavePortalUiDeployment` only when `ui/dist/index.html` exists. Build the UI first, or that stack is left out and a warning is printed.

## 4. Deploy Order

```bash
scripts/build_layer.sh
scripts/build_and_push_agent.sh
npm --prefix ui run build
npx cdk deploy --all
```

CDK deploys the stacks in this order: Notifications → UiHosting → Backend → StateMachine → AgentRuntime → UiDeployment.

## 5. Build Verification

- `ui/dist/index.html` and `ui/dist/assets/` exist after the build.
- The synth output contains all six templates: `HrLeavePortalNotifications`, `HrLeavePortalUiHosting`, `HrLeavePortalBackend`, `HrLeavePortalStateMachine`, `HrLeavePortalAgentRuntime`, `HrLeavePortalUiDeployment`.
- The backend template references the `UiDistribution` domain, which is the CORS origin.

## 6. Troubleshooting

- **DOM tests fail with "document is not defined"**: run Vitest through `npm --prefix ui test`, not `npm --prefix ui exec -- vitest`. The latter runs from the repo root and skips `ui/vite.config.ts`.
- **`HrLeavePortalUiDeployment` missing from synth**: build the UI first (`npm --prefix ui run build`).
- **Synth fails on SSM parameters during deploy**: run the two `scripts/` first.
- **Vite warns that a chunk is larger than 500 kB**: this is advisory and does not fail the build. Code-splitting is a later improvement.
