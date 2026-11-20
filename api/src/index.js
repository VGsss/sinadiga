// API do SINADIGA (Cloudflare Worker + D1). Regras de segurança ficam aqui, no servidor:
// validação, captcha, limite por visitante e moderação (cadastro entra "pendente" até o admin aprovar).

const MAX_FOTO_B64 = 160_000;   // ~120 KB de JPEG
const IDADE_MAX = 30;           // anos: nascimento mais antigo aceito (gatos raramente passam disso)
const MAX_POR_HORA = 5;        // cadastros por visitante por hora
const MAX_PENDENTES = 100;      // fila de moderação cheia = recusa novos cadastros

const resp = (corpo, status, cors, extra = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors, ...extra } });

export default {
  async fetch(req, env) {
    const origem = req.headers.get("Origin") || "";
    const ok = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).includes(origem);
    const cors = ok
      ? { "Access-Control-Allow-Origin": origem, Vary: "Origin", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS" }
      : { Vary: "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try { return await rota(req, env, new URL(req.url), cors); }
    catch (e) { console.error(e); return resp({ erro: "Erro interno." }, 500, cors); }
  },
};

async function sha256(txt) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
}
async function sha256hex(txt) {
  return [...new Uint8Array(await sha256(txt))].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function ehAdmin(req, env) {
  const t = (req.headers.get("Authorization") || "").replace(/^Bearer /, "");
  if (!env.ADMIN_TOKEN || !t) return false;
  const [a, b] = await Promise.all([sha256(t), sha256(env.ADMIN_TOKEN)]);
  return crypto.subtle.timingSafeEqual(a, b); // compara hashes: tempo constante
}
function bytesDoBase64(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }
function fotoResp(b64, cors, cache) {
  return new Response(bytesDoBase64(b64), { headers: { "content-type": "image/jpeg", "cache-control": cache, "x-content-type-options": "nosniff", ...cors } });
}

async function rota(req, env, url, cors) {
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const m = req.method;
  let r;

  // ---------- público ----------
  if (m === "GET" && p === "/gatos") {
    const { results } = await env.DB.prepare("SELECT id, nome, mes, ano, dia, instagram FROM gatos WHERE status='aprovado' ORDER BY criado DESC LIMIT 200").all();
    return resp(results, 200, cors, { "cache-control": "public, max-age=60" });
  }
  if (m === "GET" && (r = p.match(/^\/gatos\/([\w-]{36})\/foto$/))) {
    const g = await env.DB.prepare("SELECT foto FROM gatos WHERE id=? AND status='aprovado'").bind(r[1]).first();
    return g ? fotoResp(g.foto, cors, "public, max-age=86400") : resp({ erro: "Não encontrado." }, 404, cors);
  }
  if (m === "POST" && p === "/gatos") return cadastrar(req, env, cors);

  // ---------- administrador ----------
  if (p.startsWith("/admin/")) {
    if (!(await ehAdmin(req, env))) return resp({ erro: "Não autorizado." }, 401, cors);
    if (m === "GET" && p === "/admin/gatos") {
      const { results } = await env.DB.prepare("SELECT id, nome, mes, ano, dia, instagram, status, criado FROM gatos ORDER BY status DESC, criado DESC LIMIT 500").all();
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

async function cadastrar(req, env, cors) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return resp({ erro: "Dados inválidos." }, 400, cors);

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

  // instagram de contato (será exibido publicamente no botão "Quero adotar"); a pessoa precisa concordar
  const instagram = normalizarInstagram(b.instagram);
  if (!instagram) return resp({ erro: "Instagram inválido. Digite só o nome de usuário, sem o @ (ex.: gatinhos.do.bairro)." }, 400, cors);
  if (b.aceite !== true) return resp({ erro: "É preciso concordar com a exibição pública do Instagram." }, 400, cors);

  // foto: precisa ser JPEG de verdade (começa com FFD8FF, termina com FFD9) e de tamanho razoável
  const f = String(b.foto ?? "");
  const pref = "data:image/jpeg;base64,";
  if (!f.startsWith(pref) || f.length - pref.length > MAX_FOTO_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(f.slice(pref.length)))
    return resp({ erro: "Foto inválida ou grande demais." }, 400, cors);
  const foto = f.slice(pref.length), bytes = bytesDoBase64(foto);
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
  const hora = Date.now() - 3600_000;
  const rec = await env.DB.prepare("SELECT COUNT(*) AS n FROM gatos WHERE ip=? AND criado>?").bind(ipHash, hora).first();
  if (rec.n >= MAX_POR_HORA) return resp({ erro: "Muitos cadastros seguidos. Tente mais tarde." }, 429, cors);
  const fila = await env.DB.prepare("SELECT COUNT(*) AS n FROM gatos WHERE status='pendente'").first();
  if (fila.n >= MAX_PENDENTES) return resp({ erro: "Fila de aprovação cheia. Tente mais tarde." }, 503, cors);

  await env.DB.prepare("INSERT INTO gatos (id, nome, mes, ano, dia, instagram, foto, status, ip, criado) VALUES (?,?,?,?,?,?,?, 'pendente', ?, ?)")
    .bind(crypto.randomUUID(), nome, mes, ano, dia, instagram, foto, ipHash, Date.now()).run();
  return resp({ ok: true, mensagem: "Cadastro enviado para aprovação." }, 201, cors);
}
