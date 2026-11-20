// Gera as listas de cidades usadas pelo site e pela API.
//   Nomes e UF: API pública de localidades do IBGE (fonte oficial dos municípios brasileiros).
//   Coordenadas: dataset público kelvins/municipios-brasileiros (código IBGE + latitude/longitude da sede do município).
// Saídas: ../cidades.json (site: estado -> cidade e "cidade mais próxima") e src/cidades.js (API: valida o código IBGE enviado).
// Uso: node scripts/gerar-cidades.mjs
import { writeFileSync } from "node:fs";

const IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";
const COORD = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json";

const get = async url => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return JSON.parse((await r.text()).replace(/^﻿/, ""));
};
const [ibge, coord] = await Promise.all([get(IBGE), get(COORD)]);
const pos = new Map(coord.map(c => [c.codigo_ibge, [c.latitude, c.longitude]]));

const ufDe = m => (m.microrregiao?.mesorregiao?.UF) || m["regiao-imediata"]?.["regiao-intermediaria"]?.UF;
const ufs = new Map(); // sigla -> nome
const cidades = [];
const semCoord = [];
for (const m of ibge) {
  const uf = ufDe(m);
  if (!uf) throw new Error("município sem UF: " + m.id);
  ufs.set(uf.sigla, uf.nome);
  const p = pos.get(m.id);
  if (!p) semCoord.push(`${m.nome}/${uf.sigla} (${m.id})`);
  cidades.push({ id: m.id, nome: m.nome, uf: uf.sigla, lat: p?.[0], lon: p?.[1] });
}
if (semCoord.length) throw new Error(`${semCoord.length} município(s) sem coordenada: ` + semCoord.slice(0, 10).join(", "));

const listaUfs = [...ufs].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")); // [sigla, nome]
const idxUf = new Map(listaUfs.map(([s], i) => [s, i]));
cidades.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

writeFileSync(new URL("../../cidades.json", import.meta.url), JSON.stringify({
  ufs: listaUfs,                                                    // [[sigla, nome]]
  c: cidades.map(c => [c.id, c.nome, idxUf.get(c.uf), +c.lat.toFixed(4), +c.lon.toFixed(4)]), // [id IBGE, nome, índice da UF, lat, lon]
}));
writeFileSync(new URL("../src/cidades.js", import.meta.url),
  "// GERADO por scripts/gerar-cidades.mjs (IBGE). Não editar à mão.\nexport const CIDADES = " +
  JSON.stringify(Object.fromEntries(cidades.map(c => [c.id, [c.nome, c.uf]]))) + ";\n");

console.log(`UFs: ${listaUfs.length} | municípios: ${cidades.length} | sem coordenada: ${semCoord.length}`);
