// Rodapé com uma frase sorteada a cada visita (nunca repete a da visita anterior neste navegador).
const FRASES_RODAPE = [
  // a frase original
  "Você foi identificado, um gato irá te contactar brevemente.",
  // próximas da original
  "Você foi identificado. Um gato entrará em contato em breve.",
  "Sua presença foi registrada. Um felino responsável entrará em contato.",
  "Você foi localizado. Um gato irá procurá-lo brevemente.",
  "Identificação concluída. Aguarde o contato de um gato.",
  // burocráticas
  "Este acesso foi registrado pelo SINADIGA. Um gato retornará o contato em até 90 dias úteis.",
  "Seu acesso foi arquivado sob protocolo felino. Aguarde o contato.",
  "Dados do visitante enviados à Divisão de Antecedentes Felinos. Um gato entrará em contato.",
  // ameaçadoras
  "Você foi identificado. Não saia daí: um gato já está a caminho.",
  "Sabemos que você esteve aqui. Um gato fará contato.",
  "Você foi avistado. Um gato irá observá-lo de longe e, então, procurá-lo.",
  // adoção
  "Você foi identificado como possível adotante. Um gato irá escolhê-lo em breve.",
  "Quem adota um gato é adotado por ele. Aguarde contato.",
  // novas
  "Identificamos você pelo cheiro. Um gato entrará em contato em breve.",
  "Sua visita foi anotada em uma caixa de papelão. Um gato retornará o contato.",
  "Você foi identificado por três bigodes independentes. Aguarde o contato.",
  "Seu perfil foi enviado à Central de Miados. Um gato entrará em contato.",
  "Você foi reconhecido por um gato de plantão. O retorno será feito entre uma soneca e outra.",
  "Seus dados foram analisados e aprovados por um gato. Ele entrará em contato quando acordar.",
  "Atenção: você foi cadastrado no Sistema Nacional de Distribuição de Gatos. Aguarde o contato.",
  "Um gato foi designado para o seu caso. O prazo de resposta depende da hora da ração.",
  "Você está sendo observado, com carinho, por um gato. Ele entrará em contato.",
  "Seu acesso foi vistoriado pela Polícia Felina. Um gato fará contato.",
  "Um gato foi acionado para localizá-lo. Ele já está olhando pela janela.",
  "Identificamos um humano no local. Um gato entrará em contato para cobrar a ração.",
  "Você foi incluído na lista de procurados por um lar. Um gato irá procurá-lo.",
  "Seu rastro foi seguido até aqui. Um gato entrará em contato com você.",
  "Você foi identificado e já pode ser adotado. Um gato avisará quando for a hora.",
];

(function () {
  const el = document.getElementById("rodape");
  if (!el) return;
  let i = Math.floor(Math.random() * FRASES_RODAPE.length);
  try { // evita repetir a frase da visita anterior
    const ultima = Number(localStorage.getItem("sinadiga.rodape"));
    if (FRASES_RODAPE.length > 1 && i === ultima) i = (i + 1 + Math.floor(Math.random() * (FRASES_RODAPE.length - 1))) % FRASES_RODAPE.length;
    localStorage.setItem("sinadiga.rodape", String(i));
  } catch (e) { /* sem armazenamento: segue só com o sorteio */ }
  el.textContent = FRASES_RODAPE[i];
})();
