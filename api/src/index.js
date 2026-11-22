// API do SINADIGA (Cloudflare Worker + D1). Regras de segurança ficam aqui, no servidor:
// validação, captcha, limite por visitante e moderação (cadastro entra "pendente" até o admin aprovar).

import { CIDADES } from "./cidades.js"; // municípios do IBGE (id -> [nome, UF]); só estes são aceitos

const MAX_FOTO_B64 = 160_000;   // ~120 KB de JPEG
const IDADE_MAX = 30;           // anos: nascimento mais antigo aceito (gatos raramente passam disso)
const MAX_POR_DIA = 5;          // cadastros por visitante (IP) em 24 horas
const RETENCAO_DIAS = 30;       // anúncios (e os dados deles, como o Instagram e o hash do IP) são apagados depois disso
const BLOQUEIO_ADMIN_MS = 60_000; // depois de uma senha errada, o mesmo IP só pode tentar de novo após 1 minuto
const MAX_PENDENTES = 100;      // fila de moderação cheia = recusa novos cadastros
const MAX_POR_HORA = 30;         // cadastros no site todo por hora: impede que muitos IPs encham a fila de uma vez
const PENDENTE_DIAS = 7;        // cadastro que ninguém aprovou em 7 dias sai da fila
const MAX_CORPO = 250_000;      // bytes: corpo máximo de um cadastro (foto de até 160 KB em base64 + campos)

const resp = (corpo, status, cors, extra = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors, ...extra } });

export default {
  async fetch(req, env, ctx) {
    const origem = req.headers.get("Origin") || "";
    const ok = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).includes(origem);
    const cors = ok
      ? { "Access-Control-Allow-Origin": origem, Vary: "Origin", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS" }
      : { Vary: "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try { return await rota(req, env, new URL(req.url), cors, ctx); }
    catch (e) { console.error(e); return resp({ erro: "Erro interno." }, 500, cors); }
  },
  // Cron Trigger diário (wrangler.toml): apaga os anúncios com mais de RETENCAO_DIAS dias
  async scheduled(event, env, ctx) { ctx.waitUntil(limparExpirados(env)); },
};

const corteRetencao = () => Date.now() - RETENCAO_DIAS * 86400_000;
async function limparExpirados(env) {
  const r = await env.DB.prepare("DELETE FROM gatos WHERE criado < ? OR (status='pendente' AND criado < ?)").bind(corteRetencao(), Date.now() - PENDENTE_DIAS * 86400_000).run();
  await env.DB.prepare("DELETE FROM tentativas_admin WHERE ultima < ?").bind(Date.now() - 3600_000).run();
  console.log(`Limpeza diária: ${r.meta.changes} anúncio(s) com mais de ${RETENCAO_DIAS} dias apagado(s).`);
}

async function sha256(txt) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
}
async function sha256hex(txt) {
  return [...new Uint8Array(await sha256(txt))].map(b => b.toString(16).padStart(2, "0")).join("");
}
// Autentica o administrador. Devolve null se autorizado, ou a resposta de recusa.
// Limite: depois de UMA senha errada, aquele IP fica 1 minuto sem poder tentar (até a senha certa é recusada nesse período,
// para o atacante não saber se acertou). Cada IP tem a sua própria contagem; o IP vem do Cloudflare e não pode ser forjado.
async function checarAdmin(req, env, cors) {
  if (!env.ADMIN_TOKEN) return resp({ erro: "Não autorizado." }, 401, cors);
  const t = (req.headers.get("Authorization") || "").replace(/^Bearer /, "");
  const ip = await sha256hex("admin|" + (req.headers.get("CF-Connecting-IP") || "") + "|" + env.ADMIN_TOKEN);
  const agora = Date.now();
  const bloqueado = await env.DB.prepare("SELECT ultima FROM tentativas_admin WHERE ip=? AND ultima>?").bind(ip, agora - BLOQUEIO_ADMIN_MS).first();
  if (bloqueado) {
    const espera = Math.ceil((bloqueado.ultima + BLOQUEIO_ADMIN_MS - agora) / 1000);
    return resp({ erro: `Muitas tentativas. Aguarde ${espera} segundos.` }, 429, cors, { "retry-after": String(espera) });
  }
  if (t) {
    const [x, y] = await Promise.all([sha256(t), sha256(env.ADMIN_TOKEN)]);
    if (crypto.subtle.timingSafeEqual(x, y)) return null; // compara hashes: tempo constante
    await env.DB.prepare("INSERT OR REPLACE INTO tentativas_admin (ip, ultima) VALUES (?, ?)").bind(ip, agora).run(); // só tentativas com senha contam
  }
  return resp({ erro: "Não autorizado." }, 401, cors);
}
function bytesDoBase64(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }
function fotoResp(b64, cors, cache) {
  return new Response(bytesDoBase64(b64), { headers: { "content-type": "image/jpeg", "cache-control": cache, "x-content-type-options": "nosniff", ...cors } });
}

