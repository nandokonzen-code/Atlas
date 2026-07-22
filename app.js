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
    prospect: "Empresa Alfa — cenário fictício",
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
    prospect: "Empresa Beta — cenário fictício",
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
    prospect: "Empresa fictícia fora do território",
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
    prospect: "Empresa fictícia com relacionamento existente",
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

const demoLabels = {
  alfa: "Exemplo fictício — alta prioridade",
  beta: "Exemplo fictício — média prioridade",
  gama: "Exemplo — fora do território",
  delta: "Exemplo — relacionamento existente",
};

demoButtons.forEach((button) => {
  if (demoLabels[button.dataset.case]) button.textContent = demoLabels[button.dataset.case];
});

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
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
  });
  refreshRangeLabels();
}

function resetPrioritizer(prospect = "") {
  form.reset();
  setForm({
    prospect,
    territoryFit: false,
    newProspect: false,
    segmentFit: false,
    publicSources: Boolean(prospect),
    noDuplicate: false,
    strategicFit: 0,
    whyNow: 0,
    access: 0,
    readiness: 0,
    penalty: 0,
    confidence: prospect ? "baixa" : "media",
  });
  resultPanel.hidden = true;
  resultPanel.innerHTML = "";
}

function refreshRangeLabels() {
  form.querySelectorAll('input[type="range"]').forEach((field) => {
    const output = document.querySelector(`[data-output="${field.name}"]`);
    if (output) output.textContent = field.value;
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showActiveAccount(prospect) {
  if (!prospect) return;
  const workspace = document.querySelector(".workspace");
  if (!workspace || document.querySelector("#active-account-context")) return;
  const box = document.createElement("div");
  box.id = "active-account-context";
  box.style.cssText = "margin:0 0 18px;padding:14px 16px;border-radius:14px;background:#ddf4f3;color:#0b4f5c;font-weight:700";
  box.innerHTML = `Conta selecionada: <strong>${escapeHtml(prospect)}</strong>. Os exemplos fictícios não substituem esta conta.`;
  workspace.prepend(box);
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
  const current = new URLSearchParams(window.location.search);
  const next = new URLSearchParams({ prospect });
  const segment = current.get("segment");
  const region = current.get("region") || current.get("territory");
  const accountType = current.get("accountType");
  if (segment) next.set("segment", segment);
  if (region) next.set("region", region);
  if (accountType) next.set("accountType", accountType);
  return `index.html?${next.toString()}#discovery-builder`;
}

function renderResult(result) {
  const scored = result.eligible;
  resultPanel.className = `result-panel result-${scored ? result.band.toLowerCase() : "blocked"}`;
  resultPanel.hidden = false;
  resultPanel.innerHTML = `
    <div class="result-heading">
      <div><p class="eyebrow">Resultado para</p><h2>${escapeHtml(result.prospect)}</h2></div>
      <span class="status-pill">${escapeHtml(result.statusLabel)}</span>
    </div>
    <div class="score-grid">
      <div class="score-card"><span>Nota</span><strong>${scored ? result.score : "—"}</strong><small>de 100</small></div>
      <div class="score-card"><span>Faixa</span><strong>${result.band || "—"}</strong><small>prioridade</small></div>
      <div class="score-card"><span>Confiança</span><strong class="confidence">${escapeHtml(result.confidence)}</strong><small>das evidências</small></div>
    </div>
    ${scored ? `<div class="breakdown">${renderBreakdown(result)}</div>` : ""}
    <div class="next-action"><p class="eyebrow">Próxima ação recomendada</p><p>${escapeHtml(result.nextAction)}</p></div>
    <ul class="reasons">${result.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
    <p class="review-note">${result.automaticContactAllowed
      ? "Resultado pronto para revisão humana antes da ação externa."
      : "Contato automático bloqueado. É necessária revisão humana."}</p>
    ${scored
      ? `<div style="margin-top:16px"><a class="primary-button" style="display:inline-block;text-decoration:none" href="${discoveryLink(result.prospect)}">Próxima missão: preparar Discovery →</a></div>`
      : `<div style="margin-top:16px"><a class="secondary-link" style="display:inline-block;text-decoration:none" href="contas.html">Voltar para a Carteira →</a></div>`}
  `;
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
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
    </tr>`).join("");
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
const selectedProspect = params.get("prospect");

if (selectedProspect) {
  resetPrioritizer(selectedProspect);
  showActiveAccount(selectedProspect);
} else {
  resetPrioritizer("");
}
