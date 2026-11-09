"""FR6.1, FR7.1, FR7.2, FR7.4, FR7.6, NFR1, NFR2: the UI hosting, deployment and backend CORS stacks."""

from pathlib import Path

import aws_cdk as cdk
import pytest
from aws_cdk.assertions import Match, Template

from hr_leave_portal.agent_runtime_stack import AgentRuntimeStack
from hr_leave_portal.backend_stack import BackendStack
from hr_leave_portal.notification_stack import NotificationStack
from hr_leave_portal.ui_deployment_stack import UiDeploymentStack
from hr_leave_portal.ui_hosting_stack import UiHostingStack

# A tiny stand-in for ui/dist that lives inside the project, so no build is needed.
UI_DIST_FIXTURE = str(Path(__file__).parent / "fixtures" / "ui_dist")
# Keep synth output inside the (git-ignored) cdk.out folder instead of the system temp dir.
SYNTH_OUTDIR = str(Path(__file__).resolve().parents[2] / "cdk.out" / "unit-test-synth")
ENV = cdk.Environment(account="111111111111", region="us-east-1")


@pytest.fixture(scope="module")
def templates() -> dict[str, Template]:
    app = cdk.App(outdir=SYNTH_OUTDIR)
    notifications = NotificationStack(app, "Notifications", env=ENV)
    hosting = UiHostingStack(app, "UiHosting", env=ENV)
    backend = BackendStack(
        app,
        "Backend",
        allowed_origins=[f"https://{hosting.distribution_domain}", "http://localhost:5173"],
        env=ENV,
    )
    agent = AgentRuntimeStack(
        app,
        "AgentRuntime",
        table=backend.table,
        hr_email_topic=notifications.hr_email_topic,
        user_pool=backend.user_pool,
        user_pool_client=backend.user_pool_client,
        env=ENV,
    )
    deployment = UiDeploymentStack(
        app,
        "UiDeployment",
        bucket=hosting.bucket,
        distribution=hosting.distribution,
        api_url=backend.api.url,
        user_pool_id=backend.user_pool.user_pool_id,
        user_pool_client_id=backend.user_pool_client.user_pool_client_id,
        agent_runtime_arn=agent.agent_runtime_arn,
        ui_dist_path=UI_DIST_FIXTURE,
        env=ENV,
    )
    return {
        "hosting": Template.from_stack(hosting),
        "backend": Template.from_stack(backend),
        "agent": Template.from_stack(agent),
        "deployment": Template.from_stack(deployment),
    }


def test_bucket_blocks_all_public_access(templates):
    templates["hosting"].has_resource_properties(
        "AWS::S3::Bucket",
        {
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "BlockPublicPolicy": True,
                "IgnorePublicAcls": True,
                "RestrictPublicBuckets": True,
            }
        },
    )


def test_distribution_uses_oac_and_redirects_to_https(templates):
    hosting = templates["hosting"]
    hosting.resource_count_is("AWS::CloudFront::OriginAccessControl", 1)
    hosting.has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": Match.object_like(
                {
                    "DefaultRootObject": "index.html",
                    "DefaultCacheBehavior": Match.object_like(
                        {"ViewerProtocolPolicy": "redirect-to-https"}
                    ),
                    "Origins": [
                        Match.object_like(
                            {"OriginAccessControlId": Match.any_value()}
                        )
                    ],
                }
            )
        },
    )


def test_security_headers_policy(templates):
    templates["hosting"].has_resource_properties(
        "AWS::CloudFront::ResponseHeadersPolicy",
        {
            "ResponseHeadersPolicyConfig": Match.object_like(
                {
                    "SecurityHeadersConfig": Match.object_like(
                        {
                            "StrictTransportSecurity": Match.object_like({"Override": True}),
                            "ContentTypeOptions": {"Override": True},
                            "FrameOptions": {"FrameOption": "DENY", "Override": True},
                            "ReferrerPolicy": Match.object_like({"Override": True}),
                        }
                    )
                }
            )
        },
    )


def test_error_responses_serve_index_html(templates):
    templates["hosting"].has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": Match.object_like(
                {
                    "CustomErrorResponses": Match.array_with(
                        [
                            Match.object_like(
                                {"ErrorCode": code, "ResponseCode": 200, "ResponsePagePath": "/index.html"}
                            )
                            for code in (403, 404)
                        ]
                    )
                }
            )
        },
    )


def test_ui_url_is_output(templates):
    outputs = templates["hosting"].find_outputs("UiUrl")
    assert len(outputs) == 1


def test_backend_gateway_responses_carry_cors_headers(templates):
    backend = templates["backend"]
    for response_type in ("DEFAULT_4XX", "DEFAULT_5XX"):
        backend.has_resource_properties(
            "AWS::ApiGateway::GatewayResponse",
            {
                "ResponseType": response_type,
                "ResponseParameters": Match.object_like(
                    {"gatewayresponse.header.Access-Control-Allow-Origin": Match.any_value()}
                ),
            },
        )


def test_backend_lambda_gets_allowed_origins(templates):
    templates["backend"].has_resource_properties(
        "AWS::Lambda::Function",
        {
            "Environment": {
                "Variables": Match.object_like({"ALLOWED_ORIGINS": Match.any_value()})
            }
        },
    )


def test_backend_rejects_wildcard_origin():
    app = cdk.App(outdir=SYNTH_OUTDIR)
    with pytest.raises(ValueError):
        BackendStack(app, "WildcardBackend", allowed_origins=["*"], env=ENV)


def test_agent_runtime_allowlists_authorization_header(templates):
    templates["agent"].has_resource_properties(
        "AWS::BedrockAgentCore::Runtime",
        {
            "RequestHeaderConfiguration": {
                "RequestHeaderAllowlist": ["Authorization"]
            }
        },
    )


def test_deployment_uploads_ui_and_invalidates_cache(templates):
    templates["deployment"].has_resource_properties(
        "Custom::CDKBucketDeployment",
        {
            "SourceObjectKeys": Match.any_value(),
            "DistributionPaths": ["/*"],
        },
    )
