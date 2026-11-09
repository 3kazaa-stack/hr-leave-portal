from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3 as s3,
)
from constructs import Construct


class UiHostingStack(Stack):
    """Private S3 bucket and CloudFront distribution for the web UI (FR7.1, FR7.4, FR7.6, NFR1, NFR2).

    This stack depends on nothing, so it deploys first and the backend can restrict
    CORS to the distribution's domain (FR6.2). The files are uploaded by
    UiDeploymentStack, which runs after the backend and agent stacks exist.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.bucket = s3.Bucket(
            self,
            "UiBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        security_headers = cloudfront.ResponseHeadersPolicy(
            self,
            "UiSecurityHeaders",
            security_headers_behavior=cloudfront.ResponseSecurityHeadersBehavior(
                strict_transport_security=cloudfront.ResponseHeadersStrictTransportSecurity(
                    access_control_max_age=Duration.days(365),
                    include_subdomains=True,
                    override=True,
                ),
                content_type_options=cloudfront.ResponseHeadersContentTypeOptions(override=True),
                frame_options=cloudfront.ResponseHeadersFrameOptions(
                    frame_option=cloudfront.HeadersFrameOption.DENY, override=True
                ),
                referrer_policy=cloudfront.ResponseHeadersReferrerPolicy(
                    referrer_policy=cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                    override=True,
                ),
            ),
        )

        # Unknown paths come back from S3 as 403/404; serve index.html so deep links
        # into app routes load the single-page app.
        spa_fallback = [
            cloudfront.ErrorResponse(
                http_status=status,
                response_http_status=200,
                response_page_path="/index.html",
                ttl=Duration.seconds(0),
            )
            for status in (403, 404)
        ]

        self.distribution = cloudfront.Distribution(
            self,
            "UiDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(self.bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                response_headers_policy=security_headers,
            ),
            default_root_object="index.html",
            error_responses=spa_fallback,
        )

        self.distribution_domain = self.distribution.distribution_domain_name

        CfnOutput(self, "UiUrl", value=f"https://{self.distribution_domain}")
