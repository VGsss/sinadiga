const $ = id => document.getElementById(id);
const INTERVALO_MS = 60_000; // atualização automática: 1 minuto
const TITULO = document.title;
let token = sessionStorage.getItem("sinadiga.admin") || "";
let timer = null, conhecidos = null, destacados = new Set(), assinatura = "", fotos = new Map(); // fotos: id -> endereço local da imagem (evita baixar de novo a cada minuto)
const H = () => ({ Authorization: "Bearer " + token });
function aviso(t, ok) { const m = $("msg"); m.hidden = !t; m.className = ok ? "ok" : "erro"; m.textContent = t || ""; }

async function foto(id) { // a foto exige o token, então busca como arquivo e exibe localmente
  if (!fotos.has(id)) {
    const r = await fetch(`${SINADIGA.api}/admin/gatos/${id}/foto`, { headers: H() });
    fotos.set(id, r.ok ? URL.createObjectURL(await r.blob()) : "");
  }
  return fotos.get(id);
}
async function acao(metodo, caminho) {
  const r = await fetch(SINADIGA.api + caminho, { method: metodo, headers: H() });
  if (!r.ok) return aviso("Falha na operação (" + r.status + ").", false);
  carregarLista();
}
function tabela(el, gatos, aprovados, novos) {
  el.innerHTML = gatos.length
    ? `<table><thead><tr><th>Foto</th><th>Nome</th><th>Nascimento</th><th>Idade</th><th>Local</th><th>Instagram</th><th>Enviado em</th><th></th></tr></thead><tbody>${gatos.map(g =>
        `<tr${novos.has(g.id) ? ' class="novo"' : ""}><td><img data-foto="${g.id}" alt="" style="width:60px;height:80px"></td><td>${escHtml(g.nome)}${novos.has(g.id) ? ' <b class="selo">NOVO</b>' : ""}</td><td>${nascTexto(g)}</td><td>${idadeTexto(g)}</td><td>${g.cidade ? escHtml(localTexto(g)) : "-"}</td><td>${normalizarInstagram(g.instagram) ? `<a class="l" href="https://www.instagram.com/${normalizarInstagram(g.instagram)}/" target="_blank" rel="noopener noreferrer">${normalizarInstagram(g.instagram)}</a>` : "-"}</td><td>${new Date(g.criado).toLocaleString("pt-BR")}</td>
        <td>${aprovados ? "" : `<button data-ap="${g.id}">Aprovar</button> `}<button data-rm="${g.id}">${aprovados ? "Remover" : "Rejeitar"}</button></td></tr>`).join("")}</tbody></table>`
    : "<p>Nenhum cadastro.</p>";
  el.querySelectorAll("[data-ap]").forEach(b => b.onclick = () => acao("POST", `/admin/gatos/${b.dataset.ap}/aprovar`));
  el.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => confirm("Excluir este cadastro definitivamente?") && acao("DELETE", `/admin/gatos/${b.dataset.rm}`));
  el.querySelectorAll("img[data-foto]").forEach(async i => { i.src = await foto(i.dataset.foto); });
}
function sair(msg) {
  sessionStorage.removeItem("sinadiga.admin"); token = ""; conhecidos = null; destacados = new Set(); assinatura = ""; clearInterval(timer); timer = null;
  document.title = TITULO; $("painel").hidden = true; $("login").hidden = false; aviso(msg, false);
}
async function carregarLista() {
  let r;
  try { r = await fetch(SINADIGA.api + "/admin/gatos", { headers: H() }); }
  catch (e) { return aviso("Sem conexão com o servidor. Vou tentar de novo no próximo minuto.", false); }
  if (r.status === 401) return sair("Senha incorreta.");
  if (r.status === 429) return sair("Muitas tentativas. Aguarde 1 minuto antes de tentar de novo.");
  if (!r.ok) return aviso("Não foi possível carregar (" + r.status + ").", false);
  const todos = await r.json();
  aviso("");
  $("login").hidden = true; $("painel").hidden = false;
  $("hora").textContent = new Date().toLocaleTimeString("pt-BR");
  if (!timer) timer = setInterval(carregarLista, INTERVALO_MS);

  const pendentes = todos.filter(g => g.status === "pendente"), aprovados = todos.filter(g => g.status === "aprovado");
  // "novo" = cadastro pendente que apareceu depois que o painel foi aberto; fica destacado até ser aprovado/rejeitado ou a página recarregar
  if (conhecidos) todos.filter(g => !conhecidos.has(g.id) && g.status === "pendente").forEach(g => destacados.add(g.id));
  conhecidos = new Set(todos.map(g => g.id));
  const idsPend = new Set(pendentes.map(g => g.id));
  destacados = new Set([...destacados].filter(id => idsPend.has(id)));

  document.title = pendentes.length ? `(${pendentes.length}) ${TITULO}` : TITULO;
  const a = $("alerta");
  a.hidden = !pendentes.length;
  a.textContent = pendentes.length
    ? `${pendentes.length} cadastro${pendentes.length > 1 ? "s" : ""} aguardando aprovação` + (destacados.size ? ` (${destacados.size} novo${destacados.size > 1 ? "s" : ""} desde que você abriu o painel)` : "")
    : "";

  // só redesenha as tabelas quando algo mudou (evita piscar a cada minuto)
  const nova = JSON.stringify([todos.map(g => [g.id, g.status, g.nome, g.cidade, g.instagram]), [...destacados]]);
  if (nova !== assinatura) { assinatura = nova; tabela($("pendentes"), pendentes, false, destacados); tabela($("aprovados"), aprovados, true, new Set()); }
}

$("login").onsubmit = e => { e.preventDefault(); token = $("token").value; sessionStorage.setItem("sinadiga.admin", token); $("token").value = ""; conhecidos = null; destacados = new Set(); assinatura = ""; carregarLista(); };
$("sair").onclick = () => sair("");
$("atualizar").onclick = carregarLista;
$("testeTg").onclick = async () => {
  const r = await fetch(SINADIGA.api + "/admin/telegram-teste", { method: "POST", headers: H() });
  const j = await r.json().catch(() => ({}));
  aviso(r.ok ? "Mensagem de teste enviada ao Telegram. Confira o celular." : "Telegram: " + (j.descricao || "falha ao enviar (" + r.status + ")."), r.ok);
};
$("relTg").onclick = async () => {
  const r = await fetch(SINADIGA.api + "/admin/relatorio-teste", { method: "POST", headers: H() });
  const j = await r.json().catch(() => ({}));
  aviso(r.ok ? "Relatório de hoje (parcial) enviado ao Telegram." : "Telegram: " + (j.descricao || "falha ao enviar (" + r.status + ")."), r.ok);
};
if (token) carregarLista();
