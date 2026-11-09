# Requirements: React HR Portal UI with hrAgent Chat

## Intent Analysis

- **Request** (verbatim): "Build a React front end for the backend system that already exists in this repo. Also include integration with our AI hrAgent hosted in AgentCore and Create a CDK stack to deploy the new UI."
- **Goal**: give HR staff a web app over the existing HR leave backend, so they can manage employees, leave and HR requests without calling the API by hand, and can ask the hrAgent to do the same work in plain language.
- **Type**: new feature on a brownfield system (new UI, new hosting stack, small changes to existing backend and agent).
- **Scope**: multi-component: `ui/` (React app), a new CDK stack, `hr_leave_portal/backend_stack.py`, `hr_leave_portal/agent_runtime_stack.py`, `api/handler.py`, `hrAgent/app/agent/parse.py`, `app.py`.
- **Complexity**: standard. Depth for this workflow: Minimal.

## Decisions Taken from the Questions File

| Question | Answer |
|---|---|
| Q1 Screens | A: everything the API supports plus an hrAgent chat panel |
| Q2 Sign-in | A: the ready-made Amplify sign-in screen (username and password, forced password change) |
| Q3 Browser to hrAgent | A: call AgentCore directly with the Cognito access token; fall back to a streaming proxy behind the existing API if CORS blocks it |
| Q4 Backend changes | A: allowed; CORS on 401/403, restrict origins to the UI address, pass the signed-in user's id to the agent |
| Q5 Hosting | A: new CDK stack with private S3 + CloudFront (default domain) and a deploy-time `config.json` |
| Gate feedback | "can you do ui design look like (saudi health holding company)" |
| Q6 Language | A: English and Arabic with a language switch; Arabic uses a right-to-left layout |
| Q7 Logo | A: the user supplies the official logo file; a placeholder is shown until then |

## Functional Requirements

### FR1 Sign-in and session

- **FR1.1** The app shall show the Amplify Authenticator sign-in screen to any visitor who is not signed in, with sign-up hidden (accounts are created by an administrator).
  - Pass: an unauthenticated visit to any app route shows the sign-in screen and no "Create account" tab.
- **FR1.2** The app shall complete Cognito's forced password change for a newly created account on first sign-in.
  - Pass: a user created with a temporary password is asked for a new password and then reaches the app.
- **FR1.3** The app shall show the signed-in user's username and a sign-out control on every screen; sign-out returns to the sign-in screen.
- **FR1.4** The app shall attach the Cognito ID token to every REST API call and the Cognito access token to every hrAgent call, refreshing tokens through Amplify before they expire.
  - Pass: API calls carry `Authorization: <ID token>`; agent calls carry `Authorization: Bearer <access token>`; a session older than one hour still works without signing in again.
- **FR1.5** When the API or agent returns 401, the app shall send the user back to the sign-in screen with a message that the session expired.

### FR2 Employees

- **FR2.1** The app shall list all employees (`GET /employees`) in a table showing name, department, start date, role and employee id.
- **FR2.2** The app shall filter the employee list by hire-date range (`GET /employees?hiredFrom&hiredTo`); both dates are required to apply the filter, and the "from" date must not be after the "to" date.
  - Pass: entering only one date, or a "from" after "to", disables the filter and shows why.
- **FR2.3** The app shall create an employee (`POST /employees`) from a form with name, department, start date and role (default `employee`); name and department are required.
  - Pass: a valid form adds the new employee to the list; an empty name shows a field error and sends nothing.
- **FR2.4** The app shall show one employee's details (`GET /employees/{id}`) and show "Employee not found" on a 404.

### FR3 Leave

- **FR3.1** The app shall list an employee's leave (`GET /employees/{id}/leave`) on the employee's detail screen, with an optional month filter (`?month=YYYY-MM`).
- **FR3.2** The app shall record leave (`POST /employees/{id}/leave`) with start date, end date and note; end date must not be before start date.
  - Pass: end before start shows a field error and sends nothing.
- **FR3.3** The app shall change a leave entry's end date and note (`PUT /employees/{id}/leave/{startDate}`); the start date is not editable.
- **FR3.4** When recording leave whose start date matches an existing entry, the app shall warn that saving replaces the existing entry and require confirmation (the API overwrites silently).

### FR4 HR requests

