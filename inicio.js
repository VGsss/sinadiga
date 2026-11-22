// [crime, enquadramento (de brincadeira), descrição — $ = nome do gato]
const CRIMES = [
  ["Peculato", "Art. 312 do CP", "Desviou petiscos destinados ao patrimônio público (a tigela do outro gato)."],
  ["Sonegação fiscal", "Lei 8.137/90", "Escondeu 14 bolinhas de pelo da Receita Federal e nunca pagou o imposto de ronronar."],
  ["Atentado ao pudor", "Art. 233 do CP", "$ lambeu-se nas partes íntimas no meio da sala, diante da visita e da sogra."],
  ["Preconceito religioso", "Lei 7.716/89", "Perseguiu o gato de terreiro vizinho alegando que a sua fé era a única verdadeira: a Ração Premium."],
  ["Vandalismo", "Art. 163 do CP", "Destruiu o sofá novo, 3 cortinas e o futuro emocional do dono."],
  ["Peculato qualificado", "Art. 312, §1º", "Subtraiu uma sardinha da geladeira valendo-se da facilidade que o cargo de 'fofinho' lhe proporciona."],
  ["Furto qualificado", "Art. 155, §4º", "Furtou o frango do almoço por rompimento de obstáculo (a porta da cozinha entreaberta)."],
  ["Roubo majorado", "Art. 157 do CP", "Assaltou o dedão do pé de transeunte noturno, de surpresa, atrás do móvel."],
  ["Estelionato", "Art. 171 do CP", "Fingiu que não comia há 3 dias para ganhar o quarto prato do dia."],
  ["Falsidade ideológica", "Art. 299 do CP", "Declarou ser 'um gato de rua carente' tendo cama própria, caixa de areia e plano de saúde."],
  ["Receptação", "Art. 180 do CP", "Foi flagrado com 11 elásticos de cabelo, 2 meias e uma tampinha de origem desconhecida."],
  ["Associação criminosa", "Art. 288 do CP", "Comandava quadrilha de 4 gatos que miava coordenado às 4h da manhã."],
  ["Lavagem de dinheiro", "Lei 9.613/98", "Escondeu moedas debaixo do tapete e as fez circular pelo chão da casa."],
  ["Corrupção passiva", "Art. 317 do CP", "Aceitou carinho na barriga em troca de deixar o dono dormir."],
  ["Tráfico de influência", "Art. 332 do CP", "Alegou ter contatos no setor de petiscos e cobrou pedágio de todos os humanos da casa."],
  ["Desacato a autoridade", "Art. 331 do CP", "Olhou fixamente para o dono, derrubou o copo da mesa e saiu andando."],
  ["Desobediência", "Art. 330 do CP", "Ignorou 47 vezes a ordem 'sai daí!' sem qualquer remorso."],
  ["Invasão de domicílio", "Art. 150 do CP", "Entrou na casa da vizinha pela janela e se deitou no melhor sofá."],
  ["Ameaça", "Art. 147 do CP", "Prometeu pelo olhar que mataria o cachorro assim que ficasse dono da casa."],
  ["Perturbação do sossego", "Art. 42 da LCP", "Corrida de madrugada, com trilha sonora de miados e jogo de panelas."],
  ["Ato obsceno", "Art. 233 do CP", "Exibiu o bumbum ao convidado do jantar, com o rabo erguido bem na cara dele."],
  ["Cárcere privado", "Art. 148 do CP", "Deitou no colo do dono e o manteve imóvel por 3 horas, com a bexiga estourando."],
  ["Contrabando", "Art. 334-A do CP", "Importou 1 camundongo sem nota fiscal e o escondeu embaixo da cama."],
  ["Jogo do bicho", "Art. 58 da LCP", "Explorou aposta clandestina sobre qual passarinho iria pousar na janela."],
  ["Injúria", "Art. 140 do CP", "Chamou o cachorro de 'bicho feio' em miadês claro e audível."],
  ["Difamação", "Art. 139 do CP", "Espalhou pela vizinhança que o dono come ração às escondidas."],
  ["Dano ao patrimônio público", "Art. 163, III", "Derrubou o vaso do prédio e foi flagrado lambendo a evidência."],
  ["Dirigir sem habilitação", "Art. 309 do CTB", "Foi visto pilotando um aspirador robô em velocidade incompatível com a via."],
  ["Abuso de autoridade", "Lei 13.869/19", "Acordou o dono às 5h em ponto, deu patada no rosto e exigiu ração à base de ameaça."],
  ["Apropriação indébita", "Art. 168 do CP", "Pegou emprestado o cantinho do dono na cama e jamais devolveu."],
  ["Fraude em licitação", "Lei 14.133/21", "Combinou com outro gato quem ficaria com o melhor lugar ao sol."],
  ["Crime ambiental", "Lei 9.605/98", "Abateu 2 pombos, 1 lagartixa e o equilíbrio ecológico do quintal."],
  ["Maus-tratos ao dono", "Art. 136 do CP", "Submeteu o dono a condições degradantes: arranhões, pelo no prato e silêncio de desprezo."],
];
const STATUS = ["FORAGIDO", "SOLTO POR FALTA DE PROVAS (E DE VERGONHA)", "LIBERDADE PROVISÓRIA (NO SOFÁ)", "REINCIDENTE", "ALTAMENTE PERICULOSO (FOFO)"];
// O QR Code do PDF contém SOMENTE o endereço do site (nenhum dado da ficha viaja no link).
const SITE_URL = "https://sinadiga.com.br/", SITE_TEXTO = "sinadiga.com.br";
const $ = id => document.getElementById(id);
const rnd = n => Math.floor(Math.random() * n);
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let F; // ficha atual: {n,r,p,t,s,v,c:[[idxCrime,pena]], photo(dataURL)}

