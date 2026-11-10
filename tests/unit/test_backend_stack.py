"""CDK assertion tests for hr_leave_portal/backend_stack.py (table, API Lambda, REST API + Cognito)."""

from pathlib import Path

import aws_cdk as cdk
import pytest
from aws_cdk.assertions import Match, Template

from hr_leave_portal.backend_stack import LAYER_ARN_PARAM, BackendStack

# Keep synth output inside the (git-ignored) cdk.out folder instead of the system temp dir.
SYNTH_OUTDIR = str(Path(__file__).resolve().parents[2] / "cdk.out" / "unit-test-synth")
ENV = cdk.Environment(account="111111111111", region="us-east-1")


@pytest.fixture(scope="module")
def template() -> Template:
    app = cdk.App(outdir=SYNTH_OUTDIR)
    stack = BackendStack(
        app,
        "BackendUnderTest",
        allowed_origins=["https://d111111abcdef8.cloudfront.net", "http://localhost:5173"],
        env=ENV,
    )
    return Template.from_stack(stack)


def _only_logical_id(template: Template, resource_type: str) -> str:
    resources = template.find_resources(resource_type)
    assert len(resources) == 1, f"expected exactly one {resource_type}, found {len(resources)}"
    return next(iter(resources))


# --- DynamoDB table -------------------------------------------------------------------


def test_table_has_pk_sk_key_schema_and_on_demand_billing(template):
    # Arrange / Act: synthesized in the fixture.

    # Assert
    template.resource_count_is("AWS::DynamoDB::Table", 1)
    template.has_resource_properties(
        "AWS::DynamoDB::Table",
        {
            "KeySchema": [
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            "BillingMode": "PAY_PER_REQUEST",
        },
    )


def test_table_has_gsi1_hire_date_index_used_by_employee_service(template):
    # The stack defines a global secondary index GSI1 (GSI1PK / GSI1SK), not a local
    # ByStartDate index; employee_service.list_by_hire_date queries IndexName="GSI1".
    # Match.array_with lets other indexes exist; object_like ignores Projection details.
    template.has_resource_properties(
        "AWS::DynamoDB::Table",
        {
            "GlobalSecondaryIndexes": Match.array_with(
                [
                    Match.object_like(
                        {
                            "IndexName": "GSI1",
                            "KeySchema": [
                                {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                                {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                            ],
                        }
                    )
                ]
            ),
        },
    )


# --- API Lambda -----------------------------------------------------------------------


def test_api_lambda_has_active_xray_tracing(template):
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {
            "Handler": "handler.lambda_handler",
            "TracingConfig": {"Mode": "Active"},
        },
    )


def test_api_lambda_attaches_the_fastapi_powertools_layer_from_ssm(template):
    # The layer is imported by ARN (LayerVersion.from_layer_version_arn), so the template
    # holds no AWS::Lambda::LayerVersion resource. Its ARN comes from the SSM parameter
    # that scripts/build_layer.sh writes after building fastapi + mangum + powertools.
    # value_for_string_parameter synthesizes a CloudFormation Parameter of the SSM type
    # whose Default is the parameter name, and Layers holds a Ref to that Parameter.
    template.resource_count_is("AWS::Lambda::LayerVersion", 0)

    ssm_params = template.find_parameters(
        "*",
        {"Type": "AWS::SSM::Parameter::Value<String>", "Default": LAYER_ARN_PARAM},
    )
    assert len(ssm_params) == 1, "expected one SSM-backed parameter for the layer ARN"
    (layer_param_id,) = ssm_params

    template.has_resource_properties(
        "AWS::Lambda::Function",
        {
            "Handler": "handler.lambda_handler",
            "Layers": [{"Ref": layer_param_id}],
        },
    )


def test_api_lambda_sets_powertools_service_and_log_level(template):
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {
            "Environment": {
                "Variables": Match.object_like(
                    {"POWERTOOLS_SERVICE_NAME": "hr-api", "POWERTOOLS_LOG_LEVEL": "INFO"}
                )
            }
        },
    )


# --- REST API + Cognito authorizer ----------------------------------------------------


def test_rest_api_exists(template):
    template.resource_count_is("AWS::ApiGateway::RestApi", 1)


def test_cognito_authorizer_points_at_the_user_pool(template):
    user_pool_id = _only_logical_id(template, "AWS::Cognito::UserPool")

    template.has_resource_properties(
        "AWS::ApiGateway::Authorizer",
        {
            "Type": "COGNITO_USER_POOLS",
            "ProviderARNs": [{"Fn::GetAtt": [user_pool_id, "Arn"]}],
        },
    )


def test_every_non_preflight_method_uses_the_cognito_authorizer(template):
    # LambdaRestApi creates ANY on "/" and on "{proxy+}", and the CORS preflight adds
    # OPTIONS on both. default_method_options applies to the ANY methods only; the
    # OPTIONS methods must stay open (AuthorizationType NONE) or browsers cannot
    # complete the preflight. So check every method, split by HTTP method.
    authorizer_id = _only_logical_id(template, "AWS::ApiGateway::Authorizer")
    methods = template.find_resources("AWS::ApiGateway::Method")

    protected = [m["Properties"] for m in methods.values() if m["Properties"]["HttpMethod"] != "OPTIONS"]
    preflight = [m["Properties"] for m in methods.values() if m["Properties"]["HttpMethod"] == "OPTIONS"]

    assert len(protected) == 2  # ANY / and ANY /{proxy+}
    for method in protected:
        assert method["AuthorizationType"] == "COGNITO_USER_POOLS"
        assert method["AuthorizerId"] == {"Ref": authorizer_id}

    assert len(preflight) == 2
    for method in preflight:
        assert method["AuthorizationType"] == "NONE"
