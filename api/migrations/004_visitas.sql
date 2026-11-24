-- visitantes únicos por dia e página (para o relatório diário). h = hash do IP com o dia e um segredo: não dá para voltar ao IP nem ligar um dia ao outro.
CREATE TABLE IF NOT EXISTS visitas (
  dia    TEXT NOT NULL,                        -- AAAA-MM-DD (horário de Brasília)
  h      TEXT NOT NULL,
  pagina TEXT NOT NULL,                        -- inicio | cadastro
  PRIMARY KEY (dia, h, pagina)
);
