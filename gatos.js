// Gatos para adoção: carrossel "PROCURADO" alimentado pela API (só gatos aprovados). Usado por index.html e cadastro.html.
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

function botaoAdotar(g) { // o link só é montado com um usuário que passou na validação
  const u = normalizarInstagram(g.instagram);
  return u ? `<a class="adotar" href="https://www.instagram.com/${u}/" target="_blank" rel="noopener noreferrer">Quero adotar</a>` : "";
}

async function renderCarrossel() {
  const el = document.getElementById("carrossel");
  if (!el) return;
  el.className = "carrossel";
  const aqui = location.pathname.endsWith("cadastro.html");
  const vazio = txt => { el.innerHTML = `<h2>Gatos procurados para adoção</h2><p>${txt}</p>`; };
  let gatos;
  try {
    const r = await fetch(SINADIGA.api + "/gatos");
    if (!r.ok) throw new Error(r.status);
    gatos = await r.json();
  } catch (e) { return vazio("Não foi possível carregar a lista de gatos agora. Tente novamente mais tarde."); }
  if (!gatos.length) return vazio(`Nenhum gato aprovado ainda.${aqui ? "" : ' <a class="l" href="cadastro.html">Cadastre o primeiro</a>.'}`);

  el.innerHTML = `<h2>Gatos procurados para adoção</h2><p>${gatos.length} ${gatos.length > 1 ? "gatos procuram" : "gato procura"} um lar. <a class="l" href="cadastro.html">Cadastrar gato</a></p>
    <div class="car-wrap"><button class="car-btn prev" aria-label="Anterior">‹</button>
    <div class="trilho" tabindex="0">${gatos.map(g => `<div class="card-p"><div class="faixa">PROCURADO</div>
      <div class="poster"><img src="${SINADIGA.api}/gatos/${g.id}/foto" alt="Foto de ${escHtml(g.nome)}" loading="lazy"></div>
      <p class="nome">${escHtml(g.nome)}</p><p class="data">Nascido em ${nascTexto(g)}</p><p class="data">Idade: ${idadeTexto(g)}</p>${botaoAdotar(g)}</div>`).join("")}</div>
    <button class="car-btn next" aria-label="Próximo">›</button></div>`;
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
renderCarrossel();
