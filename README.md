
# Welcome to your CDK Python project!

You should explore the contents of this project. It demonstrates a CDK app with an instance of a stack (`hr_leave_portal_stack`)
which contains an Amazon SQS queue that is subscribed to an Amazon SNS topic.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

This project is set up like a standard Python project.  The initialization process also creates
a virtualenv within this project, stored under the .venv directory.  To create the virtualenv
it assumes that there is a `python3` executable in your path with access to the `venv` package.
If for any reason the automatic creation of the virtualenv fails, you can create the virtualenv
manually once the init process completes.

To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .venv
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .venv/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .venv\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

At this point you can now synthesize the CloudFormation template for this code.

```
$ cdk synth
```

You can now begin exploring the source code, contained in the hello directory.
There is also a very trivial test included that can be run like this:

```
$ pytest
```

To add additional dependencies, for example other CDK libraries, just add to
your requirements.txt file and rerun the `pip install -r requirements.txt`
command.

## Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation

Enjoy!

## Web UI

The `ui/` folder holds the HR portal: a React 19 + Vite app in English and Arabic (right-to-left),
with Amplify sign-in, employee, leave and HR-request screens, and a chat panel for the hrAgent.
Two CDK stacks host it:

- `HrLeavePortalUiHosting`: a private S3 bucket behind CloudFront (Origin Access Control, HTTPS only,
  security headers). It deploys first, so the backend can allow only the CloudFront origin for CORS.
- `HrLeavePortalUiDeployment`: uploads `ui/dist` and writes `config.json` next to it with the region,
  API URL, user pool id, user pool client id and agent runtime ARN taken from the other stacks.
  `app.py` leaves this stack out (with a warning) until `ui/dist` has been built.

### Local development

1. Copy `ui/public/config.json.example` to `ui/public/config.json` and fill it from the stack outputs
   (`HrLeavePortalBackend.ApiUrl`, `UserPoolId`, `UserPoolClientId`, `HrLeavePortalAgentRuntime.AgentRuntimeArn`).
   `ui/public/config.json` is git-ignored; never commit real values.
2. Run the dev server:

```
$ npm --prefix ui install
$ npm --prefix ui run dev
```

The backend allows `http://localhost:5173` as a CORS origin for this.

### Deploy order

```
$ scripts/build_layer.sh              # FastAPI Lambda layer, ARN stored in SSM
$ scripts/build_and_push_agent.sh     # hrAgent image, URI stored in SSM
$ npm --prefix ui run build           # writes ui/dist
$ uv run cdk deploy --all
```

CDK deploys the stacks in dependency order: Notifications and UiHosting, then Backend, StateMachine,
AgentRuntime, and last UiDeployment. The UI address is the `HrLeavePortalUiHosting.UiUrl` output.

### Creating a user

Sign-up is turned off; an administrator creates each account. The user signs in with the email and
the temporary password, and the sign-in screen asks for a new password.

```
$ aws cognito-idp admin-create-user \
    --user-pool-id <UserPoolId output> \
    --username jane.doe@example.com \
    --user-attributes Name=email,Value=jane.doe@example.com Name=email_verified,Value=true \
    --temporary-password '<temporary password>'
```

### Adding the logo

Drop the official logo into `ui/public/brand/` as `logo.svg` (or `logo.png`), rebuild and redeploy.
Until then the header shows a text placeholder. See `ui/public/brand/README.md`.

### After the first deploy: check the hrAgent chat path

The chat panel calls the AgentCore runtime straight from the browser with the Cognito access token
(`ui/src/agent/agentClient.ts`). Whether AgentCore accepts that browser (CORS) request can only be
checked against the deployed runtime:

1. Open the `UiUrl`, sign in, open the HR assistant and send a message.
2. If text streams back, nothing else is needed.
3. If the browser console shows a CORS error on `bedrock-agentcore.<region>.amazonaws.com`, add a
   streaming proxy route behind the existing API that forwards `{prompt}` and the session id to the
   runtime, then point `agentInvocationUrl()` and the `Authorization` header in
   `ui/src/agent/agentClient.ts` at that route. No other UI file calls AgentCore.

The runtime forwards the `Authorization` header to the agent (request-header allowlist), and the
agent uses the token's `sub` as the user id; an `actorId` in the request body is ignored.

### UI checks and tests

```
$ npm --prefix ui run lint
$ npm --prefix ui run build
$ npm --prefix ui test
$ uv run pytest tests/unit/test_api_cors.py tests/unit/test_agent_actor.py tests/unit/test_ui_stacks.py
```
