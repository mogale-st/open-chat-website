# OpenChats Candidate Website

A candidate website for OpenChats, built with React and Vite.

## Included
- Responsive homepage and mobile navigation
- Remote Chat Operator opportunity information
- Candidate expression-of-interest form with browser-side validation
- FAQ, contact placeholder, and privacy/terms pages

## Supabase application intake

Application collection is disabled. The deployment checklist below is for future planning only; do not run its commands, apply migrations, deploy either Edge Function, configure a retention schedule, or enable submissions as part of this review.

### Future deployment checklist — deferred, not for execution

Before any future deployment, separately review and approve the privacy notice, terms, legal operator and contact details, lawful basis, data region, international transfers, and need to collect identity documents. The cleanup function, retention period, and scheduled cleanup are deferred for a separate review; do not configure `ID_RETENTION_DAYS`, `CRON_SECRET`, `RETENTION_CLEANUP_CONFIGURED`, or Supabase Cron now.

After that review and explicit deployment approval, the Supabase CLI setup, reviewed database migrations, and `submit-application` function deployment can be planned. The cleanup function must remain separate until its behavior and retention policy are approved. The current Edge Function has server-side readiness gates; keep application intake disabled unless every required safeguard and legal prerequisite has been verified.

Before enabling intake, use synthetic test data for a controlled end-to-end submission. Verify the resulting database status is `submitted`, confirm each expected object can be retrieved through authorised access to the private bucket, and confirm the bucket does not allow public access. Remove the test row and documents afterward and verify their removal. A successful database update alone does not prove that every document is retrievable.

Each row starts as `pending` and only becomes `submitted` after document uploads complete. On upload or status-update failure, the function attempts rollback and may mark a retained row `upload_failed`; a network failure can leave a row `pending`. After the reviewed schema is applied, an authorised operator can identify these records with this read-only query:

```sql
select id, created_at, status, id_document_path, cv_document_path
from public.applications
where status in ('pending', 'upload_failed')
order by created_at asc;
```

Review these rows and their private Storage objects through authorised operator access before enabling intake. This query does not check whether documents for rows marked `submitted` remain retrievable; the controlled integration test above is required separately.

For future local testing, copy `.env.example` to `.env.local` and use the Supabase project URL, public publishable/anon key, and Turnstile site key. Keep `VITE_APPLICATIONS_ENABLED=false`. Find the project URL and public key under Supabase Dashboard → **Project Settings → API**. The publishable/anon key is public; never put a service-role key or other secret in the website or a `VITE_` variable.

The submission endpoint enforces a limit of five requests per normalized email address per hour using an HMAC-SHA256 digest. The raw email address is not written to the rate-limit table; the application record still stores the applicant's email for the stated application purpose. This email-based limit is not a complete replacement for IP-based protection because a person can submit using multiple email addresses. Turnstile helps reduce automated abuse but does not eliminate that possibility.

File extension, declared MIME type, and signature checks are only a first format-validation layer; they do not prove that a file is valid or safe, and no malware scanning is configured. PDF checks only inspect the header; JPG/PNG checks do not decode the image; legacy DOC checks only inspect the OLE signature and `WordDocument` marker. DOCX checks ZIP directory entries without decompressing or validating the document contents, and ZIP64 is unsupported. These checks can accept malformed or malicious files. More complete PDF/image/document parsing and malware scanning should be evaluated before documents are made available to authorised staff.

Phone validation checks allowed characters and overall digit length, but does not verify a number against the selected country's numbering plan. Email validation checks syntax and a small local list of disposable domains; that list cannot identify every temporary email provider, and the address is not verified as belonging to the applicant. Name validation accepts international letters, diacritics, spaces, apostrophes, and hyphens.

## Run locally
1. Install Node.js LTS from https://nodejs.org/.
2. Open this folder in Visual Studio Code.
3. Open the integrated terminal.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open the local address printed in the terminal (usually `http://localhost:5173`).

## Build for deployment
Run `npm run build`. Vite creates the production website in `dist`.

For Cloudflare Pages, connect the GitHub repository and set:
- Build command: `npm run build`
- Build output directory: `dist`
