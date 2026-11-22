-- Aplicar uma vez no banco existente:
-- npx wrangler d1 execute sinadiga --remote --file=migrations/003_tentativas_admin.sql
CREATE TABLE IF NOT EXISTS tentativas_admin (
  ip     TEXT PRIMARY KEY,
  ultima INTEGER NOT NULL
);
