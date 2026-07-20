export const SCORE_LIMITS = Object.freeze({
  strategicFit: 30,
  whyNow: 30,
  access: 20,
  readiness: 20,
});

const BAND_RULES = Object.freeze([
  { min: 75, band: "A", action: "Agir em até 5 dias úteis." },
  { min: 60, band: "B", action: "Completar evidências e abordagem em até 15 dias." },
  { min: 40, band: "C", action: "Monitorar mensalmente." },
  { min: 0, band: "D", action: "Revisar trimestralmente, sem cadência ativa." },
]);

const GATES = Object.freeze([
  {
    key: "publicSources",
    status: "blocked_sensitive_source",
    label: "Fonte não permitida",
    action: "Descartar o dado sensível e refazer a análise somente com fontes públicas, sintéticas ou anonimizadas.",
  },
  {
    key: "territoryFit",
    status: "excluded_out_of_territory",
    label: "Fora do território",
    action: "Excluir da fila ativa ou encaminhar à equipe responsável pelo território.",
  },
  {
    key: "newProspect",
    status: "reroute_existing_relationship",
    label: "Relacionamento existente",
    action: "Redirecionar para a trilha de expansão do relacionamento existente.",
  },
  {
    key: "segmentFit",
    status: "excluded_out_of_scope",
    label: "Fora do escopo",
    action: "Revisar somente se o segmento ou porte entrar no escopo configurado.",
  },
  {
    key: "noDuplicate",
    status: "paused_duplicate",
    label: "Iniciativa duplicada",
    action: "Pausar e alinhar com o responsável pela iniciativa já existente.",
  },
]);

function clamp(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeConfidence(value) {
  const confidence = String(value || "baixa").toLowerCase();
  return ["alta", "media", "baixa"].includes(confidence) ? confidence : "baixa";
}

function getBand(score) {
  return BAND_RULES.find((rule) => score >= rule.min);
}

export function prioritizeProspect(input = {}) {
  const prospect = String(input.prospect || "Prospect sem nome").trim() || "Prospect sem nome";
  const confidence = normalizeConfidence(input.confidence);
  const failedGate = GATES.find((gate) => input[gate.key] !== true);

  if (failedGate) {
    return {
      prospect,
      eligible: false,
      status: failedGate.status,
      statusLabel: failedGate.label,
      score: null,
      band: null,
      confidence,
      nextAction: failedGate.action,
      automaticContactAllowed: false,
      breakdown: null,
      reasons: [`Portão de elegibilidade não atendido: ${failedGate.label}.`],
    };
  }

  const breakdown = Object.fromEntries(
    Object.entries(SCORE_LIMITS).map(([key, max]) => [key, clamp(input[key], 0, max)]),
  );
  const subtotal = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const penalty = clamp(input.penalty, 0, 100);
  const score = clamp(subtotal - penalty, 0, 100);
  const bandRule = getBand(score);
  const lowConfidence = confidence === "baixa";
  const nextAction = lowConfidence && bandRule.band === "A"
    ? "Validar as evidências antes de qualquer contato. Depois, revisar a faixa e a abordagem."
    : bandRule.action;

  const reasons = [
    `Aderência estratégica: ${breakdown.strategicFit}/30.`,
    `Motivo para agir agora: ${breakdown.whyNow}/30.`,
    `Acesso: ${breakdown.access}/20.`,
    `Prontidão comercial: ${breakdown.readiness}/20.`,
  ];
  if (penalty > 0) reasons.push(`Penalidades aplicadas: -${penalty} pontos.`);
  if (lowConfidence) reasons.push("Confiança baixa: contato automático bloqueado até revisão humana.");

  return {
    prospect,
    eligible: true,
    status: "scored",
    statusLabel: "Elegível",
    score,
    band: bandRule.band,
    confidence,
    nextAction,
    automaticContactAllowed: !lowConfidence,
    breakdown: { ...breakdown, penalty, subtotal },
    reasons,
  };
}
