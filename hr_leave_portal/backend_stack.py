from collections.abc import Sequence

from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_apigateway as apigw,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_ssm as ssm,
)
from constructs import Construct

# The build script publishes the layer's Version ARN to this SSM parameter.
LAYER_ARN_PARAM = "/hr-leave-portal/fastapi-layer-arn"

# Headers the browser may send, matching what the UI's REST client uses.
CORS_ALLOW_HEADERS = [
    "Authorization",
    "Content-Type",
    "X-Amz-Date",
    "X-Api-Key",
    "X-Amz-Security-Token",
]


class BackendStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        allowed_origins: Sequence[str],
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        origins = list(allowed_origins)
        if not origins or "*" in origins:
            raise ValueError("allowed_origins must list the UI origins and must not contain '*'")

        table = dynamodb.Table(
            self,
            "HrTable",
            partition_key=dynamodb.Attribute(
                name="PK", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        table.add_global_secondary_index(
            index_name="GSI1",
            partition_key=dynamodb.Attribute(
                name="GSI1PK", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="GSI1SK", type=dynamodb.AttributeType.STRING
            ),
        )

        # Read the ARN the build script stored, resolved at synth time.
        fastapi_layer_arn = ssm.StringParameter.value_for_string_parameter(
            self, LAYER_ARN_PARAM
        )

        fastapi_layer = lambda_.LayerVersion.from_layer_version_arn(
            self, "FastApiLayer", layer_version_arn=fastapi_layer_arn
        )

        api_function = lambda_.Function(
            self,
            "ApiFunction",
            runtime=lambda_.Runtime.PYTHON_3_14,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("api", exclude=["__pycache__", "*.pyc"]),
            layers=[fastapi_layer],
            timeout=Duration.seconds(10),
            memory_size=512,
            environment={
                "TABLE_NAME": table.table_name,
                "ALLOWED_ORIGINS": ",".join(origins),
                "POWERTOOLS_SERVICE_NAME": "hr-api",
                "POWERTOOLS_LOG_LEVEL": "INFO",
            },
            tracing=lambda_.Tracing.ACTIVE,
        )

        table.grant_read_write_data(api_function)

        self.api_function = api_function
        self.table = table

        self.user_pool = cognito.UserPool(
            self,
            "HrUserPool",
            self_sign_up_enabled=False,
            sign_in_aliases=cognito.SignInAliases(email=True),
            removal_policy=RemovalPolicy.DESTROY,
        )

        self.user_pool_client = self.user_pool.add_client(
            "HrUserPoolClient",
            auth_flows=cognito.AuthFlow(user_password=True, user_srp=True),
        )

        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self, "HrAuthorizer", cognito_user_pools=[self.user_pool]
        )

        self.api = apigw.LambdaRestApi(
            self,
            "HrApi",
            handler=api_function,
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=origins,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=CORS_ALLOW_HEADERS,
            ),
            default_method_options=apigw.MethodOptions(
                authorization_type=apigw.AuthorizationType.COGNITO,
                authorizer=authorizer,
            ),
        )

        # API Gateway's own 401/403/5xx responses carry no CORS headers by default,
        # so the browser could not read them (FR6.1). A Gateway Response holds one
        # static origin, so it uses the first (the UI's CloudFront origin).
        gateway_cors_headers = {
            "Access-Control-Allow-Origin": f"'{origins[0]}'",
            "Access-Control-Allow-Headers": f"'{','.join(CORS_ALLOW_HEADERS)}'",
            "Access-Control-Allow-Methods": "'OPTIONS,GET,POST,PUT'",
            "Vary": "'Origin'",
        }
        self.api.add_gateway_response(
            "Default4xx",
            type=apigw.ResponseType.DEFAULT_4_XX,
            response_headers=gateway_cors_headers,
        )
        self.api.add_gateway_response(
            "Default5xx",
            type=apigw.ResponseType.DEFAULT_5_XX,
            response_headers=gateway_cors_headers,
        )

        CfnOutput(self, "ApiUrl", value=self.api.url)
        CfnOutput(self, "TableName", value=table.table_name)
        CfnOutput(self, "UserPoolId", value=self.user_pool.user_pool_id)
        CfnOutput(
            self, "UserPoolClientId", value=self.user_pool_client.user_pool_client_id
        )
