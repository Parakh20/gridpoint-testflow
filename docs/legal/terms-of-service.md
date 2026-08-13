> ⚠️ **DRAFT — NOT LEGALLY REVIEWED — DO NOT PUBLISH** ⚠️
>
> Internal working draft only. Not reviewed by counsel, not legal advice, and not to be published or relied upon until reviewed and approved by a licensed attorney. `[PLACEHOLDER: ...]` marks facts the codebase cannot supply.

# Terms of Service (Draft)

**Last updated:** [PLACEHOLDER: effective date]

## 1. Agreement

These Terms govern access to and use of TestFlow (the "Service"), operated by [PLACEHOLDER: registered legal entity name and address], by an organization ("Customer") and its authorized users. Customer's use is also subject to any signed order form or master services agreement, which controls in the event of conflict. [PLACEHOLDER: counsel to confirm precedence language.]

## 2. The Service

TestFlow is a multi-tenant SaaS application for electrical substation commissioning: project and equipment scoping, dynamic field-driven test recording, PDF/Excel export, and AI-assisted report generation. It is delivered as a web application (each Customer provisioned at `company.testflow.io`) and a companion mobile app for field engineers.

## 3. Accounts and Access

- There is no public self-registration. Accounts are created only by a Customer's own SUPERADMIN user through TestFlow's internal admin tooling.
- Access is role-based (SUPERADMIN, GM, SUPERVISOR, ENGINEER); Customer is responsible for assigning roles appropriately and for all activity under its users' accounts.
- Sessions are subject to an inactivity timeout; Customer may not attempt to bypass authentication, rate limiting, or row-level tenant isolation controls.

## 4. Customer Data

- Customer retains ownership of all data it or its users submit to the Service ("Customer Data").
- We process Customer Data only to provide the Service, as described in the Privacy Policy and Data Processing Agreement.
- Customer is responsible for the accuracy of test records and measurements it enters; TestFlow does not independently verify field measurements.
- Customer Data is logically isolated per organization via database-level row-level security; see the Security Policy for detail. [PLACEHOLDER: counsel to confirm whether any liability limitation or warranty disclaimer language is needed here regarding isolation guarantees.]

## 5. AI-Generated Reports

TestFlow offers an optional AI-assisted report generation feature (available to GM/SUPERADMIN roles on closed projects) that sends relevant project and test data to a third-party AI provider (Anthropic) to draft a report. Customer is responsible for reviewing AI-generated content for accuracy before relying on it or distributing it to third parties; TestFlow does not warrant the correctness of AI-generated output. [PLACEHOLDER: counsel to add appropriate AI-output disclaimer/liability language.]

## 6. Fees and Billing

- Subscription fees are billed through our payments processor, Razorpay, on a plan Customer selects.
- [PLACEHOLDER: billing cycle terms, trial-to-paid conversion terms, refund policy, price-change notice period.]
- If a subscription becomes past due, TestFlow maintains full access for a grace period following the current billing period's end, after which new project/user creation may be blocked until payment is resolved or the subscription is cancelled; existing data remains readable throughout. [PLACEHOLDER: counsel to confirm the exact grace-period length disclosed to customers stays synchronized with the value actually enforced in the system, and to add consequences-of-nonpayment language beyond feature blocking.]

## 7. Acceptable Use

Customer will not: attempt to access another organization's data; probe, scan, or attempt to defeat rate limiting or access controls; use the Service to store data it is not legally permitted to process; or resell the Service without authorization. [PLACEHOLDER: expand acceptable-use list with counsel.]

## 8. Availability and Support

[PLACEHOLDER: any uptime commitment or SLA — none is currently implemented or should be implied by this draft. If no SLA is offered, state that explicitly rather than defaulting to a number.]

## 9. Data Export and Termination

Customer may export project data as CSV, Excel, or PDF at any time during an active subscription. Upon termination, [PLACEHOLDER: post-termination data export window and deletion timeline — must align with `data-retention-policy.md` once finalized].

## 10. Disclaimers and Limitation of Liability

[PLACEHOLDER: standard SaaS disclaimer of warranties and limitation-of-liability clauses — must be drafted by counsel; do not reuse another company's boilerplate without review, especially regarding safety-adjacent commissioning data.]

## 11. Governing Law and Dispute Resolution

[PLACEHOLDER: governing law, jurisdiction, and dispute resolution mechanism — to be set by counsel; likely India-seated given DPDP applicability, but must be confirmed.]

## 12. Changes to These Terms

[PLACEHOLDER: notice mechanism and lead time.]

## 13. Contact

[PLACEHOLDER: legal/support contact details.]
