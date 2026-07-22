const STORAGE_KEY = "prioriza_accounts_v1";
const fileInput = document.querySelector("#accounts-file");
const clearButton = document.querySelector("#clear-accounts");
const status = document.querySelector("#accounts-status");
const summary = document.querySelector("#accounts-summary");
const filters = document.querySelector("#accounts-filters");
const body = document.querySelector("#accounts-body");

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

function renderTable() {
  const list = filteredAccounts();
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="7" class="empty">${accounts.length ? "Nenhuma conta encontrada para os filtros atuais." : "Importe sua base CSV para começar."}</td></tr>`;
    return;
  }

  body.innerHTML = list.map((account) => {
    const revenue = account.revenue ? `R$ ${escapeHtml(account.revenue)} bi` : "—";
    const url = `index.html?radar=1&prospect=${encodeURIComponent(account.company)}#form-title`;
    return `<tr>
      <td><strong>${escapeHtml(account.company)}</strong></td>
      <td>${escapeHtml(account.territory || "—")}</td>
      <td>${escapeHtml(account.sector || "—")}</td>
      <td>${escapeHtml(account.priority || "—")}</td>
      <td>${revenue}</td>
      <td>${escapeHtml(account.validation || "—")}</td>
      <td><a class="account-action" href="${url}">Priorizar →</a></td>
    </tr>`;
  }).join("");
}

function render() {
  renderSummary();
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
    status.textContent = `${accounts.length} conta(s) importadas e salvas localmente neste navegador.`;
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

filters.addEventListener("input", renderTable);
filters.addEventListener("change", renderTable);

render();