function go(n) {
  document.querySelectorAll(".etapa").forEach(e => e.hidden = e.id !== "e" + n);
  document.querySelectorAll("nav a[data-s]").forEach(a => a.classList.toggle("on", a.dataset.s == n));
  if (n == 3) document.querySelector('nav a[data-s="3"]').classList.remove("off");
  scrollTo(0, 0);
}

// recorta (cover) para w x h em tons de cinza
function cinza(src, w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
  const s = Math.max(w / src.width, h / src.height), dw = src.width * s, dh = src.height * s;
  x.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const id = x.getImageData(0, 0, w, h), p = id.data;
  for (let i = 0; i < p.length; i += 4) p[i] = p[i + 1] = p[i + 2] = .3 * p[i] + .59 * p[i + 1] + .11 * p[i + 2];
  x.putImageData(id, 0, 0);
  return c;
}
const carregar = url => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });

async function gerar() {
  const nome = $("nome").value.trim();
  if (!nome) return;
  const f = $("foto").files[0];
  const F2 = {
    n: nome,
    r: Array.from({ length: 3 }, () => String(100 + rnd(900))).join(".") + "-" + rnd(10) + "M",
    p: (1000 + rnd(9000)) + "/" + new Date().getFullYear(),
    t: Math.floor(Date.now() / 1000),
    s: rnd(STATUS.length), v: 1 + rnd(7),
    c: CRIMES.map((_, i) => [Math.random(), i]).sort((a, b) => a[0] - b[0]).slice(0, 5 + rnd(6)).map(x => [x[1], 1 + rnd(12)]),
  };
  if (f) {
    const u = URL.createObjectURL(f);
    try {
      const img = await carregar(u), grande = cinza(img, 300, 400);
      F2.photo = grande.toDataURL("image/jpeg", .85);
    } finally { URL.revokeObjectURL(u); }
  }
  F = F2;
  mostrar();
}

function mostrar() {
  const N = esc(F.n), d = new Date(F.t * 1000);
  $("nomeOut").textContent = F.n;
  $("proc").textContent = F.p;
  $("data").textContent = d.toLocaleDateString("pt-BR");
  $("rgf").textContent = F.r;
  $("situ").textContent = STATUS[F.s];
  $("vidas").textContent = F.v + " de 9";
  $("img").hidden = !F.photo;
  if (F.photo) $("img").src = F.photo;
  $("emoji").hidden = !!F.photo;
  let anos = 0;
  $("resumo").innerHTML = `Foram encontradas <b>${F.c.length} ocorrências</b> em nome do requerente <b>${N}</b>, conforme relação abaixo:`;
  $("lista").innerHTML = F.c.map(([k, p], i) => {
    const [c, art, desc] = CRIMES[k]; anos += p;
    return `<tr><td>${i + 1}</td><td><b>${c}</b><br><span class="desc">${desc.replace(/\$/g, N)}</span></td><td>${art}</td><td>${p} ano${p > 1 ? "s" : ""}</td></tr>`;
  }).join("");
  F.anos = anos;
  $("pena").textContent = `PENA TOTAL: ${anos} ANOS (regime semiaberto, no sofá)`;
  go(3);
}

