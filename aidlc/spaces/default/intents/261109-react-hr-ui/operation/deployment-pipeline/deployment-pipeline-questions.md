# Deployment Pipeline Questions

There is no CI or CD pipeline in the repo today. Deploys are done by hand: two scripts write SSM parameters, then `cdk deploy`. This work adds two UI stacks and changes the backend and the agent. Build and Test passed and `cdk deploy --all` synthesizes cleanly.

One finding shapes these questions. `scripts/build_and_push_agent.sh` tags the agent image `latest` by default. When the tag doesn't change, the SSM value doesn't change, so CloudFormation sees no change and the AgentCore runtime keeps running the old image. Without a unique tag, the agent fix that reads the user from the token (FR6.3) would never reach AWS.

## Q1. [Release engineer] How should deployments run?

A. A single repeatable deploy script run from a developer machine (`scripts/deploy.sh`): build the layer, build and push the agent image tagged with the git commit, build the UI, `cdk deploy --all`, then smoke checks. No hosted pipeline yet.
B. A GitHub Actions workflow that deploys on merge to `main`, using an OIDC role in your AWS account (no stored keys)
C. AWS CodePipeline defined in CDK (CDK Pipelines) in your AWS account
X. Other (please specify)

[Answer]: no deply. I want to test locally. help me with that

## Q2. [Release engineer] How many environments?

A. One environment: the current account `833973656362` in `us-east-1`, where the stacks already run
B. Staging and production (two accounts or two stack prefixes), with a manual approval before production
X. Other (please specify)

[Answer]: no deply. I want to test locally. help me with that

## Q3. [Release engineer] How should a bad UI release be rolled back?

A. Turn on S3 versioning for the UI bucket and keep the previous release's files. Rollback is either a redeploy of the previous git commit, or restoring the previous object versions plus a CloudFront invalidation (about a minute, no rebuild).
B. Redeploy the previous git commit only (rebuild and `cdk deploy`, a few minutes); no bucket change
X. Other (please specify)

[Answer]: no deply. I want to test locally. help me with that