async function rota(req, env, url, cors, ctx) {
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const m = req.method;
  let r;

  // ---------- público ----------
  if (m === "GET" && p === "/gatos") {
    const { results } = await env.DB.prepare("SELECT id, nome, mes, ano, dia, cidade, uf, instagram FROM gatos WHERE status='aprovado' AND criado > ? ORDER BY criado DESC LIMIT 200").bind(corteRetencao()).all();
    return resp(results, 200, cors, { "cache-control": "public, max-age=60" });
  }
  if (m === "GET" && (r = p.match(/^\/gatos\/([\w-]{36})\/foto$/))) {
    const g = await env.DB.prepare("SELECT foto FROM gatos WHERE id=? AND status='aprovado' AND criado > ?").bind(r[1], corteRetencao()).first();
    return g ? fotoResp(g.foto, cors, "public, max-age=86400") : resp({ erro: "Não encontrado." }, 404, cors);
  }
  if (m === "POST" && p === "/gatos") return cadastrar(req, env, cors, ctx);

  // ---------- administrador ----------
  if (p.startsWith("/admin/")) {
    const recusa = await checarAdmin(req, env, cors);
    if (recusa) return recusa;
    if (m === "POST" && p === "/admin/telegram-teste") { // confere se o bot está configurado: manda uma mensagem de teste
      const x = await telegram(env, "sendMessage", { text: "Teste do SINADIGA: as notificações de novos cadastros estão funcionando." });
      return resp(x, x.ok ? 200 : 502, cors);
    }
    if (m === "GET" && p === "/admin/gatos") {
      const { results } = await env.DB.prepare("SELECT id, nome, mes, ano, dia, cidade, uf, instagram, status, criado FROM gatos ORDER BY status DESC, criado DESC LIMIT 500").all();
      return resp(results, 200, cors, { "cache-control": "no-store" });
    }
    if (m === "GET" && (r = p.match(/^\/admin\/gatos\/([\w-]{36})\/foto$/))) {
      const g = await env.DB.prepare("SELECT foto FROM gatos WHERE id=?").bind(r[1]).first();
      return g ? fotoResp(g.foto, cors, "no-store") : resp({ erro: "Não encontrado." }, 404, cors);
    }
    if (m === "POST" && (r = p.match(/^\/admin\/gatos\/([\w-]{36})\/aprovar$/))) {
      const x = await env.DB.prepare("UPDATE gatos SET status='aprovado' WHERE id=?").bind(r[1]).run();
      return resp({ ok: x.meta.changes > 0 }, 200, cors);
    }
    if (m === "DELETE" && (r = p.match(/^\/admin\/gatos\/([\w-]{36})$/))) {
      const x = await env.DB.prepare("DELETE FROM gatos WHERE id=?").bind(r[1]).run();
      return resp({ ok: x.meta.changes > 0 }, 200, cors);
    }
  }
  return resp({ erro: "Não encontrado." }, 404, cors);
}