// ---------- PDF: layout do atestado + dados da ficha + QR Code funcional ----------
function brasao(d, x, y, r, tipo) {
  d.setDrawColor(40); d.setLineWidth(.5);
  if (tipo) { // escudo com patinha
    d.setFillColor(26, 61, 109); d.roundedRect(x - r, y - r, 2 * r, 2.2 * r, 3, 3, "FD");
    d.setFillColor(255, 255, 255);
    d.circle(x, y + r * .35, r * .38, "F");
    [[-.55, -.25], [-.2, -.6], [.2, -.6], [.55, -.25]].forEach(([a, b]) => d.circle(x + a * r, y + b * r + r * .35, r * .17, "F"));
  } else { // medalhão com cara de gato
    d.setFillColor(201, 162, 39); d.circle(x, y, r, "FD");
    d.setFillColor(60, 45, 10); d.circle(x, y + r * .1, r * .6, "F");
    d.triangle(x - r * .6, y - r * .1, x - r * .5, y - r * .75, x - r * .1, y - r * .45, "F");
    d.triangle(x + r * .6, y - r * .1, x + r * .5, y - r * .75, x + r * .1, y - r * .45, "F");
    d.setFillColor(201, 162, 39);
    d.circle(x - r * .25, y, r * .12, "F"); d.circle(x + r * .25, y, r * .12, "F");
  }
}

// ponytail: a lib gera um QR ilegível na versão 23 (testado com zxing e jsQR); usa só versões que os dois leram.
function criarQR(texto) {
  for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 15, 16, 18, 20, 22, 24, 28]) {
    try { const q = qrcode(v, "L"); q.addData(texto); q.make(); return q; } catch (e) { /* não coube: tenta a próxima versão */ }
  }
  throw new Error("dados grandes demais para o QR Code");
}

