
-- Add secret_code column to invites
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS secret_code TEXT;

-- Backfill existing rows with a 6-char alphanumeric code (uppercase, no ambiguous chars)
UPDATE public.invites
SET secret_code = upper(substr(translate(encode(gen_random_bytes(8), 'base64'), '+/=OIl01', 'ABCDEFGH'), 1, 6))
WHERE secret_code IS NULL;

ALTER TABLE public.invites ALTER COLUMN secret_code SET NOT NULL;