// Aceita SÓ o nome de usuário, sem "@" nem link; devolve o usuário em minúsculo ou null.
// Regras do Instagram: 1 a 30 caracteres entre letras, números, ponto e sublinhado; sem ".." nem ponto no começo/fim.
// ponytail: só valida o formato, não confirma se a conta existe.
function normalizarInstagram(v) {
  const s = String(v ?? "").trim();
  return /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/.test(s) ? s.toLowerCase() : null;
}

async function cadastrar(req, env, cors, ctx) {
  // corpo limitado antes de ler (o Content-Length é conferido de novo no texto lido, pois pode faltar ou mentir)
  if (Number(req.headers.get("content-length")) > MAX_CORPO) return resp({ erro: "Dados grandes demais." }, 413, cors);
  const txt = await req.text();
  if (txt.length > MAX_CORPO) return resp({ erro: "Dados grandes demais." }, 413, cors);
  let b = null;
  try { b = JSON.parse(txt); } catch { /* inválido: tratado abaixo */ }
  if (!b || typeof b !== "object" || Array.isArray(b)) return resp({ erro: "Dados inválidos." }, 400, cors);

  const nome = String(b.nome ?? "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  const mes = Number(b.mes), ano = Number(b.ano), dia = b.dia ? Number(b.dia) : null;
  const agora = new Date(), anoAtual = agora.getUTCFullYear();
  if (!nome || nome.length > 40) return resp({ erro: "Nome inválido (1 a 40 caracteres)." }, 400, cors);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return resp({ erro: "Mês inválido. Escolha de janeiro a dezembro." }, 400, cors);
  if (!Number.isInteger(ano) || ano < anoAtual - IDADE_MAX || ano > anoAtual) return resp({ erro: `Ano inválido. Informe um ano entre ${anoAtual - IDADE_MAX} e ${anoAtual}.` }, 400, cors);
  if (dia !== null) {
    const t = new Date(Date.UTC(ano, mes - 1, dia));
    if (!Number.isInteger(dia) || t.getUTCMonth() !== mes - 1) return resp({ erro: "O dia não existe nesse mês." }, 400, cors);
    if (t > agora) return resp({ erro: "A data não pode estar no futuro." }, 400, cors);
  } else if (ano === anoAtual && mes > agora.getUTCMonth() + 1) return resp({ erro: "A data não pode estar no futuro." }, 400, cors);

  // cidade: o cliente manda o código IBGE; nome e UF vêm da nossa lista oficial (nada digitado pelo usuário é gravado)
  const idCidade = Number(b.cidade);
  const local = Number.isInteger(idCidade) ? CIDADES[idCidade] : undefined;
  if (!local) return resp({ erro: "Cidade inválida. Escolha uma cidade da lista." }, 400, cors);
  const [cidade, uf] = local;

  // instagram de contato (será exibido publicamente no botão "Quero adotar"); a pessoa precisa concordar
  const instagram = normalizarInstagram(b.instagram);
  if (!instagram) return resp({ erro: "Instagram inválido. Digite só o nome de usuário, sem o @ (ex.: gatinhos.do.bairro)." }, 400, cors);
  if (b.aceite !== true) return resp({ erro: "É preciso concordar com a exibição pública do Instagram." }, 400, cors);

  // foto: precisa ser JPEG de verdade (começa com FFD8FF, termina com FFD9) e de tamanho razoável
  const f = String(b.foto ?? "");
  const pref = "data:image/jpeg;base64,";
  if (!f.startsWith(pref) || f.length - pref.length > MAX_FOTO_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(f.slice(pref.length)))
    return resp({ erro: "Foto inválida ou grande demais." }, 400, cors);
  const foto = f.slice(pref.length);
  let bytes;
  try { bytes = bytesDoBase64(foto); } catch { return resp({ erro: "A foto não é um JPEG válido." }, 400, cors); } // base64 com tamanho inválido faz atob lançar erro
  if (bytes.length < 200 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
    return resp({ erro: "A foto não é um JPEG válido." }, 400, cors);

  // captcha (falha fechada: sem segredo configurado, ninguém cadastra)
  if (!env.TURNSTILE_SECRET) return resp({ erro: "Captcha não configurado." }, 500, cors);
  const ip = req.headers.get("CF-Connecting-IP") || "";
  const fd = new FormData();
  fd.append("secret", env.TURNSTILE_SECRET); fd.append("response", String(b.captcha ?? "")); fd.append("remoteip", ip);
  const v = await (await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: fd })).json().catch(() => ({}));
  if (!v.success) return resp({ erro: "Falha na verificação anti-robô. Tente de novo." }, 403, cors);

  // limites: por visitante (IP guardado só como hash) e tamanho da fila de moderação
  const ipHash = await sha256hex(ip + (env.ADMIN_TOKEN || ""));
  const desde = Date.now() - 86400_000;
  const rec = await env.DB.prepare("SELECT COUNT(*) AS n FROM gatos WHERE ip=? AND criado>?").bind(ipHash, desde).first();
  if (rec.n >= MAX_POR_DIA) return resp({ erro: `Limite de ${MAX_POR_DIA} cadastros por dia atingido. Tente novamente amanhã.` }, 429, cors);
  const hora = await env.DB.prepare("SELECT COUNT(*) AS n FROM gatos WHERE criado>?").bind(Date.now() - 3600_000).first();
  if (hora.n >= MAX_POR_HORA) return resp({ erro: "Muitos cadastros agora. Tente de novo em alguns minutos." }, 503, cors);
  const pend = await env.DB.prepare("SELECT COUNT(*) AS n FROM gatos WHERE status='pendente'").first();
  if (pend.n >= MAX_PENDENTES) return resp({ erro: "Fila de aprovação cheia. Tente mais tarde." }, 503, cors);

  await env.DB.prepare("INSERT INTO gatos (id, nome, mes, ano, dia, cidade, uf, instagram, foto, status, ip, criado) VALUES (?,?,?,?,?,?,?,?,?, 'pendente', ?, ?)")
    .bind(crypto.randomUUID(), nome, mes, ano, dia, cidade, uf, instagram, foto, ipHash, Date.now()).run();
  ctx?.waitUntil(avisarNovoCadastro(env, { nome, mes, ano, dia, cidade, uf, instagram }, bytes));
  return resp({ ok: true, mensagem: "Cadastro enviado para aprovação." }, 201, cors);
}

