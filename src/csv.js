import { prioritizeProspect } from "./prioritizer.js";

function parseRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function asBoolean(value, defaultValue = false) {
  if (value === undefined || value === "") return defaultValue;
  return ["true", "1", "sim", "yes"].includes(String(value).toLowerCase());
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseProspectCsv(text) {
  const rows = parseRows(String(text || ""));
  if (rows.length < 2) throw new Error("O CSV precisa ter cabeçalho e pelo menos um prospect.");

  const headers = rows[0].map((header) => header.toLowerCase());
  if (!headers.includes("prospect")) throw new Error('O CSV precisa ter a coluna "prospect".');

  return rows.slice(1).map((values, index) => {
    const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
    if (!row.prospect) throw new Error(`A linha ${index + 2} está sem o nome do prospect.`);

    return {
      prospect: row.prospect,
      territoryFit: asBoolean(row.territory_fit),
      newProspect: asBoolean(row.new_prospect),
      segmentFit: asBoolean(row.segment_fit, true),
      publicSources: asBoolean(row.public_sources),
      noDuplicate: asBoolean(row.no_duplicate),
      strategicFit: asNumber(row.strategic_fit),
      whyNow: asNumber(row.why_now),
      access: asNumber(row.access),
      readiness: asNumber(row.readiness),
      penalty: asNumber(row.penalty),
      confidence: row.confidence || "baixa",
    };
  });
}

export function rankProspects(prospects) {
  return prospects
    .map((prospect, originalIndex) => ({ ...prioritizeProspect(prospect), originalIndex }))
    .sort((left, right) => {
      if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
      if (left.eligible && right.eligible && left.score !== right.score) return right.score - left.score;
      return left.originalIndex - right.originalIndex;
    });
}