async function baixarPDF() {
  const { jsPDF } = window.jspdf;
  const d = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, M = 15, CW = W - 2 * M, nl = (t, w) => d.splitTextToSize(t, w);
  d.setLineWidth(.35); d.setDrawColor(0); d.setTextColor(0);
  const dt = new Date(F.t * 1000), data = dt.toLocaleDateString("pt-BR"), hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const codigo = "SNDG-" + F.p.replace("/", "-") + "-" + F.r.replace(/\D/g, "") + "M";

  // cabeçalho
  brasao(d, M + 10, 21, 8, 0); brasao(d, W - M - 10, 21, 8, 1);
  d.setFont("helvetica", "normal"); d.setFontSize(10);
  d.text("Sistema Nacional de Distribuição de Gatos", W / 2, 15, { align: "center" });
  d.text("SINADIGA - Instituto de Identificação Felina Whiskas Daunt", W / 2, 20, { align: "center" });
  d.setFont("helvetica", "bold"); d.setFontSize(13);
  d.text("Atestado de Antecedentes Felinos", W / 2, 29, { align: "center" });

  // quadro 1: qualificação + foto + QR
  let y = 38; const h1 = 64;
  d.rect(M, y, CW, h1);
  const fx = M + 5, fy = y + 5;
  if (F.photo) d.addImage(F.photo, "JPEG", fx, fy, 30, 40);
  else { d.setFillColor(225); d.rect(fx, fy, 30, 40, "F"); d.setFont("helvetica", "normal"); d.setFontSize(7); d.text("SEM FOTO", fx + 15, fy + 20, { align: "center" }); }
  d.rect(fx, fy, 30, 40);
  d.setFont("helvetica", "bold"); d.setFontSize(9);
  d.text(nl(F.n.toUpperCase(), 36).slice(0, 2), fx + 15, fy + 45, { align: "center" });

  const LX = M + 42, VX = M + 77, VW = 44; let ly = y + 9;
  const linha = (k, v) => {
    d.setFont("helvetica", "bold"); d.setFontSize(8); d.text(k, LX, ly);
    d.setFont("helvetica", "normal"); const t = nl(v, VW); d.text(t, VX, ly); ly += t.length * 3.6 + 3;
  };
  linha("Documento Informado:", "RGF");
  linha("Nome:", F.n);
  linha("Nº RGF:", F.r);
  linha("Processo nº:", F.p);
  linha("Situação:", STATUS[F.s]);
  linha("Vidas restantes:", F.v + " de 9");
  linha("Data da emissão:", data);

  const qr = criarQR(SITE_URL);
  const n = qr.getModuleCount(), Q = 48, m = Q / n, qx = W - M - 5 - Q, qy = y + 6;
  d.setFillColor(0);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!qr.isDark(r, c)) continue;
    let e = c; while (e + 1 < n && qr.isDark(r, e + 1)) e++; // junta módulos vizinhos numa linha
    d.rect(qx + c * m, qy + r * m, (e - c + 1) * m + .08, m + .08, "F"); c = e; // .08 mm de sobra evita frestas brancas entre as linhas
  }
  d.setFont("helvetica", "normal"); d.setFontSize(6.5);
  d.text("Acesse o SINADIGA", qx + Q / 2, qy + Q + 6, { align: "center" });

  // quadro 2: atestado + assinatura
  y += h1 + 8; const h2 = 40;
  d.rect(M, y, CW, h2);
  d.setFontSize(8); d.setFont("helvetica", "normal");
  d.text(nl(`Atesto que, para a combinação de dados de qualificação acima informada, EXISTEM ${F.c.length} registros de antecedentes jurídico-felinos, até a presente data, no Instituto de Identificação Felina Whiskas Daunt, totalizando ${F.anos} anos de pena a cumprir no sofá.`, CW - 10), M + 5, y + 7);
  d.setFont("helvetica", "bold"); d.text("IMPORTANTE:", M + 5, y + 20);
  d.text(nl("Este atestado é válido somente com a apresentação do gato em questão ou, na sua ausência, de uma lata de atum aberta.", 110), M + 5, y + 25);
  d.setDrawColor(20, 30, 120); d.setLineWidth(.4); // assinatura rabiscada
  d.lines([[3, -6, 6, -6, 8, 0], [2, 5, 5, 4, 7, -4], [3, -8, 6, -2, 8, 3], [4, 4, 8, -3, 13, -1]], W - M - 62, y + 28);
  d.setDrawColor(0); d.setLineWidth(.35); d.setFont("helvetica", "normal"); d.setFontSize(6.5);
  d.text(["Dr. Bigodes de Almeida", "Delegado de Polícia Felina"], W - M - 43, y + 34, { align: "center" });

  // relação de ocorrências
  y += h2 + 8;
  const cols = [8, 104, 38, 30], xs = [M]; cols.forEach((w, i) => xs.push(xs[i] + w));
  const cab = () => {
    d.setFillColor(232, 237, 243); d.rect(M, y, CW, 6, "FD"); d.setFont("helvetica", "bold"); d.setFontSize(8);
    ["Nº", "Ocorrência", "Enquadramento", "Pena"].forEach((t, i) => d.text(t, xs[i] + 2, y + 4.2));
    y += 6;
  };
  d.setFont("helvetica", "bold"); d.setFontSize(9); d.text("Relação de ocorrências", M, y - 2);
  cab();
  F.c.forEach(([k, p], i) => {
    const [c, art, desc] = CRIMES[k], t = nl(desc.replace(/\$/g, F.n), cols[1] - 4), h = 7 + t.length * 3.5;
    if (y + h > 280) { d.addPage(); y = 20; cab(); }
    d.setFillColor(255); d.rect(M, y, CW, h);
    xs.slice(1, -1).forEach(x => d.line(x, y, x, y + h));
    d.setFont("helvetica", "normal"); d.setFontSize(8);
    d.text(String(i + 1), xs[0] + 2, y + 4.2);
    d.text(art, xs[2] + 2, y + 4.2); d.text(p + (p > 1 ? " anos" : " ano"), xs[3] + 2, y + 4.2);
    d.setFont("helvetica", "bold"); d.text(c, xs[1] + 2, y + 4.2);
    d.setFont("helvetica", "normal"); d.setFontSize(7); d.setTextColor(90); d.text(t, xs[1] + 2, y + 8.2); d.setTextColor(0);
    y += h;
  });
  y += 4;
  if (y + 40 > 285) { d.addPage(); y = 20; }
  d.setDrawColor(190, 20, 20); d.setTextColor(190, 20, 20); d.setLineWidth(.8);
  d.rect(M + 40, y, CW - 80, 10); d.setLineWidth(.3); d.rect(M + 41, y + 1, CW - 82, 8);
  d.setFont("helvetica", "bold"); d.setFontSize(10);
  d.text(`PENA TOTAL: ${F.anos} ANOS (regime semiaberto, no sofá)`, W / 2, y + 6.5, { align: "center" });
  d.setDrawColor(0); d.setTextColor(0); d.setLineWidth(.35);

  // quadro 3: emissão e validação
  y += 16;
  d.rect(M, y, CW, 26);
  d.setFont("helvetica", "normal"); d.setFontSize(8);
  d.text(nl(`Este atestado foi emitido em ${data}, às ${hora} horas. Para acessar o SINADIGA, leia o QR Code com a câmera do celular ou digite o endereço abaixo no navegador.`, CW - 10), M + 5, y + 6);
  d.setFont("helvetica", "bold"); d.setTextColor(0, 80, 140); d.text(SITE_TEXTO, M + 5, y + 16);
  d.setTextColor(0); d.text("Código: " + codigo, M + 5, y + 22);
  d.setFont("helvetica", "normal"); d.setFontSize(6); d.setTextColor(120);
  d.text("Documento fictício e humorístico. Nenhum gato foi preso nesta operação.", W / 2, 291, { align: "center" });
  d.save("atestado-" + F.n.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".pdf");
}

