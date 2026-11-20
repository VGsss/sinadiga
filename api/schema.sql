CREATE TABLE IF NOT EXISTS gatos (
  id      TEXT PRIMARY KEY,                    -- UUID aleatório (não adivinhável)
  nome    TEXT NOT NULL,
  mes     INTEGER NOT NULL,
  ano     INTEGER NOT NULL,
  dia     INTEGER,                             -- opcional
  foto    TEXT NOT NULL,                       -- JPEG em base64, sem prefixo
  status  TEXT NOT NULL DEFAULT 'pendente',    -- pendente | aprovado
  ip      TEXT NOT NULL,                       -- hash do IP, só para limitar abuso
  criado  INTEGER NOT NULL                     -- ms desde 1970
);
CREATE INDEX IF NOT EXISTS idx_gatos_status ON gatos (status, criado);
CREATE INDEX IF NOT EXISTS idx_gatos_ip ON gatos (ip, criado);
