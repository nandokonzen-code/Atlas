import { prioritizeProspect, SCORE_LIMITS } from "./src/prioritizer.js";
import { parseProspectCsv, rankProspects } from "./src/csv.js";

const form = document.querySelector("#prioritizer-form");
const resultPanel = document.querySelector("#result-panel");
const demoButtons = document.querySelectorAll("[data-case]");
const csvInput = document.querySelector("#csv-file");
const rankingWrap = document.querySelector("#ranking-wrap");
const rankingBody = document.querySelector("#ranking-body");
const bulkStatus = document.querySelector("#bulk-status");

const cases = {
  alfa: {
    prospect: "Grupo Herval — simulação pública",
    territoryFit: true,
    newProspect: true,
    segmentFit: true,
    publicSources: true,
    noDuplicate: true,
    strategicFit: 28,
    whyNow: 25,
    access: 16,
    readiness: 15,
    penalty: 0,
    confidence: "alta",
  },
  beta: {
    prospect: "3tentos — simulação pública",
    territoryFit: true,
    newProspect: true,
    segmentFit: true,
    publicSources: true,
    noDuplicate: true,
    strategicFit: 22,
    whyNow: 19,
    access: 12,
    readiness: 12,
    penalty: 0,
    confidence: "media",
  },
  gama: {
    prospect: "Caso fora do território — simulação",
    territoryFit: false,
    newProspect: true,
    segmentFit: true,
    publicSources: true,
    noDuplicate: true,
    strategicFit: 25,
    whyNow: 24,
    access: 15,
    readiness: 14,
    penalty: 0,
    confidence: "alta",
  },
  delta: {
    prospect: "Caso relacionamento existente — simulação",
    territoryFit: true,
    newProspect: false,
    segmentFit: true,
    publicSources: true,
    noDuplicate: true,
    strategicFit: 26,
    whyNow: 22,
    access: 17,
    readiness: 13,
    penalty: 0,
    confidence: "alta",
  },
};

function readForm() {
  const data = new FormData(form);
  return {
    prospect: data.get("prospect"),
    territoryFit: data.get("territoryFit") === "on",
    newProspect: data.get("newProspect") === "on",
    segmentFit: data.get("segmentFit") === "on",
    publicSources: data.get("publicSources") === "on",
    noDuplicate: data.get("noDuplicate") === "on",
    strategicFit: data.get("strategicFit"),
    whyNow: data.get("whyNow"),
    access: data.get("access"),
    readiness: data.get("readiness"),
    penalty: data.get("penalty"),
    confidence: data.get("confidence"),
  };
}

function setForm(values) {
  Object.entries(values).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field) return;
    if (field.type === "checkbox") field.checked = value;
    else field.value = value;
  });
  refreshRangeLabels();
}

function refreshRangeLabels() {
  form.querySelectorAll('input[type="range"]').forEach((field) => {
    const output = document.querySelector(`[data-output="${field.name}"]`);
    if (output) output.textContent = field.value;
  });
}

function renderBreakdown(result) {
  if (!result.breakdown) return "";
  const labels = {
    strategicFit: "Aderência estratégica",
    whyNow: "Motivo para agir agora",
    access: "Acesso",
    readiness: "Prontidão comercial",
  };

  return Object.entries(SCORE_LIMITS).map(([key, max]) => {
    const value = result.breakdown[key];
    const width = Math.round((value / max) * 100);
    return `<div class="breakdown-row">
      <div class="breakdown-label"><span>${labels[key]}</span><strong>${value}/${max}</strong></div>
      <div class="meter" aria-label="${labels[key]}: ${value} de ${max}"><span style="width:${width}%"></span></div>
    </div>`;
  }).join("");
}

function discoveryLink(prospect) {
  return `index.html?prospect=${encodeURIComponent(prospect)}#discovery-builder`;
}