- **FR4.1** The app shall submit a time-off request (`POST /hr-requests/time-off`) with start and end dates; the `user_id` sent is the signed-in user's Cognito id (`sub`), not typed by the user.
- **FR4.2** The app shall submit a free-text HR inquiry (`POST /hr-requests`) with a required, non-empty prompt; `user_id` is set the same way as FR4.1.
- **FR4.3** After a 202 response the app shall confirm that the request was sent to HR by email. It shall not claim to show a result, because the API has no status endpoint.

### FR5 hrAgent chat

- **FR5.1** The app shall provide a chat panel, reachable from every screen, where the user types a message and sees the hrAgent's reply.
- **FR5.2** The app shall call the AgentCore runtime at `POST https://bedrock-agentcore.<region>.amazonaws.com/runtimes/<URL-encoded runtime ARN>/invocations?qualifier=DEFAULT` with body `{"prompt": <text>}` and display the reply as it streams (text appears before the reply is complete).
- **FR5.3** The app shall keep one conversation per browser tab by sending the same `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` (at least 33 characters, generated in the browser) on each message, and offer a "New conversation" control that starts a fresh session id and clears the panel.
- **FR5.4** The app shall show a clear error in the chat panel when the agent call fails (network, 4xx, 5xx, stream cut off) and let the user retry the last message.
- **FR5.5** If the browser cannot call AgentCore directly because of CORS, the work shall add a proxy route behind the existing API that forwards the message to the runtime and streams the reply back, and the app shall use that route instead (decided in Q3; which path is used is settled during build).
- **FR5.6** Because the agent can change and delete records, the app shall refresh the employee and leave screens currently open when the user returns to them after a chat reply.

### FR6 Backend and agent changes

- **FR6.1** The API shall return CORS headers on API Gateway's own 4xx and 5xx responses (Gateway Responses), so the browser can read 401/403 errors.
- **FR6.2** API Gateway and FastAPI shall allow only the UI's CloudFront origin (plus `http://localhost:5173` for local development) instead of `*`.
  - Pass: a request with `Origin` set to another site gets no `Access-Control-Allow-Origin` header back.
- **FR6.3** The hrAgent shall take the user id (`actorId`) from the validated JWT's `sub` claim, not from the request body; a body `actorId` is ignored.
  - Pass: two users sending the same body `actorId` are recorded under their own `sub` values.

### FR7 Deployment

- **FR7.1** A new CDK stack shall host the built UI in a private S3 bucket (all public access blocked) served only through CloudFront with Origin Access Control over HTTPS on the default CloudFront domain.
- **FR7.2** The stack shall upload the built `ui/dist` and write a `config.json` beside it holding the region, API URL, user pool id, user pool client id and agent runtime ARN, taken from the existing stacks' outputs.
- **FR7.3** The app shall read `config.json` at start-up, so the same build works in any account; no environment-specific values are baked in at build time.
- **FR7.4** CloudFront shall return `index.html` for unknown paths (403/404 from S3), so deep links into app routes load the app.
- **FR7.5** The new stack shall be added to `app.py` and deploy with `cdk deploy` after the existing stacks, with the deploy steps documented in the repo README.
- **FR7.6** The stack shall output the CloudFront URL.

### FR8 Visual design (Health Holding look)

Source: the gate feedback asking for a UI that looks like the Saudi Health Holding Company. Colours below were read from the public site `www.health.sa` on 2026-11-09.

- **FR8.1** The app shall use one shared set of design tokens (CSS variables) for colour, type, spacing and radius, with this palette:
  - primary blue `#0899E0` (buttons, links, active navigation)
  - teal and cyan accents `#33CAC6`, `#20B4D2` (highlights, chat panel accents)
  - deep navy `#1B4784`, darker `#102063` (header, headings, footer)
  - page background `#F3F4FB`, cards white
  - orange `#F07C29` for warnings, red for errors, green for success
  - Pass: no colour values appear in component styles outside the token file.
- **FR8.2** Screens shall follow the site's style: a navy top header with the logo slot, white rounded cards on the pale background, generous spacing, and clear section headings.
- **FR8.3** The Amplify sign-in screen shall be themed with the same tokens (colours, font, radius) and show the logo slot above the form.
- **FR8.4** The header shall show the official logo from a single file `ui/public/brand/logo.svg` (or `.png`). Until the user supplies it, a neutral placeholder with the text "HR Leave Portal" is shown, and swapping in the file needs no code change. The work does not copy or recreate the company's logo itself.
- **FR8.5** Text shall use a font that has both Arabic and Latin letters (for example IBM Plex Sans Arabic, self-hosted with the app), so both languages look consistent.

### FR9 Arabic and English

