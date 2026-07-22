const STORAGE_KEY = "prioriza_accounts_v1";
const fileInput = document.querySelector("#accounts-file");
const clearButton = document.querySelector("#clear-accounts");
const status = document.querySelector("#accounts-status");
const summary = document.querySelector("#accounts-summary");
const filters = document.querySelector("#accounts-filters");
const body = document.querySelector("#accounts-body");
const cards = document.querySelector("#accounts-cards");
const missionTitle = document.querySelector("#accounts-mission-title");
const missionCopy = document.querySelector("#accounts-mission-copy");

let accounts = loadAccounts();

function clean(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function detectDelimiter(text) {
  const firstLine = String(text).split(/\r?\n/, 1)[0] || "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ";" : ",";
}

function parseDelimited(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const input = String(text).replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(value);
      value = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => clean(cell))) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => clean(cell))) rows.push(row);
  return rows;
}

function findColumn(headers, candidates) {
  const normalized = headers.map((item) => clean(item).toLowerCase());
  return candidates.map((candidate) => normalized.indexOf(candidate.toLowerCase())).find((index) => index >= 0) ?? -1;
}

function normalizeAccounts(text) {
  const rows = parseDelimited(text);
  if (rows.length < 2) throw new Error("O CSV não possui dados suficientes.");
  const headers = rows[0];
  const companyIndex = findColumn(headers, ["Empresa", "Prospect", "Nome"]);
  if (companyIndex < 0) throw new Error("Coluna Empresa não encontrada.");

  const territoryIndex = findColumn(headers, ["Território PRIORIZA", "Território", "Região"]);
  const sectorIndex = findColumn(headers, ["Setor / Cluster", "Setor", "Segmento"]);
  const priorityIndex = findColumn(headers, ["Prioridade de monitoramento", "Prioridade", "Faixa"]);
  const revenueIndex = findColumn(headers, ["Receita/Faturamento (R$ bi)", "Faturamento", "Receita"]);
  const validationIndex = findColumn(headers, ["Status de validação", "Validação", "Status"]);

  return rows.slice(1).map((row) => ({
    company: clean(row[companyIndex]),
    territory: territoryIndex >= 0 ? clean(row[territoryIndex]) : "",
    sector: sectorIndex >= 0 ? clean(row[sectorIndex]) : "",
    priority: priorityIndex >= 0 ? clean(row[priorityIndex]) : "",
    revenue: revenueIndex >= 0 ? clean(row[revenueIndex]) : "",
    validation: validationIndex >= 0 ? clean(row[validationIndex]) : "",
  })).filter((item) => item.company);
}

function saveAccounts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function loadAccounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getFilters() {
  const data = new FormData(filters);
  return {
    query: clean(data.get("query")).toLowerCase(),
    territory: clean(data.get("territory")),
    priority: clean(data.get("priority")),
  };
}

function filteredAccounts() {
  const current = getFilters();
  return accounts.filter((account) => {
    const text = `${account.company} ${account.sector}`.toLowerCase();
    return (!current.query || text.includes(current.query))
      && (!current.territory || account.territory === current.territory)
      && (!current.priority || account.priority === current.priority);
  });
}

function prioritizeUrl(account) {
  return `index.html?radar=1&prospect=${encodeURIComponent(account.company)}#form-title`;
}

function discoveryUrl(account) {
  const params = new URLSearchParams({ prospect: account.company });
  if (account.sector) params.set("segment", account.sector);
  if (account.territory) params.set("region", account.territory);
  return `index.html?${params.toString()}#discovery-builder`;
}

function renderMission() {
  if (!accounts.length) {
    missionTitle.textContent = "Carregar a carteira";
    missionCopy.textContent = "Importe sua base CSV. Depois escolha uma conta Prioridade A para levar à priorização.";
    return;
  }

  const priorityA = accounts.filter((item) => item.priority === "A").length;
  missionTitle.textContent = priorityA ? "Escolher uma conta Prioridade A" : "Escolher a próxima conta";
  missionCopy.textContent = priorityA
    ? `Você tem ${priorityA} conta(s) de prioridade A. Filtre por A, escolha uma empresa e avance para a decisão.`
    : `Sua carteira tem ${accounts.length} conta(s). Escolha uma empresa e avance para a priorização.`;
}

