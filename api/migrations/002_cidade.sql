-- Aplicar uma vez no banco que já existia antes do campo cidade/estado:
-- npx wrangler d1 execute sinadiga --remote --file=migrations/002_cidade.sql
ALTER TABLE gatos ADD COLUMN cidade TEXT NOT NULL DEFAULT '';
ALTER TABLE gatos ADD COLUMN uf TEXT NOT NULL DEFAULT '';
