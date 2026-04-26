-- Optional TOTP (authenticator app) for MFA after password.
alter table users add column if not exists totp_secret_ciphertext text;
alter table users add column if not exists totp_pending_secret_ciphertext text;
alter table users add column if not exists totp_enabled boolean not null default false;
