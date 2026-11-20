// Estado e cidade (lista oficial do IBGE em cidades.json) e "cidade mais próxima" pela localização do aparelho.
// As coordenadas do GPS ficam no aparelho: só o código/nome da cidade escolhida é usado. Depende de gatos.js (escHtml).
let CID = null; // { ufs: [[sigla, nome]], c: [[id IBGE, nome, índice da UF, lat, lon]] }
async function carregarCidades() {
  if (!CID) { const r = await fetch("cidades.json?v=1"); if (!r.ok) throw new Error(r.status); CID = await r.json(); }
  return CID;
}
function preencherUf(sel, vazio) {
  sel.innerHTML = `<option value="">${vazio}</option>` + CID.ufs.map(([sigla, nome], i) => `<option value="${i}">${nome} (${sigla})</option>`).join("");
}
function preencherCidades(selUf, selCid, primeira = "Selecione a cidade") { // só cidades do estado escolhido
  const i = selUf.value;
  selCid.disabled = i === "";
  selCid.innerHTML = i === "" ? '<option value="">Selecione o estado</option>'
    : `<option value="">${primeira}</option>` + CID.c.filter(c => c[2] === +i).map(c => `<option value="${c[0]}">${escHtml(c[1])}</option>`).join("");
}
function maisProxima(lat, lon) { // haversine
  const R = 6371, rad = Math.PI / 180;
  let melhor = null, dmin = Infinity;
  for (const c of CID.c) {
    const a = Math.sin((c[3] - lat) * rad / 2) ** 2 + Math.cos(lat * rad) * Math.cos(c[3] * rad) * Math.sin((c[4] - lon) * rad / 2) ** 2;
    const d = 2 * R * Math.asin(Math.sqrt(a));
    if (d < dmin) { dmin = d; melhor = c; }
  }
  return { cidade: melhor, km: dmin };
}
const DIST_MAX_KM = 300; // mais longe que isso: provavelmente fora do Brasil
// Pede a localização ao navegador. Resolve { cidade: [id, nome, índiceUF, lat, lon], km } ou rejeita com { motivo }.
function pedirLocalizacao() {
  return carregarCidades().then(() => new Promise((ok, erro) => {
    if (!navigator.geolocation) return erro({ motivo: "Seu navegador não permite identificar a localização." });
    navigator.geolocation.getCurrentPosition(pos => {
      const r = maisProxima(pos.coords.latitude, pos.coords.longitude);
      r.km > DIST_MAX_KM ? erro({ motivo: "Não encontramos uma cidade brasileira perto de você." }) : ok(r);
    }, err => erro({ motivo: err.code === 1 ? "A permissão de localização foi negada." : "Não foi possível identificar a sua localização." }),
    { timeout: 10000, maximumAge: 600000 });
  }));
}
