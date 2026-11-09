# Requirements Analysis Questions

Request: "Build a React front end for the backend system that already exists in this repo. Also include integration with our AI hrAgent hosted in AgentCore and Create a CDK stack to deploy the new UI."

The code scan (`aidlc/spaces/default/codekb/hr-leave-portal/`) already answers a lot: the REST API has 8 operations behind a Cognito authorizer, the hrAgent runtime uses a Cognito JWT authorizer on the same user pool, the existing `ui/` folder is an untouched Vite React 19 + TypeScript template with `aws-amplify` installed, and no stack hosts a UI today. The questions below cover only what the code cannot tell us.

## Q1. [Product manager] Which screens should the first version include?

The backend supports employees (create, list, filter by hire date, view one), leave (record, change end date or note, list by month) and HR requests (time-off request, free-text HR inquiry). The hrAgent can chat about all of this.

A. Everything the API supports plus an hrAgent chat panel (employees, leave, HR requests, chat)
B. Employees and leave screens plus hrAgent chat; no HR request forms
C. Only the hrAgent chat (the agent does the record work)
D. Everything the API supports, but no chat yet (the agent comes in a later version)
X. Other (please specify)

[Answer]: A

## Q2. [Product manager] How should HR staff sign in?

Accounts are created by an administrator (self sign-up is off) and the user pool has no hosted sign-in page today.

A. Ready-made Amplify sign-in screen inside the app (username and password; also handles the forced password change for new accounts)
B. A custom sign-in form we build ourselves, using Amplify Auth behind it
C. Add Cognito's hosted sign-in page (managed login) and redirect to it
X. Other (please specify)

[Answer]: A

## Q3. [Architect] How should the browser reach the hrAgent in AgentCore?

The agent is called at the regional AgentCore endpoint with a Cognito token and streams its reply. Calling it straight from the browser is simplest, but depends on that endpoint accepting browser (CORS) requests, which the repo cannot confirm.

A. Call AgentCore directly from the browser with the user's Cognito access token; if CORS blocks it during build, fall back to option B
B. Add a small proxy (a Lambda behind the existing API, streaming the reply) so the browser only talks to our API
C. Call AgentCore directly from the browser only; no fallback
X. Other (please specify)

[Answer]: A

## Q4. [Architect] May this work change the existing backend stacks?

The UI works best with a few small backend fixes: CORS headers on API Gateway's 401/403 responses (today the browser sees them as network errors), limiting allowed origins to the new UI's address instead of `*`, and passing the signed-in user's id to the agent instead of a value the browser makes up.

A. Yes, make those small fixes to the existing stacks and API
B. Only the CORS fix for 401/403 responses; leave allowed origins at `*` and everything else unchanged
C. No backend changes at all; the UI works around what exists
X. Other (please specify)

[Answer]: A

## Q5. [Platform engineer] How should the new UI be hosted and deployed?

A. New CDK stack with a private S3 bucket and CloudFront (HTTPS on the default CloudFront domain); the stack writes the API URL, user pool ids and agent ARN into a `config.json` next to the app at deploy time
B. Same as A, plus a custom domain name and certificate (tell us the domain)
C. AWS Amplify Hosting, defined in CDK
X. Other (please specify)

[Answer]: A

## Q6. [Product manager] Should the UI be in Arabic as well as English?

You asked for the UI to look like the Saudi Health Holding Company. Their site (health.sa) is bilingual, and its Arabic version reads right to left. Adding Arabic means every screen gets translated text and a mirrored right-to-left layout, which adds noticeable work.

A. English and Arabic, with a language switch; Arabic uses a right-to-left layout
B. English only, styled like Health Holding (colours, typography, layout feel)
C. Arabic only, right-to-left
X. Other (please specify)

[Answer]: A

## Q7. [Designer] Which logo should the header show?

The Health Holding logo and name are the company's trademarks. I can match the colours and style, but the logo itself should be a file you're allowed to use.

A. I'll supply the official logo file (SVG or PNG); leave a placeholder until then
B. No logo; show a text title such as "HR Leave Portal" in the brand colours
X. Other (please specify)

[Answer]: A
