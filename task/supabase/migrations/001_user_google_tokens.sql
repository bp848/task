-- user_google_tokens
-- Stores AES-256-GCM encrypted Google OAuth refresh_tokens per Supabase user.
-- The refresh_token column contains ENCRYPTED data — never plaintext.
-- Encryption/decryption is handled exclusively in Edge Functions using TOKEN_ENCRYPTION_KEY.

create table if not exists public.user_google_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,  -- AES-256-GCM encrypted (base64url encoded)
  updated_at    timestamptz not null default now()
);

-- RLS
alter table public.user_google_tokens enable row level security;

-- Users can only check if their own row exists (encrypted value is opaque anyway)
create policy "Users can view own google token"
  on public.user_google_tokens
  for select
  using (auth.uid() = user_id);

-- No direct client insert/update/delete — only service_role (Edge Functions)

comment on table public.user_google_tokens is
  'Stores AES-256-GCM encrypted Google OAuth refresh_tokens. '
  'Written exclusively by exchange-google-code Edge Function (service_role). '
  'Decrypted exclusively by get-google-token Edge Function. '
  'TOKEN_ENCRYPTION_KEY must be set as a Supabase secret.';

comment on column public.user_google_tokens.refresh_token is
  'AES-256-GCM encrypted refresh_token. Format: base64url(iv || ciphertext). '
  'Never stored or transmitted as plaintext.';