function renderResult(result) {
  const scored = result.eligible;
  resultPanel.className = `result-panel result-${scored ? result.band.toLowerCase() : "blocked"}`;
  resultPanel.hidden = false;
  resultPanel.innerHTML = `
    <div class="result-heading">
      <div>
        <p class="eyebrow">Resultado para</p>
        <h2>${escapeHtml(result.prospect)}</h2>
      </div>
      <span class="status-pill">${escapeHtml(result.statusLabel)}</span>
    </div>
    <div class="score-grid">
      <div class="score-card">
        <span>Nota</span>
        <strong>${scored ? result.score : "—"}</strong>
        <small>de 100</small>
      </div>
      <div class="score-card">
        <span>Faixa</span>
        <strong>${result.band || "—"}</strong>
        <small>prioridade</small>
      </div>
      <div class="score-card">
        <span>Confiança</span>
        <strong class="confidence">${escapeHtml(result.confidence)}</strong>
        <small>das evidências</small>
      </div>
    </div>
    ${scored ? `<div class="breakdown">${renderBreakdown(result)}</div>` : ""}
    <div class="next-action">
      <p class="eyebrow">Próxima ação recomendada</p>
      <p>${escapeHtml(result.nextAction)}</p>
    </div>
    <ul class="reasons">${result.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
    <p class="review-note">${result.automaticContactAllowed
      ? "Resultado pronto para revisão humana antes da ação externa."
      : "Contato automático bloqueado. É necessária revisão humana."}</p>
    ${scored ? `<div style="margin-top:16px"><a class="primary-button" style="display:inline-block;text-decoration:none" href="${discoveryLink(result.prospect)}">Próxima missão: preparar Discovery →</a></div>` : `<div style="margin-top:16px"><a class="secondary-link" style="display:inline-block;text-decoration:none" href="contas.html">Voltar para a Carteira →</a></div>`}
  `;
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRanking(ranking) {
  rankingBody.innerHTML = ranking.map((result, index) => `
    <tr>
      <td><strong>${index + 1}</strong></td>
      <td>${escapeHtml(result.prospect)}</td>
      <td><span class="table-status">${escapeHtml(result.statusLabel)}</span></td>
      <td>${result.score ?? "—"}</td>
      <td>${result.band ?? "—"}</td>
      <td class="capitalize">${escapeHtml(result.confidence)}</td>
      <td>${escapeHtml(result.nextAction)}</td>
    </tr>
  `).join("");
  rankingWrap.hidden = false;
}

csvInput.addEventListener("change", async () => {
  const [file] = csvInput.files;
  if (!file) return;
  rankingWrap.hidden = true;
  bulkStatus.textContent = "Lendo o arquivo…";

  try {
    const prospects = parseProspectCsv(await file.text());
    if (prospects.length > 500) throw new Error("O MVP aceita até 500 prospects por arquivo.");
    const ranking = rankProspects(prospects);
    renderRanking(ranking);
    const eligibleCount = ranking.filter((item) => item.eligible).length;
    bulkStatus.textContent = `${ranking.length} prospects analisados; ${eligibleCount} elegíveis para pontuação.`;
  } catch (error) {
    bulkStatus.textContent = `Não foi possível analisar: ${error.message}`;
  }
});

form.addEventListener("input", refreshRangeLabels);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderResult(prioritizeProspect(readForm()));
});

demoButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setForm(cases[button.dataset.case]);
    renderResult(prioritizeProspect(readForm()));
  });
});

const params = new URLSearchParams(window.location.search);
const radarProspect = params.get("prospect");

if (radarProspect && params.get("radar") === "1") {
  setForm({
    prospect: radarProspect,
    territoryFit: true,
    newProspect: false,
    segmentFit: false,
    publicSources: true,
    noDuplicate: false,
    strategicFit: 0,
    whyNow: 0,
    access: 0,
    readiness: 0,
    penalty: 0,
    confidence: "baixa",
  });
  resultPanel.hidden = true;
} else {
  setForm(cases.alfa);
  renderResult(prioritizeProspect(readForm()));
}