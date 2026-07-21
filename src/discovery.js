const MAX_HYPOTHESES = 3;

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  const text = clean(value);
  return text ? [text] : [];
}

function normalizeFacts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((fact) => {
      if (typeof fact === "string") return { statement: clean(fact), source: "" };
      return {
        statement: clean(fact?.statement),
        source: clean(fact?.source),
      };
    })
    .filter((fact) => fact.statement);
}

function buildOpening({ prospect, meetingObjective, trigger }) {
  const objective = meetingObjective || "entender o contexto, as prioridades e os critérios de decisão sobre o tema";
  const triggerSentence = trigger
    ? ` Também vimos um sinal público que pode ser relevante — ${trigger} — e queremos validar se ele realmente muda alguma prioridade para vocês.`
    : "";

  return `Obrigado pelo tempo. Nosso objetivo hoje é ${objective}. Trouxemos observações públicas apenas como ponto de partida; queremos validar o que faz sentido e descartar o que não fizer.${triggerSentence}`;
}

export function generateDiscoveryGuide(input = {}) {
  const prospect = clean(input.prospect) || "Prospect não informado";
  const segment = clean(input.segment);
  const region = clean(input.region);
  const accountType = clean(input.accountType);
  const meetingObjective = clean(input.meetingObjective);
  const trigger = clean(input.trigger);
  const desiredNextCommitment = clean(input.desiredNextCommitment);
  const hypotheses = normalizeList(input.riskHypotheses).slice(0, MAX_HYPOTHESES);
  const facts = normalizeFacts(input.publicFacts);
  const confirmedFacts = facts.filter((fact) => fact.source);
  const unverifiedFacts = facts.filter((fact) => !fact.source);
  const warnings = [];

  if (input.sourcePolicyAccepted !== true) {
    return {
      status: "blocked_source_policy_not_confirmed",
      prospect,
      reviewRequired: true,
      automaticExternalActionAllowed: false,
      warnings: ["Confirme que a entrada contém somente dados públicos, sintéticos ou anonimizados."],
    };
  }

  if (!hypotheses.length) {
    return {
      status: "blocked_missing_hypothesis",
      prospect,
      reviewRequired: true,
      automaticExternalActionAllowed: false,
      confirmedFacts,
      unverifiedFacts,
      warnings: ["Inclua ao menos uma hipótese de risco a ser validada na reunião."],
    };
  }

  if (unverifiedFacts.length) {
    warnings.push(`${unverifiedFacts.length} observação(ões) sem fonte foram separadas dos fatos confirmados e não devem ser apresentadas como fato.`);
  }
  if (!confirmedFacts.length) {
    warnings.push("Nenhum fato público com fonte foi informado; conduza a reunião sem afirmar contexto específico do prospect.");
  }

  const situationQuestions = [
    `Como ${prospect} organiza hoje a gestão desse tema e quem costuma participar das decisões?`,
    trigger
      ? `O que mudou desde o evento ou sinal "${trigger}" e quais efeitos isso trouxe para as prioridades atuais?`
      : "Que mudanças recentes mais influenciaram as prioridades e exposições desse tema?",
  ];

  const problemQuestions = hypotheses.map(
    (hypothesis) => `Em relação à hipótese "${hypothesis}", onde vocês percebem maior incerteza, dificuldade ou exposição hoje?`,
  );

  const implicationQuestions = [
    "Se alguma dessas hipóteses se confirmar, quais impactos operacionais, financeiros, reputacionais ou de continuidade seriam mais relevantes?",
    "Quem mais seria afetado por esse impacto e em que momento a organização precisaria agir?",
  ];

  const needPayoffQuestions = [
    "Que resultado faria uma revisão desse tema valer a pena para vocês?",
    "Quais critérios vocês usariam para considerar uma solução ou mudança realmente adequada?",
  ];

  return {
    status: "ready_for_human_review",
    prospect,
    context: {
      segment: segment || null,
      region: region || null,
      accountType: accountType || null,
      meetingObjective: meetingObjective || null,
      trigger: trigger || null,
    },
    reviewRequired: true,
    automaticExternalActionAllowed: false,
    confirmedFacts,
    unverifiedFacts,
    hypothesesToValidate: hypotheses,
    opening: buildOpening({ prospect, meetingObjective, trigger }),
    agenda: [
      "Validar o contexto e as prioridades atuais.",
      "Testar as hipóteses sem tratá-las como fatos.",
      "Dimensionar impactos e critérios de decisão.",
      "Definir um próximo compromisso objetivo.",
    ],
    spinQuestions: {
      situation: situationQuestions,
      problem: problemQuestions,
      implication: implicationQuestions,
      needPayoff: needPayoffQuestions,
    },
    bbeQuestions: [
      "Qual é a principal premissa que sustenta a forma atual de tratar esse tema?",
      "O que teria que continuar verdadeiro para a abordagem atual permanecer adequada nos próximos 12 a 24 meses?",
      "Que evidência ou mudança de contexto faria vocês reconsiderarem essa abordagem?",
    ],
    objectionPrep: [
      {
        objection: "Já estamos bem atendidos.",
        responseQuestion: "Perfeito. Quais critérios vocês usam para confirmar que a estrutura atual continua aderente às mudanças recentes?",
      },
      {
        objection: "Não é prioridade agora.",
        responseQuestion: "Entendido. O que precisaria mudar para esse tema subir de prioridade?",
      },
      {
        objection: "Envie uma proposta.",
        responseQuestion: "Posso estruturar um próximo passo, mas antes vale alinhar quais problemas e critérios a proposta precisaria resolver. Quais seriam os dois ou três mais importantes?",
      },
    ],
    nextCommitment: desiredNextCommitment || "Agendar uma segunda conversa com os stakeholders relevantes e validar os dados necessários para aprofundar o diagnóstico.",
    warnings,
  };
}