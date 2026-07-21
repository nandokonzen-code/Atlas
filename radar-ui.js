import {
  createRadarSignal,
  filterRadarSignals,
  preparePrioritizerSeed,
  sortRadarSignals,
  summarizeRadar,
} from "./src/radar.js";

const form = document.querySelector("#radar-form");
const filtersForm = document.querySelector("#radar-filters");
const tableBody = document.querySelector("#radar-body");
const summary = document.querySelector("#radar-summary");
const status = document.querySelector("#radar-status");
const demoButton = document.querySelector("#load-radar-demo");

let signals = [];

const demoSignals = [
  {
    company: "Grupo Herval — cenário sintético",
    region: "RS",
    accountType: "RM",
    trigger: "Cenário sintético de expansão operacional para demonstração do fluxo",
    source: "Dado sintético de demonstração — não representa fato sobre a empresa",
    observedAt: "2026-07-21",
    hypothesis: "Em um cenário de expansão, novas exposições operacionais e requisitos de continuidade poderiam precisar de validação.",
    sourcePolicyAccepted: true,
  },
  {
    company: "3tentos — cenário sintético",
    region: "RS",
    accountType: "Corporate",
    trigger: "Cenário sintético de novo investimento para demonstração do fluxo",
    source: "Dado sintético de demonstração — não representa fato sobre a empresa",
    observedAt: "2026-07-18",
    hypothesis: "Um novo investimento poderia criar necessidades de revisão de riscos e prioridades de proteção.",
    sourcePolicyAccepted: true,
  },
  {
    company: "Caso Litoral Sul SC — sintético",
    region: "Litoral Sul SC",
    accountType: "Não definido",
    trigger: "Cenário sintético de mudança de liderança",
    source: "Dado sintético de demonstração",
    observedAt: "2026-07-15",
    hypothesis: "Uma mudança de liderança poderia abrir uma janela para revisar prioridades e agenda de riscos.",
    sourcePolicyAccepted: true,
  },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readSignalForm() {
  const data = new FormData(form);
  return {
    company: data.get("company"),
    region: data.get("region"),
    accountType: data.get("accountType"),
    trigger: data.get("trigger"),
    source: data.get("source"),
    observedAt: data.get("observedAt"),
    hypothesis: data.get("hypothesis"),
    sourcePolicyAccepted: data.get("sourcePolicyAccepted") === "on",
  };
}

function readFilters() {
  const data = new FormData(filtersForm);
  return {
    query: data.get("query"),
    region: data.get("region"),
    accountType: data.get("accountType"),
  };
}

function renderSummary() {
  const data = summarizeRadar(signals);
  summary.innerHTML = `
    <div class="radar-kpi"><span>Sinais</span><strong>${data.total}</strong></div>
    <div class="radar-kpi"><span>Prontos p/ revisão</span><strong>${data.readyForReview}</strong></div>
    <div class="radar-kpi"><span>RM</span><strong>${data.rm}</strong></div>
    <div class="radar-kpi"><span>Corporate</span><strong>${data.corporate}</strong></div>
    <div class="radar-kpi"><span>Não classificados</span><strong>${data.unclassified}</strong></div>
  `;
}

function prioritizerUrl(signal) {
  const seed = preparePrioritizerSeed(signal);
  const params = new URLSearchParams({ prospect: seed.prospect, state: seed.state, radar: "1" });
  return `index.html?${params.toString()}#prioritizer-form`;
}

function renderTable() {
  const filtered = filterRadarSignals(sortRadarSignals(signals), readFilters());
  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhum sinal encontrado para os filtros atuais.</td></tr>';
    return;
  }

  tableBody.innerHTML = filtered.map((signal) => {
    const sourceUrl = /^https?:\/\//i.test(signal.source) ? signal.source : "";
    const sourceCell = sourceUrl
      ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir fonte</a>`
      : escapeHtml(signal.source);

    return `
      <tr>
        <td><strong>${escapeHtml(signal.company)}</strong></td>
        <td>${escapeHtml(signal.region)}</td>
        <td>${escapeHtml(signal.accountType)}</td>
        <td>${escapeHtml(signal.trigger)}</td>
        <td>${escapeHtml(signal.observedAt)}</td>
        <td>${sourceCell}</td>
        <td>${escapeHtml(signal.hypothesis)}</td>
        <td>${signal.status === "ready_for_review"
          ? `<a class="table-link" href="${prioritizerUrl(signal)}">Levar à priorização</a>`
          : '<span class="table-status">Revisão necessária</span>'}</td>
      </tr>`;
  }).join("");
}

function render() {
  renderSummary();
  renderTable();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const signal = createRadarSignal(readSignalForm());
  if (signal.status !== "ready_for_review") {
    status.textContent = signal.warnings.join(" ");
    return;
  }
  signals.push(signal);
  status.textContent = "Sinal registrado. Revise o contexto antes de seguir para priorização.";
  form.reset();
  render();
});

filtersForm.addEventListener("input", renderTable);
filtersForm.addEventListener("change", renderTable);

demoButton.addEventListener("click", () => {
  signals = demoSignals.map((item) => createRadarSignal(item));
  status.textContent = "Cenário de demonstração carregado. As informações comerciais são sintéticas.";
  render();
});

render();