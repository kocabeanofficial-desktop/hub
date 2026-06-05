# Initial Server Client Seed Proposal Generator

This folder contains local-only tooling for the one-time Initial Server Client Seed & Reconciliation process.

The generator reads exported CSV files from:

`D:\KBCC-SEED-RECONCILIATION\inputs`

It writes review proposal files to:

`D:\KBCC-SEED-RECONCILIATION\outputs`

## Safety

This tool does not:
- write to Supabase
- import records into Supabase
- call WHM/cPanel
- call Zoho
- call Domains.co.za
- change DNS
- change invoices
- change hosting
- create clients
- link ownership
- require service-role keys
- store secrets

The output is proposal-only. Admin review is required before any client, service, domain, hosting, mailbox, or ownership decision is entered through approved manual workflows.

## Inputs

Expected input files:
- `domains-renewal.csv`
- `kbcc-client-services-export.csv`
- `kbcc-clients-export.csv`
- `kbcc-domains-export.csv`
- `kbcc-hosting-accounts-export.csv`
- `kbcc-mailboxes-export.csv`
- `zoho-customers-raw-export.csv`
- `zoho-invoices-raw-export.csv`

Optional future WHM input files:
- `whm-accounts-export.csv`
- `whm-domain-observations-export.csv`

The WHM files may be missing. The script reports them as optional missing files and continues.

## Domain CSV Mapping

From `domains-renewal.csv`:
- `domain_name` from `Domain Name`
- `contact_name` from `Contact Name`
- `registrar_status` from `Status`
- `auto_renew` from `Auto Renew`
- `expiry_date` from `Expiry Date`

## Outputs

The script creates dated proposal files:
- `initial-server-client-seed-proposals-YYYY-MM-DD.csv`
- `initial-server-client-seed-proposals-YYYY-MM-DD.json`

The proposal rows include suggested matches, confidence, match reasons, conflict reasons, renewal risk, proposed actions, and blank admin review fields.

## Run

From the Hub repo root:

```bash
npm run seed:proposals
```

Or run the script directly:

```bash
node tools/seed-reconciliation/generate-seed-proposals.mjs
```

## Review

Open the generated CSV or JSON from:

`D:\KBCC-SEED-RECONCILIATION\outputs`

Review each row manually. The tool may suggest possible existing clients or hosting records, but the suggestions are not confirmed ownership.

Use the proposal output to decide whether to:
- verify an existing domain
- link a domain to an existing client through an approved manual workflow
- create a domain record manually
- create a client manually
- review a hosting link
- review renewal risk
- ignore or defer a row

Do not treat a suggested match as confirmed until an admin has reviewed and recorded the decision.