document.querySelectorAll("[data-s]").forEach(a => a.onclick = () => go(a.dataset.s));
$("solicitar").onclick = () => go(2);
$("validar").onclick = () => {
  const m = $("msgValidar");
  m.hidden = false;
  m.textContent = "Atestado inválido: o documento foi encontrado, porém o gato dormiu em cima dele.";
};
$("form").onsubmit = e => { e.preventDefault(); gerar(); };
$("outra").onclick = gerar;
$("baixar").onclick = baixarPDF;
// ---------- filtro do carrossel (a janela de cidade só abre por este botão) ----------
let filtroAtual = null, escolheuFiltro = false;
const FM = $("modalFiltro");
window.abrirFiltro = async () => {
  try { await carregarCidades(); } catch (e) { return alert("Não foi possível carregar a lista de cidades."); }
  escolheuFiltro = false;
  preencherUf($("fUf"), "Selecione o estado");
  if (filtroAtual) $("fUf").value = String(CID.ufs.findIndex(u => u[0] === filtroAtual.uf));
  preencherCidades($("fUf"), $("fCidade"), "Todas as cidades");
  if (filtroAtual && filtroAtual.cidade) {
    const c = CID.c.find(x => x[1] === filtroAtual.cidade && CID.ufs[x[2]][0] === filtroAtual.uf);
    if (c) $("fCidade").value = String(c[0]);
  }
  $("fOk").disabled = $("fUf").value === "";
  FM.showModal();
};
$("fUf").onchange = () => { preencherCidades($("fUf"), $("fCidade"), "Todas as cidades"); $("fOk").disabled = $("fUf").value === ""; };
$("formFiltro").onsubmit = () => {
  escolheuFiltro = true;
  const cid = $("fCidade").value ? CID.c.find(c => c[0] === +$("fCidade").value)[1] : null;
  filtroAtual = { uf: CID.ufs[+$("fUf").value][0], cidade: cid };
  renderCarrossel({ filtro: filtroAtual });
};
$("fTodos").onclick = () => { escolheuFiltro = true; filtroAtual = null; renderCarrossel(); FM.close(); };
$("fFechar").onclick = () => FM.close();
FM.addEventListener("click", e => { // clique fora da caixa fecha
  const r = FM.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) FM.close();
});
// fechou sem aplicar nem escolher "ver todos" (clique fora, Esc ou "Agora não"): mostra só os 10 últimos gatos cadastrados
FM.addEventListener("close", () => { if (!escolheuFiltro) { filtroAtual = null; renderCarrossel({ limite: 10 }); } });

// ---------- localização: pedida ao acessar o site; se não for possível, segue mostrando todos (sem janela) ----------
function localizarVisitante() {
  pedirLocalizacao().then(({ cidade }) => {
    filtroAtual = { uf: CID.ufs[cidade[2]][0], cidade: cidade[1] };
    renderCarrossel({ filtro: filtroAtual, gps: true });
  }).catch(() => {});
}
renderCarrossel();
localizarVisitante();
