create table if not exists public.applications (
  id uuid primary key,
  created_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'upload_failed')),
  full_name text not null check (char_length(full_name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 254),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  phone_country_calling_code text not null check (phone_country_calling_code ~ '^\+[1-9][0-9]{0,2}$'),
  phone text,
  whatsapp text,
  age_confirmed boolean not null check (age_confirmed),
  adult_work_acknowledged boolean not null check (adult_work_acknowledged),
  contact_consent boolean not null check (contact_consent),
  id_document_path text not null,
  cv_document_path text
);

alter table public.applications enable row level security;
revoke all on table public.applications from anon, authenticated;
grant all on table public.applications to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Block client access to application documents" on storage.objects;
create policy "Block client access to application documents"
on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id <> 'application-documents')
with check (bucket_id <> 'application-documents');
