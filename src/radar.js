const SUPPORTED_REGIONS = new Set(["RS", "Oeste SC", "Litoral Sul SC"]);
const ACCOUNT_TYPES = new Set(["RM", "Corporate", "Não definido"]);

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeDate(value) {
  const raw = clean(value);
  if (!raw) return "";
  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "" : raw;
}

export function createRadarSignal(input = {}) {
  const signal = {
    company: clean(input.company),
    region: clean(input.region),
    accountType: clean(input.accountType) || "Não definido",
    trigger: clean(input.trigger),
    source: clean(input.source),
    observedAt: normalizeDate(input.observedAt),
    hypothesis: clean(input.hypothesis),
    sourcePolicyAccepted: Boolean(input.sourcePolicyAccepted),
  };

  const warnings = [];
  if (!signal.company) warnings.push("Informe a empresa ou identificador público.");
  if (!SUPPORTED_REGIONS.has(signal.region)) warnings.push("Selecione uma região válida do território do PRIORIZA.");
  if (!ACCOUNT_TYPES.has(signal.accountType)) warnings.push("Selecione um tipo de conta válido.");
  if (!signal.trigger) warnings.push("Registre o gatilho público observado.");
  if (!signal.source) warnings.push("Registre a fonte pública do sinal.");
  if (!signal.observedAt) warnings.push("Informe uma data válida para o sinal.");
  if (!signal.hypothesis) warnings.push("Registre ao menos uma hipótese comercial a validar.");
  if (!signal.sourcePolicyAccepted) warnings.push("Confirme a política de uso de dados públicos, sintéticos ou anonimizados.");

  return {
    ...signal,
    status: warnings.length ? "needs_review" : "ready_for_review",
    warnings,
  };
}

export function preparePrioritizerSeed(signal) {
  if (!signal || signal.status !== "ready_for_review") {
    throw new Error("O sinal precisa estar pronto para revisão antes de seguir para priorização.");
  }

  return {
    prospect: signal.company,
    state: signal.region === "RS" ? "RS" : "SC",
    territoryFit: true,
    publicSources: true,
    pendingGates: ["newProspect", "segmentFit", "noDuplicate"],
  };
}

export function sortRadarSignals(signals = []) {
  return [...signals].sort((a, b) => {
    const dateOrder = String(b.observedAt || "").localeCompare(String(a.observedAt || ""));
    if (dateOrder !== 0) return dateOrder;
    return String(a.company || "").localeCompare(String(b.company || ""), "pt-BR");
  });
}

export function filterRadarSignals(signals = [], filters = {}) {
  const query = clean(filters.query).toLocaleLowerCase("pt-BR");
  const region = clean(filters.region);
  const accountType = clean(filters.accountType);

  return signals.filter((signal) => {
    const matchesQuery = !query || [signal.company, signal.trigger, signal.hypothesis]
      .some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(query));
    const matchesRegion = !region || signal.region === region;
    const matchesAccountType = !accountType || signal.accountType === accountType;
    return matchesQuery && matchesRegion && matchesAccountType;
  });
}

export function summarizeRadar(signals = []) {
  const ready = signals.filter((signal) => signal.status === "ready_for_review");
  return {
    total: signals.length,
    readyForReview: ready.length,
    rm: ready.filter((signal) => signal.accountType === "RM").length,
    corporate: ready.filter((signal) => signal.accountType === "Corporate").length,
    unclassified: ready.filter((signal) => signal.accountType === "Não definido").length,
  };
}