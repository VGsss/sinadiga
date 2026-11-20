-- Aplicar uma vez no banco que já existia antes do campo Instagram:
-- npx wrangler d1 execute sinadiga --remote --file=migrations/001_instagram.sql
ALTER TABLE gatos ADD COLUMN instagram TEXT NOT NULL DEFAULT '';