- **FR9.1** The app shall offer English and Arabic with a language switch in the header; the choice is remembered in the browser and applied on the next visit. English is the default on the first visit unless the browser's preferred language is Arabic.
- **FR9.2** In Arabic the page shall be right-to-left (`<html dir="rtl" lang="ar">`), and layout, navigation, tables, forms, icons with direction and the chat panel shall mirror. In English it shall be `dir="ltr" lang="en"`.
  - Pass: switching language flips the layout with no reload and no text overflowing its container on any screen.
- **FR9.3** Every piece of interface text (labels, buttons, messages, errors, empty states, the sign-in screen) shall come from translation files `en` and `ar`; no interface text is hard-coded in components.
  - Pass: a check finds no key present in one file and missing from the other.
- **FR9.4** Dates shall display in the chosen language's format (Gregorian calendar in both), while the dates sent to the API stay `YYYY-MM-DD`.
- **FR9.5** Data from the backend (names, departments, notes) and the hrAgent's replies are shown as received, not translated; chat messages set their text direction from their content, so an Arabic reply reads right-to-left inside an English page and the reverse.

## Non-Functional Requirements

- **NFR1 Security**: no credentials, tokens or account-specific values in source; tokens are kept only by Amplify in the browser; the S3 bucket is not publicly readable (checked by `cdk synth` showing `BlockPublicAccess` on all four settings and an OAC bucket policy).
- **NFR2 Transport**: CloudFront redirects HTTP to HTTPS and sends security headers (HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a referrer policy).
- **NFR3 Build quality**: `npm run build` and `npm run lint` in `ui/` finish with no errors (this includes fixing the template's current unused-import build failure).
- **NFR4 Responsiveness**: the first streamed text of an agent reply appears in the chat panel within 1 second of AgentCore sending it; list screens show a loading state while a request is pending and never a blank screen.
- **NFR5 Accessibility**: forms have labels, controls work by keyboard, and errors are announced as text (not colour only); target WCAG 2.1 AA for the screens built here.
- **NFR6 Tests**: per the express Minimal test strategy, one unit test per functional requirement group (FR1 to FR9) covering its happy path, runnable with one documented command; the existing Python test suite is not made worse (its one test already fails before this work).
- **NFR7 Browser support**: current versions of Chrome, Edge, Firefox and Safari on desktop.

## Constraints

- React 19 + TypeScript + Vite, building on the existing `ui/` folder and its `aws-amplify` dependency.
- AWS CDK v2 in Python, in the existing `hr_leave_portal/` package and `app.py`.
- The existing Cognito user pool and client are reused; no new user pool.
- The REST API contract stays as it is (8 operations); responses include storage keys (`PK`, `SK`) that the UI ignores.
- Lists are a single page from the API (no pagination); the UI does not add pagination the API cannot serve.

## Assumptions

- `[assumption]` The AgentCore runtime's JWT authorizer accepts the Cognito access token (it checks the `client_id` claim, which only the access token has). To be confirmed in the first build.
- `[assumption]` AgentCore forwards enough of the validated token to the agent for it to read `sub` (FR6.3), for example by allowing the `Authorization` header through to the container. If it does not, the design stage picks another way and records it.
- `[assumption]` Every signed-in HR user may see and change all employees and leave; no roles are enforced in this version, matching the backend today.
- `[assumption]` The hrAgent answers in the language the user writes in; the work does not change the agent's prompt to force a language.
- `[assumption]` The user is allowed to use the Health Holding logo and look for this internal portal, and supplies the logo file (Q7).
- `[assumption]` The agent's stream uses the Strands event shapes recorded in `api-documentation.md` (text in `contentBlockDelta.delta.text`).

## Out of Scope

- Endpoints the API does not have: edit or delete an employee, delete leave, HR request status.
- Roles or permissions beyond "signed in".
- Custom domain and certificate, Amplify Hosting, CI/CD pipelines.
- AgentCore Memory provisioning, the `add_numbers` sample tool, and the other backend debt in `code-quality-assessment.md` not named in FR6.
- Mobile layouts beyond the browser's normal resizing.
- Hijri calendar display, translating backend data or agent replies, and languages other than English and Arabic.
- Recreating Health Holding's logo, photography or video assets.

## Open Questions

- Restricting origins (FR6.2) needs the CloudFront domain inside the backend stack, which is created after it. Design decides how to break that cycle (for example, create the distribution first, or pass the origin through an SSM parameter or a second deploy).
- Whether the browser can call AgentCore directly (FR5.2) or the proxy (FR5.5) is needed is settled when the first build runs against the deployed runtime.
