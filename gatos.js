// Gatos para adoção: carrossel "PROCURADO" alimentado pela API (só gatos aprovados). Funções comuns usadas por index.html, cadastro.html e admin.html.
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function nascTexto(g) { // "15/03/2023" ou "03/2023" (dia é opcional)
  return (g.dia ? String(g.dia).padStart(2, "0") + "/" : "") + String(g.mes).padStart(2, "0") + "/" + g.ano;
}
function idadeTexto(g) {
  const h = new Date();
  let meses = (h.getFullYear() - g.ano) * 12 + h.getMonth() + 1 - g.mes;
  if (g.dia && h.getDate() < g.dia) meses--;
  meses = Math.max(meses, 0);
  const an = Math.floor(meses / 12), me = meses % 12;
  const p = [an && an + (an > 1 ? " anos" : " ano"), me && me + (me > 1 ? " meses" : " mês")].filter(Boolean);
  return p.length ? p.join(" e ") : "recém-nascido";
}
// Aceita SÓ o nome de usuário, sem "@" nem link; devolve o usuário em minúsculo ou null. Mesma regra da API.
function normalizarInstagram(v) {
  const s = String(v ?? "").trim();
  return /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/.test(s) ? s.toLowerCase() : null;
}
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const localTexto = g => g.cidade ? `${g.cidade}/${g.uf}` : "";

function botaoAdotar(g) { // o link só é montado com um usuário que passou na validação
  const u = normalizarInstagram(g.instagram);
  return u ? `<a class="adotar" href="https://www.instagram.com/${u}/" target="_blank" rel="noopener noreferrer">Quero adotar</a>` : "";
}

// Filtra por cidade; se não houver gatos lá, cai para o estado e depois para todos, explicando o que está sendo mostrado.
function filtrarGatos(lista, f, gps) {
  if (!f) return { gatos: lista, nota: "" };
  const porCidade = f.cidade ? lista.filter(g => g.uf === f.uf && g.cidade === f.cidade) : [];
  if (porCidade.length) return { gatos: porCidade, nota: gps ? `Gatos perto de você (${f.cidade}/${f.uf}).` : `Gatos em ${f.cidade}/${f.uf}.` };
  const porUf = lista.filter(g => g.uf === f.uf);
  if (porUf.length) return { gatos: porUf, nota: f.cidade ? `Nenhum gato em ${f.cidade}/${f.uf} ainda. Mostrando os gatos do estado ${f.uf}.` : `Gatos no estado ${f.uf}.` };
  return { gatos: lista, nota: `Nenhum gato em ${f.cidade ? f.cidade + "/" : ""}${f.uf} ainda. Mostrando todos os gatos.` };
}

let __ultimaRenderizacao = 0;
// Só existe na página inicial. opc: { limite: N últimos cadastros, filtro: {uf, cidade}, gps: true se o filtro veio da localização }
async function renderCarrossel(opc = {}) {
  const el = document.getElementById("carrossel");
  if (!el) return;
  const minha = ++__ultimaRenderizacao; // se outra renderização começar antes desta terminar, esta é descartada
  el.className = "carrossel";
  const topo = (titulo, texto) => `<h2>${titulo}</h2><div class="car-topo"><p>${texto}</p><button type="button" class="filtro">Filtrar por cidade</button></div>`;
  const ligarFiltro = () => { const b = el.querySelector(".filtro"); if (b) b.onclick = () => window.abrirFiltro && window.abrirFiltro(); };
  let gatos;
  try {
    const r = await fetch(SINADIGA.api + "/gatos");
    if (!r.ok) throw new Error(r.status);
    gatos = await r.json();
  } catch (e) {
    if (minha !== __ultimaRenderizacao) return;
    el.innerHTML = topo("Gatos procurados", "Não foi possível carregar a lista de gatos agora. Tente novamente mais tarde."); return ligarFiltro();
  }
  if (minha !== __ultimaRenderizacao) return;

  let titulo = "Gatos procurados", nota = "";
  if (opc.limite) { gatos = gatos.slice(0, opc.limite); titulo = gatos.length < opc.limite ? "Últimos gatos cadastrados" : `Últimos ${opc.limite} gatos cadastrados`; }
  else if (opc.filtro) ({ gatos, nota } = filtrarGatos(gatos, opc.filtro, opc.gps));
  if (!gatos.length) { el.innerHTML = topo(titulo, 'Nenhum gato aprovado ainda. <a class="l" href="cadastro.html">Cadastre o primeiro</a>.'); return ligarFiltro(); }

  el.innerHTML = topo(titulo, `${nota ? nota + " " : ""}${gatos.length} ${gatos.length > 1 ? "gatos procuram" : "gato procura"} um lar. <a class="l" href="cadastro.html">Cadastrar gato</a>`) + `
    <div class="car-wrap"><button class="car-btn prev" aria-label="Anterior">‹</button>
    <div class="trilho" tabindex="0">${gatos.map(g => `<div class="card-p"><div class="faixa">PROCURADO</div>
      <div class="poster"><img src="${SINADIGA.api}/gatos/${g.id}/foto" alt="Foto de ${escHtml(g.nome)}" loading="lazy"></div>
      <p class="nome">${escHtml(g.nome)}</p><p class="data">Nascido em ${nascTexto(g)}</p><p class="data">Idade: ${idadeTexto(g)}</p>${g.cidade ? `<p class="data">Local: ${escHtml(localTexto(g))}</p>` : ""}${botaoAdotar(g)}</div>`).join("")}</div>
    <button class="car-btn next" aria-label="Próximo">›</button></div>`;
  ligarFiltro();
  const t = el.querySelector(".trilho"), passo = () => t.querySelector(".card-p").offsetWidth + 20;
  const prox = () => t.scrollLeft + t.clientWidth >= t.scrollWidth - 20 ? t.scrollTo({ left: 0 }) : t.scrollBy({ left: passo() });
  el.querySelector(".prev").onclick = () => t.scrollBy({ left: -passo() });
  el.querySelector(".next").onclick = prox;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) { // avanço automático; pausa com o mouse em cima
    let parado = false;
    el.onmouseenter = el.onfocusin = () => parado = true;
    el.onmouseleave = el.onfocusout = () => parado = false;
    clearInterval(window.__car);
    window.__car = setInterval(() => { if (!parado && t.scrollWidth > t.clientWidth) prox(); }, 4000);
  }
}
