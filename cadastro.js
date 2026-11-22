const $ = id => document.getElementById(id);
const hoje = new Date();
$("mes").innerHTML = '<option value="">Selecione</option>' + MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
const ANO_MAX = hoje.getFullYear(), ANO_MIN = ANO_MAX - 30; // mesma regra da API (nascimento até 30 anos atrás)
$("ano").min = ANO_MIN; $("ano").max = ANO_MAX;

const carregar = url => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
function recortar(img, w, h) { // recorte "cover" em JPEG 300x400 (também remove metadados da foto original)
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
  const s = Math.max(w / img.width, h / img.height);
  x.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
  return c.toDataURL("image/jpeg", .82);
}
function aviso(txt, ok) { const m = $("msg"); m.hidden = false; m.className = ok ? "ok" : "erro"; m.textContent = txt; }

// captcha Turnstile (a verificação de verdade é feita no servidor)
let widget = null;
(function esperar() {
  if (window.turnstile) widget = turnstile.render("#captcha", { sitekey: SINADIGA.turnstile, language: "pt-br" });
  else setTimeout(esperar, 200);
})();

$("foto").onchange = () => {
  const f = $("foto").files[0], p = $("previa");
  p.hidden = !f;
  if (f) { const u = URL.createObjectURL(f); p.style.backgroundImage = `url(${u})`; }
};

// ---------- estado e cidade (lista do IBGE e localização: funções em local.js) ----------
function escolher(idCidade) { // preenche os campos do formulário a partir do código IBGE
  const c = CID.c.find(x => x[0] === idCidade);
  if (!c) return false;
  $("uf").value = String(c[2]); preencherCidades($("uf"), $("cidade")); $("cidade").value = String(c[0]);
  return true;
}
function localizar() { // só preenche os campos; se não der, a pessoa escolhe nas listas (sem janela)
  $("locInfo").textContent = "Identificando a cidade mais próxima...";
  pedirLocalizacao().then(({ cidade }) => {
    escolher(cidade[0]);
    $("locInfo").textContent = `Cidade mais próxima da sua localização: ${cidade[1]}/${CID.ufs[cidade[2]][0]}. Você pode alterar nos campos acima.`;
  }).catch(e => { $("locInfo").textContent = (e.motivo || "Não foi possível identificar a sua localização.") + " Escolha o estado e a cidade nos campos acima."; });
}
$("uf").onchange = () => preencherCidades($("uf"), $("cidade"));
$("usarLoc").onclick = () => CID && localizar();
carregarCidades().then(() => { preencherUf($("uf"), "Selecione"); localizar(); })
  .catch(() => { $("uf").innerHTML = '<option value="">Erro ao carregar a lista</option>'; aviso("Não foi possível carregar a lista de cidades. Recarregue a página.", false); });

const CAMPOS = ["foto", "nome", "mes", "ano", "dia", "uf", "cidade", "instagram", "aceite"];
function erroCampo(id, msg) { $(id).classList.add("invalido"); $(id).focus(); aviso(msg, false); return false; }
function validar() {
  CAMPOS.forEach(c => $(c).classList.remove("invalido"));
  const nome = $("nome").value.trim(), mes = +$("mes").value, anoTxt = $("ano").value.trim(), ano = +anoTxt, dia = $("dia").value.trim();
  if (!$("foto").files[0]) return erroCampo("foto", "Escolha a fotografia do gato.");
  if (!nome) return erroCampo("nome", "Informe o nome do gato.");
  if (!mes) return erroCampo("mes", "Selecione o mês de nascimento.");
  if (!/^\d{4}$/.test(anoTxt)) return erroCampo("ano", "Informe o ano com 4 dígitos (ex.: " + ANO_MAX + ").");
  if (ano < ANO_MIN || ano > ANO_MAX) return erroCampo("ano", `Ano inválido. Informe um ano entre ${ANO_MIN} e ${ANO_MAX}.`);
  if (dia) {
    if (!/^\d{1,2}$/.test(dia) || +dia < 1 || +dia > 31) return erroCampo("dia", "Dia inválido. Informe de 1 a 31 ou deixe em branco.");
    const t = new Date(ano, mes - 1, +dia);
    if (t.getMonth() !== mes - 1) return erroCampo("dia", "Esse dia não existe nesse mês.");
    if (t > hoje) return erroCampo("dia", "A data de nascimento não pode estar no futuro.");
  } else if (ano === ANO_MAX && mes > hoje.getMonth() + 1) return erroCampo("mes", "A data de nascimento não pode estar no futuro.");
  if (!CID) return erroCampo("uf", "A lista de cidades ainda não carregou. Aguarde um instante e tente de novo.");
  if ($("uf").value === "") return erroCampo("uf", "Selecione o estado.");
  if (!$("cidade").value) return erroCampo("cidade", "Selecione a cidade (apenas cidades da lista).");
  const insta = $("instagram").value.trim();
  if (insta.includes("@")) return erroCampo("instagram", "Digite o Instagram sem o @ (ex.: gatinhos.do.bairro).");
  if (!normalizarInstagram(insta)) return erroCampo("instagram", "Instagram inválido. Use só letras, números, ponto e sublinhado (até 30), sem espaços, sem @ e sem link.");
  if (!$("aceite").checked) return erroCampo("aceite", "Marque a concordância com a exibição pública do seu Instagram.");
  return true;
}
// aviso imediato enquanto digita o Instagram
$("instagram").oninput = () => {
  const v = $("instagram").value.trim();
  $("dicaInsta").textContent = v.includes("@") ? "Digite sem o @." : /[\/:]/.test(v) ? "Digite só o usuário, sem link." : v && !normalizarInstagram(v) ? "Use só letras, números, ponto e sublinhado." : "";
};

$("form").onsubmit = async e => {
  e.preventDefault();
  if (!validar()) return;
  const f = $("foto").files[0], nome = $("nome").value.trim(), mes = +$("mes").value, ano = +$("ano").value, dia = $("dia").value.trim() ? +$("dia").value : null;
  const instagram = normalizarInstagram($("instagram").value);
  const captcha = widget !== null && window.turnstile ? turnstile.getResponse(widget) : "";
  if (!captcha) return aviso("Confirme a verificação anti-robô antes de enviar.", false);

  $("enviar").disabled = true;
  const u = URL.createObjectURL(f);
  try {
    const foto = recortar(await carregar(u), 300, 400);
    const r = await fetch(SINADIGA.api + "/gatos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nome, mes, ano, dia, cidade: +$("cidade").value, instagram, aceite: true, foto, captcha }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { aviso(j.erro || "Não foi possível enviar o cadastro.", false); }
    else { aviso(`${nome} foi enviado para aprovação. Assim que a administração aprovar, o gato aparece no painel de procurados da página inicial.`, true); $("form").reset(); $("previa").hidden = true; }
  } catch (err) { aviso("Não foi possível enviar o cadastro agora. Verifique a imagem e a conexão e tente de novo.", false); }
  finally { URL.revokeObjectURL(u); $("enviar").disabled = false; if (window.turnstile && widget !== null) turnstile.reset(widget); }
};
