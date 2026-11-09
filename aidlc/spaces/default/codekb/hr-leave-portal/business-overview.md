# Business Overview: hr-leave-portal

## Purpose

An internal HR leave-management backend on AWS. HR staff keep employee records, record leave (time off) for employees, and send HR requests that end up as emails to an HR mailbox. A conversational HR assistant (the `hrAgent`, hosted in Amazon Bedrock AgentCore Runtime) can do the same record work in natural language and draft and send leave emails.

## Users

- **HR staff**: the primary users. The agent's system prompt (`hrAgent/app/agent/main.py:11-34`) addresses "HR staff". Accounts are created by an administrator: Cognito self sign-up is off (`hr_leave_portal/backend_stack.py:72`).
- **HR mailbox**: receives emails through the SNS topic `HrEmailTopic` (email subscription, `notification_stack.py`).

There are no roles enforced in code. Employees carry a `role` field (default `"employee"`) that nothing checks.

## Key Business Capabilities

| Capability | REST API | hrAgent tool |
|---|---|---|
| Create employee | `POST /employees` | `create_employee` |
| Create/overwrite employee with known id | none | `save_employee` |
| Look up one employee | `GET /employees/{id}` | `get_employee` |
| List employees | `GET /employees` | `list_employees` |
| List employees hired in a date range | `GET /employees?hiredFrom&hiredTo` | `list_employees_by_hire_date` |
| Delete employee | none | `delete_employee` |
| Record leave | `POST /employees/{id}/leave` | `save_leave` |
| Change a leave's end date / note | `PUT /employees/{id}/leave/{startDate}` | `save_leave` |
| List an employee's leave (optionally by month) | `GET /employees/{id}/leave?month=YYYY-MM` | `list_leave` |
| Submit a time-off request to HR (email) | `POST /hr-requests/time-off` | none |
| Submit a free-text HR request (AI-answered email) | `POST /hr-requests` | none |
| Draft a leave email with an LLM | none | `generate_leave_email` |
| Send an email to HR | none (only via state machine) | `send_email_to_hr` |

Endpoint details live in `api-documentation.md`.

## Business Transactions

1. **Employee onboarding record**: HR creates an employee (name, department, start date, role); the system assigns an 8-character id.
2. **Leave recording**: HR records leave for an employee keyed by its start date; re-saving the same start date overwrites it.
3. **Time-off request to HR**: a request with user id and dates starts a Step Functions workflow that emails HR a fixed-format message and records a CloudWatch metric `HR/HrRequests`.
4. **General HR inquiry**: a free-text prompt starts the same workflow, which asks Amazon Nova 2 Lite for an answer (max 200 tokens) and emails the answer to HR (not back to the requester).
5. **Conversational HR assistance**: a signed-in user chats with `hrAgent`, which calls tools against the same DynamoDB table and SNS topic.

Flows across components are drawn in `architecture.md` (Interaction Diagrams).

## Domain Vocabulary

- **Employee**: DynamoDB item `PK=USER`, `SK=<employeeId>`; fields `employeeId`, `name`, `department`, `startDate` (hire date), `role`.
- **Leave**: DynamoDB item `PK=<employeeId>`, `SK=<startDate>`; fields `startDate`, `endDate`, `note`.
- **HR request**: a Step Functions execution, type `TimeOff` or `BenefitsInquiry`.
- **actorId / session id**: agent-side identifiers for the end user and the conversation.

## Current State Relevant to the Intent

- No user-facing front end exists. `ui/` holds the unmodified Vite React template (a counter button); see `component-inventory.md`.
- No stack hosts a web UI (no S3/CloudFront); see `architecture.md`.
