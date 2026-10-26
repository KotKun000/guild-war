-- Discord 2FA flag (admins with 2FA may skip the guild password)
ALTER TABLE members ADD COLUMN mfa INTEGER NOT NULL DEFAULT 0;
