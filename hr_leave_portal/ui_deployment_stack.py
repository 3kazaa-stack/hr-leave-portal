from pathlib import Path

from aws_cdk import (
    Stack,
    aws_cloudfront as cloudfront,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
)
from constructs import Construct

# Built by `npm --prefix ui run build` before `cdk deploy`.
DEFAULT_UI_DIST_PATH = "ui/dist"

# The dev copy in ui/public is replaced by the generated file below.
LOCAL_ONLY_FILES = ["config.json", "config.json.example"]


class UiDeploymentStack(Stack):
    """Uploads the built UI and writes its runtime config.json (FR7.2, FR7.3).

    Runs after the hosting, backend and agent stacks, so config.json holds their
    real values and the same UI build works in any account.
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        bucket: s3.IBucket,
        distribution: cloudfront.IDistribution,
        api_url: str,
        user_pool_id: str,
        user_pool_client_id: str,
        agent_runtime_arn: str,
        ui_dist_path: str = DEFAULT_UI_DIST_PATH,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        if not (Path(ui_dist_path) / "index.html").is_file():
            raise FileNotFoundError(
                f"{ui_dist_path}/index.html not found. Run `npm --prefix ui run build` before synth or deploy."
            )

        runtime_config = {
            "region": Stack.of(self).region,
            "apiUrl": api_url,
            "userPoolId": user_pool_id,
            "userPoolClientId": user_pool_client_id,
            "agentRuntimeArn": agent_runtime_arn,
        }

        s3deploy.BucketDeployment(
            self,
            "UiFiles",
            destination_bucket=bucket,
            sources=[
                s3deploy.Source.asset(ui_dist_path, exclude=LOCAL_ONLY_FILES),
                s3deploy.Source.json_data("config.json", runtime_config),
            ],
            distribution=distribution,
            distribution_paths=["/*"],
        )
