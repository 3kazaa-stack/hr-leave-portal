# Cross-Unit Traceability: Final Coverage Gate

Source: `aidlc engine sensor-traceability --stage build-and-test`. This is zero-Unit work, so every row's owning stage is `code-generation` and no Unit is listed.

**Verdict: FAIL on 1 item.** 47 of 48 requirements are built. FR5.5 is uncovered by design: it was deferred until after deployment (see below).

| ID | Covered | Owning stage | Target file |
|---|---|---|---|
| FR1.1 | yes | code-generation | `ui/src/App.tsx` |
| FR1.2 | yes | code-generation | `ui/src/App.tsx` |
| FR1.3 | yes | code-generation | `ui/src/components/AppShell.tsx` |
| FR1.4 | yes | code-generation | `ui/src/api/client.ts` |
| FR1.5 | yes | code-generation | `ui/src/components/AppShell.tsx` |
| FR2.1 | yes | code-generation | `ui/src/pages/EmployeesPage.tsx` |
| FR2.2 | yes | code-generation | `ui/src/pages/validation.ts` |
| FR2.3 | yes | code-generation | `ui/src/pages/EmployeesPage.tsx` |
| FR2.4 | yes | code-generation | `ui/src/pages/EmployeeDetailPage.tsx` |
| FR3.1 | yes | code-generation | `ui/src/pages/EmployeeDetailPage.tsx` |
| FR3.2 | yes | code-generation | `ui/src/pages/validation.ts` |
| FR3.3 | yes | code-generation | `ui/src/pages/EmployeeDetailPage.tsx` |
| FR3.4 | yes | code-generation | `ui/src/pages/EmployeeDetailPage.tsx` |
| FR4.1 | yes | code-generation | `ui/src/pages/HrRequestsPage.tsx` |
| FR4.2 | yes | code-generation | `ui/src/pages/HrRequestsPage.tsx` |
| FR4.3 | yes | code-generation | `ui/src/pages/HrRequestsPage.tsx` |
| FR5.1 | yes | code-generation | `ui/src/components/ChatPanel.tsx` |
| FR5.2 | yes | code-generation | `ui/src/agent/agentClient.ts` |
| FR5.3 | yes | code-generation | `ui/src/agent/session.ts` |
| FR5.4 | yes | code-generation | `ui/src/components/ChatPanel.tsx` |
| **FR5.5** | **no** | code-generation (Deferred) | Not built. This is the contingent streaming proxy, needed only if the deployed AgentCore runtime rejects browser CORS requests (Q3 answer A) |
| FR5.6 | yes | code-generation | `ui/src/api/dataEvents.ts` |
| FR6.1 | yes | code-generation | `hr_leave_portal/backend_stack.py` |
| FR6.2 | yes | code-generation | `api/cors.py` |
| FR6.3 | yes | code-generation | `hrAgent/app/agent/parse.py` |
| FR7.1 | yes | code-generation | `hr_leave_portal/ui_hosting_stack.py` |
| FR7.2 | yes | code-generation | `hr_leave_portal/ui_deployment_stack.py` |
| FR7.3 | yes | code-generation | `ui/src/config/config.ts` |
| FR7.4 | yes | code-generation | `hr_leave_portal/ui_hosting_stack.py` |
| FR7.5 | yes | code-generation | `app.py` |
| FR7.6 | yes | code-generation | `hr_leave_portal/ui_hosting_stack.py` |
| FR8.1 | yes | code-generation | `ui/src/theme/tokens.css` |
| FR8.2 | yes | code-generation | `ui/src/theme/global.css` |
| FR8.3 | yes | code-generation | `ui/src/theme/amplifyTheme.ts` |
| FR8.4 | yes | code-generation | `ui/src/components/Brand.tsx` |
| FR8.5 | yes | code-generation | `ui/src/main.tsx` |
| FR9.1 | yes | code-generation | `ui/src/i18n/I18nProvider.tsx` |
| FR9.2 | yes | code-generation | `ui/src/i18n/I18nProvider.tsx` |
| FR9.3 | yes | code-generation | `ui/src/i18n/i18n.test.ts` |
| FR9.4 | yes | code-generation | `ui/src/i18n/i18n.ts` |
| FR9.5 | yes | code-generation | `ui/src/components/ChatPanel.tsx` |
| NFR1 | yes | code-generation | `hr_leave_portal/ui_hosting_stack.py` |
| NFR2 | yes | code-generation | `hr_leave_portal/ui_hosting_stack.py` |
| NFR3 | yes | code-generation | `ui/package.json` |
| NFR4 | yes | code-generation | `ui/src/components/ChatPanel.tsx` |
| NFR5 | yes | code-generation | `ui/src/components/Field.tsx` |
| NFR6 | yes | code-generation | `ui/vite.config.ts` |
| NFR7 | yes | code-generation | `ui/vite.config.ts` |

## Uncovered Elements

- **FR5.5**: deferred. Whether it is needed is decided by the post-deploy check in `README.md` (Web UI → post-deploy check). The deployment stages later in this plan own that check. If the browser can't call AgentCore, the proxy is built then, and only `ui/src/agent/agentClient.ts` changes on the UI side.

## Where Behaviour Was Checked

- All UI behaviour was checked in Vitest with jsdom, a DOM emulator. That counts as integration-level evidence, not real-browser evidence.
- The CDK behaviour was checked with `aws_cdk.assertions` and a full synth.
- The agent and API checks are Python unit tests.
