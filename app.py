#!/usr/bin/env python3
import sys
from pathlib import Path

import aws_cdk as cdk
from hr_leave_portal.agent_runtime_stack import AgentRuntimeStack
from hr_leave_portal.backend_stack import BackendStack
from hr_leave_portal.notification_stack import NotificationStack
from hr_leave_portal.state_machine_stack import StateMachineStack
from hr_leave_portal.ui_deployment_stack import DEFAULT_UI_DIST_PATH, UiDeploymentStack
from hr_leave_portal.ui_hosting_stack import UiHostingStack
from hr_leave_portal.dashboard_stack import DashboardStack

LOCAL_DEV_ORIGIN = "http://localhost:5173"

app = cdk.App()

notifications = NotificationStack(app, "HrLeavePortalNotifications")

# Deploys first so the backend can restrict CORS to the UI's CloudFront origin.
ui_hosting = UiHostingStack(app, "HrLeavePortalUiHosting")

backend = BackendStack(
    app,
    "HrLeavePortalBackend",
    allowed_origins=[f"https://{ui_hosting.distribution_domain}", LOCAL_DEV_ORIGIN],
)

StateMachineStack(
    app,
    "HrLeavePortalStateMachine",
    hr_email_topic=notifications.hr_email_topic,
    api_function=backend.api_function
)

agent_runtime = AgentRuntimeStack(
    app,
    "HrLeavePortalAgentRuntime",
    table=backend.table,
    hr_email_topic=notifications.hr_email_topic,
    user_pool=backend.user_pool,
    user_pool_client=backend.user_pool_client
)

# Uploads ui/dist and writes config.json from the stacks above. Skipped (with a
# warning) until the UI is built, so deploying only the backend or agent still works.
if (Path(DEFAULT_UI_DIST_PATH) / "index.html").is_file():
    UiDeploymentStack(
        app,
        "HrLeavePortalUiDeployment",
        bucket=ui_hosting.bucket,
        distribution=ui_hosting.distribution,
        api_url=backend.api.url,
        user_pool_id=backend.user_pool.user_pool_id,
        user_pool_client_id=backend.user_pool_client.user_pool_client_id,
        agent_runtime_arn=agent_runtime.agent_runtime_arn,
    )
else:
    print(
        f"WARNING: {DEFAULT_UI_DIST_PATH}/index.html not found, so HrLeavePortalUiDeployment is left out. "
        "Run `npm --prefix ui run build` first to deploy the web UI.",
        file=sys.stderr,
    )

DashboardStack(
    app, "HrLeavePortalDashboard", api_function=backend.api_function, api=backend.api
)


app.synth()