function renderSummary() {
  const total = accounts.length;
  const a = accounts.filter((item) => item.priority === "A").length;
  const rs = accounts.filter((item) => item.territory === "RS").length;
  const sc = accounts.filter((item) => item.territory.includes("SC")).length;
  summary.innerHTML = `
    <div class="metric"><span>Total de contas</span><strong>${total}</strong></div>
    <div class="metric"><span>Prioridade A</span><strong>${a}</strong></div>
    <div class="metric"><span>RS</span><strong>${rs}</strong></div>
    <div class="metric"><span>SC</span><strong>${sc}</strong></div>
  `;
}

function renderCards() {
  if (!cards) return;
  const list = filteredAccounts();
  if (!list.length) {
    cards.innerHTML = `<div class="account-card empty">${accounts.length ? "Nenhuma conta encontrada para os filtros atuais." : "Importe sua base CSV para começar."}</div>`;
    return;
  }

  cards.innerHTML = list.map((account) => {
    const revenue = account.revenue ? `R$ ${escapeHtml(account.revenue)} bi` : "Pendente";
    return `<article class="account-card">
      <div class="account-card-top">
        <div><h3>${escapeHtml(account.company)}</h3></div>
        <span class="account-pill">${escapeHtml(account.priority || "Sem prioridade")}</span>
      </div>
      <div class="account-meta">
        <div><span>Território</span><strong>${escapeHtml(account.territory || "—")}</strong></div>
        <div><span>Setor</span><strong>${escapeHtml(account.sector || "—")}</strong></div>
        <div><span>Receita/Faturamento</span><strong>${revenue}</strong></div>
        <div><span>Validação</span><strong>${escapeHtml(account.validation || "Pendente")}</strong></div>
      </div>
      <div class="account-next">
        <a class="primary-button" href="${prioritizeUrl(account)}">Priorizar agora →</a>
        <a class="secondary-action" href="${discoveryUrl(account)}">Preparar Discovery</a>
      </div>
    </article>`;
  }).join("");
}

function renderTable() {
  const list = filteredAccounts();
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="7" class="empty">${accounts.length ? "Nenhuma conta encontrada para os filtros atuais." : "Importe sua base CSV para começar."}</td></tr>`;
    return;
  }

  body.innerHTML = list.map((account) => {
    const revenue = account.revenue ? `R$ ${escapeHtml(account.revenue)} bi` : "—";
    return `<tr>
      <td><strong>${escapeHtml(account.company)}</strong></td>
      <td>${escapeHtml(account.territory || "—")}</td>
      <td>${escapeHtml(account.sector || "—")}</td>
      <td>${escapeHtml(account.priority || "—")}</td>
      <td>${revenue}</td>
      <td>${escapeHtml(account.validation || "—")}</td>
      <td><a class="account-action" href="${prioritizeUrl(account)}">Priorizar →</a></td>
    </tr>`;
  }).join("");
}

function render() {
  renderMission();
  renderSummary();
  renderCards();
  renderTable();
  status.textContent = accounts.length
    ? `${accounts.length} conta(s) disponíveis neste navegador.`
    : "Nenhuma base importada neste navegador.";
}

fileInput.addEventListener("change", async () => {
  const [file] = fileInput.files;
  if (!file) return;
  status.textContent = "Importando carteira…";
  try {
    const parsed = normalizeAccounts(await file.text());
    if (parsed.length > 1000) throw new Error("Limite local de 1.000 contas por arquivo.");
    accounts = parsed;
    saveAccounts();
    filters.reset();
    render();
    status.textContent = `${accounts.length} conta(s) importadas. Sua próxima missão é escolher uma conta e priorizar.`;
  } catch (error) {
    status.textContent = `Não foi possível importar: ${error.message}`;
  } finally {
    fileInput.value = "";
  }
});

clearButton.addEventListener("click", () => {
  accounts = [];
  localStorage.removeItem(STORAGE_KEY);
  filters.reset();
  render();
});

filters.addEventListener("input", () => {
  renderCards();
  renderTable();
});
filters.addEventListener("change", () => {
  renderCards();
  renderTable();
});

render();