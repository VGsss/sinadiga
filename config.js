// Endereços e chaves PÚBLICAS usadas pelo navegador (nenhum segredo aqui).
// Em localhost o site fala com o Worker local (wrangler dev) e usa a chave de teste do Turnstile, que sempre aprova.
const SINADIGA = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? { api: "http://127.0.0.1:8787", turnstile: "1x00000000000000000000AA" }
  : { api: "https://sinadiga-api.sinadiga.workers.dev", turnstile: "0x4AAAAAAGJuVGzc4Z8ktSWw" };
