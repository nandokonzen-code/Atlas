import { generateDiscoveryGuide } from "./src/discovery.js";

const form = document.querySelector("#discovery-form");
const result = document.querySelector("#discovery-result");
const demoButton = document.querySelector("#load-discovery-demo");

const demo = {
  prospect: "Empresa Horizonte",
  segment: "Indústria",
  region: "RS",
  accountType: "Corporate",
  meetingObjective: "entender como a empresa está tratando riscos associados à expansão",
  trigger: "anúncio público de expansão de capacidade",
  fact1: "A empresa anunciou expansão de capacidade.",
  source1: "Relatório público de demonstração",
  fact2: "A companhia informou crescimento de sua presença regional.",
  source2: "Comunicado público de demonstração",
  hypothesis1: "A expansão pode alterar exposições operacionais e requisitos de continuidade.",
  hypothesis2: "O crescimento regional pode aumentar interdependências logísticas.",
  hypothesis3: "A arquitetura atual de proteção pode precisar ser revalidada diante do novo perfil operacional.",
  desiredNextCommitment: "Agendar uma conversa técnica com os stakeholders relevantes para selecionar uma ou duas exposições prioritárias para aprofundamento.",
  sourcePolicyAccepted: true,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSimpleList(items) {
  if (!items?.length) return '<p class="empty-state">Nenhum item informado.</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderFacts(facts) {
  if (!facts?.length) return '<p class="empty-state">Nenhum fato confirmado informado.</p>';
  return `<ul>${facts.map((fact) => `<li><strong>${escapeHtml(fact.statement)}</strong><br><small>Fonte: ${escapeHtml(fact.source)}</small></li>`).join("")}</ul>`;
}

function renderSpinGroup(title, items) {
  return `<div class="guide-block"><h4>${escapeHtml(title)}</h4>${renderSimpleList(items)}</div>`;
}

function readForm() {
  const data = new FormData(form);
  const publicFacts = [1, 2]
    .map((number) => ({
      statement: data.get(`fact${number}`),
      source: data.get(`source${number}`),
    }))
    .filter((fact) => String(fact.statement || "").trim());

  const riskHypotheses = [1, 2, 3]
    .map((number) => data.get(`hypothesis${number}`))
    .filter((hypothesis) => String(hypothesis || "").trim());

  return {
    prospect: data.get("prospect"),
    segment: data.get("segment"),
    region: data.get("region"),
    accountType: data.get("accountType"),
    meetingObjective: data.get("meetingObjective"),
    trigger: data.get("trigger"),
    publicFacts,
    riskHypotheses,
    desiredNextCommitment: data.get("desiredNextCommitment"),
    sourcePolicyAccepted: data.get("sourcePolicyAccepted") === "on",
  };
}

function setForm(values) {
  Object.entries(values).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
  });
}

function renderGuide(guide) {
  result.hidden = false;

  if (guide.status !== "ready_for_human_review") {
    result.className = "discovery-result discovery-blocked";
    result.innerHTML = `
      <div class="guide-header">
        <div><p class="eyebrow">Discovery bloqueado</p><h3>${escapeHtml(guide.prospect)}</h3></div>
        <span class="status-pill">Revisão necessária</span>
      </div>
      <div class="warning-box">${renderSimpleList(guide.warnings)}</div>
    `;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  result.className = "discovery-result";
  result.innerHTML = `
    <div class="guide-header">
      <div>
        <p class="eyebrow">Roteiro pronto para revisão humana</p>
        <h3>${escapeHtml(guide.prospect)}</h3>
      </div>
      <span class="status-pill">Não enviar automaticamente</span>
    </div>

    ${guide.warnings.length ? `<div class="warning-box"><strong>Atenção</strong>${renderSimpleList(guide.warnings)}</div>` : ""}

    <div class="guide-section">
      <h3>1. Contexto confirmado</h3>
      ${renderFacts(guide.confirmedFacts)}
    </div>

    ${guide.unverifiedFacts.length ? `<div class="guide-section unverified-section">
      <h3>Observações sem fonte — não tratar como fato</h3>
      ${renderSimpleList(guide.unverifiedFacts.map((fact) => fact.statement))}
    </div>` : ""}

    <div class="guide-section">
      <h3>2. Hipóteses a validar</h3>
      ${renderSimpleList(guide.hypothesesToValidate)}
    </div>

    <div class="guide-section">
      <h3>3. Abertura sugerida</h3>
      <blockquote>${escapeHtml(guide.opening)}</blockquote>
    </div>

    <div class="guide-section">
      <h3>4. Agenda curta</h3>
      ${renderSimpleList(guide.agenda)}
    </div>

    <div class="guide-section">
      <h3>5. Perguntas SPIN</h3>
      <div class="guide-grid">
        ${renderSpinGroup("Situação", guide.spinQuestions.situation)}
        ${renderSpinGroup("Problema", guide.spinQuestions.problem)}
        ${renderSpinGroup("Implicação", guide.spinQuestions.implication)}
        ${renderSpinGroup("Necessidade / valor", guide.spinQuestions.needPayoff)}
      </div>
    </div>

    <div class="guide-section">
      <h3>6. Perguntas BBE</h3>
      ${renderSimpleList(guide.bbeQuestions)}
    </div>

    <div class="guide-section">
      <h3>7. Preparação para objeções</h3>
      <div class="objection-list">${guide.objectionPrep.map((item) => `
        <div class="objection-card">
          <strong>“${escapeHtml(item.objection)}”</strong>
          <p>${escapeHtml(item.responseQuestion)}</p>
        </div>`).join("")}</div>
    </div>

    <div class="next-commitment">
      <p class="eyebrow">8. Próximo compromisso</p>
      <p>${escapeHtml(guide.nextCommitment)}</p>
    </div>

    <p class="review-note"><strong>Regra:</strong> revisar fatos, fontes, hipóteses e linguagem antes de qualquer reunião, mensagem ou ação externa.</p>
  `;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderGuide(generateDiscoveryGuide(readForm()));
});

demoButton.addEventListener("click", () => {
  setForm(demo);
  renderGuide(generateDiscoveryGuide(readForm()));
});