// ---------- notificação por Telegram ----------
// Segredos (wrangler secret put): TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID. Sem eles, nada é enviado e o cadastro segue normal.
async function telegram(env, metodo, campos, foto) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { ok: false, descricao: "Telegram não configurado (faltam TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID)." };
  const fd = new FormData();
  fd.append("chat_id", env.TELEGRAM_CHAT_ID);
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  if (foto) fd.append("photo", new Blob([foto], { type: "image/jpeg" }), "gato.jpg");
  try {
    const r = await fetch(`${env.TELEGRAM_API || "https://api.telegram.org"}/bot${env.TELEGRAM_BOT_TOKEN}/${metodo}`, { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) console.error("Telegram falhou:", r.status, j.description); // nunca registra o token
    return { ok: !!j.ok, descricao: j.ok ? "Enviado." : (j.description || "Falha ao enviar.") };
  } catch (e) {
    console.error("Telegram indisponível:", e.message);
    return { ok: false, descricao: "Telegram indisponível." };
  }
}
async function avisarNovoCadastro(env, g, fotoBytes) {
  const nasc = (g.dia ? String(g.dia).padStart(2, "0") + "/" : "") + String(g.mes).padStart(2, "0") + "/" + g.ano;
  // texto puro (sem parse_mode): nada digitado pelo visitante é interpretado como formatação
  const legenda = `Novo gato aguardando aprovação\nNome: ${g.nome}\nNascimento: ${nasc}\nLocal: ${g.cidade}/${g.uf}\nInstagram: ${g.instagram}\n\nAprovar ou rejeitar: ${env.ADMIN_URL || ""}`;
  await telegram(env, "sendPhoto", { caption: legenda }, fotoBytes);
}
