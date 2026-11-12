# OpenChats Candidate Website

A candidate website for OpenChats, built with React and Vite.

## Included
- Responsive homepage and mobile navigation
- Remote Chat Operator opportunity information
- Candidate expression-of-interest form with browser-side validation
- FAQ, contact placeholder, and privacy/terms pages

## Supabase application intake

The form stays in preview mode unless `VITE_APPLICATIONS_ENABLED=true` and all public website settings are configured. Live submissions use a Supabase Edge Function; ID and CV documents are uploaded by the function to a private Storage bucket. The browser never receives the Supabase service-role key.

Before enabling live intake:

1. Complete and review the privacy notice and terms. Confirm the legal operator, contact details, lawful basis, Supabase data region, international transfers, and the necessity of collecting ID documents.
2. The confirmed target is the Supabase West EU (Ireland, `eu-west-1`) region with a 90-day retention period for application records and documents. Verify the project’s actual region and that it meets your legal requirements before proceeding. Configure and test daily cleanup before enabling submissions.
3. Install and authenticate the Supabase CLI using the [official instructions](https://supabase.com/docs/guides/local-development/cli/getting-started). Create a Cloudflare Turnstile site key and secret, restricted to the application domains.
4. Apply the migration and deploy the functions:
   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   npx supabase functions deploy submit-application
   npx supabase functions deploy cleanup-expired-applications
   ```
5. In Supabase Dashboard → **Edge Functions → Secrets**, set `APPLICATIONS_ENABLED=false`, `OPERATOR_DETAILS_CONFIRMED=false`, `LEGAL_REVIEW_CONFIRMED=false`, `DATA_REGION_CONFIRMED=false`, `RETENTION_CLEANUP_CONFIGURED=false`, `ID_RETENTION_DAYS=90`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET` (a long random value), and `ALLOWED_ORIGINS` (comma-separated exact origins, with no trailing slash). Make sure the functions can access the project’s `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never put a service-role key in the website or a `VITE_` variable.
6. Configure Supabase Cron (with `pg_cron`, `pg_net`, and Vault) to call `cleanup-expired-applications` daily. In the SQL editor, enable the extensions and save the function URL and `Bearer <CRON_SECRET>` in Vault:
   ```sql
   create extension if not exists pg_cron with schema extensions;
   create extension if not exists pg_net with schema extensions;
   select vault.create_secret(
     'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-expired-applications',
     'application_cleanup_url'
   );
   select vault.create_secret('Bearer REPLACE_WITH_CRON_SECRET', 'application_cleanup_authorization');
   select cron.schedule(
     'delete-expired-applications',
     '15 2 * * *',
     $$
       select net.http_post(
         url := (select decrypted_secret from vault.decrypted_secrets where name = 'application_cleanup_url'),
         headers := jsonb_build_object(
           'Authorization', (select decrypted_secret from vault.decrypted_secrets where name = 'application_cleanup_authorization'),
           'Content-Type', 'application/json'
         ),
         body := '{}'::jsonb
       );
     $$
   );
   ```
   Verify deletion of expired test submissions before setting `RETENTION_CLEANUP_CONFIGURED=true`.
7. Copy `.env.example` to `.env.local` and replace the placeholders with the project URL, public publishable/anon key, and Turnstile site key. Keep `VITE_APPLICATIONS_ENABLED=false`. Find the project URL and public key under Supabase Dashboard → **Project Settings → API**. The publishable/anon key is public; database and Storage security depend on the migration’s RLS and private-bucket rules.
8. After verifying the live privacy notices, region, cleanup schedule, and test submission/deletion path, set the server-side `APPLICATIONS_ENABLED`, `OPERATOR_DETAILS_CONFIRMED`, `LEGAL_REVIEW_CONFIRMED`, `DATA_REGION_CONFIRMED`, and `RETENTION_CLEANUP_CONFIGURED` secrets to `true`. Then set `VITE_APPLICATIONS_ENABLED=true`, rebuild, and deploy the website.

Do not enable collection until the actual data region is confirmed, the 90-day retention schedule is tested, and the secure configuration is reviewed. Applicant records and documents are accessible only to privileged Supabase project operators; protect those accounts with MFA and least-privilege access. The email check catches malformed addresses and a small set of disposable domains; it does not verify mailbox ownership.

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
