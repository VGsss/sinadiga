CREATE TABLE IF NOT EXISTS gatos (
  id      TEXT PRIMARY KEY,                    -- UUID aleatório (não adivinhável)
  nome    TEXT NOT NULL,
  mes     INTEGER NOT NULL,
  ano     INTEGER NOT NULL,
  dia     INTEGER,                             -- opcional
  cidade  TEXT NOT NULL DEFAULT '',            -- nome oficial (IBGE)
  uf      TEXT NOT NULL DEFAULT '',            -- sigla do estado
  instagram TEXT NOT NULL DEFAULT '',          -- contato público de quem cadastrou (sem @)
  foto    TEXT NOT NULL,                       -- JPEG em base64, sem prefixo
  status  TEXT NOT NULL DEFAULT 'pendente',    -- pendente | aprovado
  ip      TEXT NOT NULL,                       -- hash do IP, só para limitar abuso
  criado  INTEGER NOT NULL                     -- ms desde 1970
);
CREATE INDEX IF NOT EXISTS idx_gatos_status ON gatos (status, criado);
CREATE INDEX IF NOT EXISTS idx_gatos_ip ON gatos (ip, criado);
