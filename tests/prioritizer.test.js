import test from "node:test";
import assert from "node:assert/strict";
import { prioritizeProspect } from "../src/prioritizer.js";
import { parseProspectCsv, rankProspects } from "../src/csv.js";

const eligible = {
  territoryFit: true,
  newProspect: true,
  segmentFit: true,
  publicSources: true,
  noDuplicate: true,
};

test("Empresa Alfa resulta em faixa A", () => {
  const result = prioritizeProspect({
    ...eligible,
    prospect: "Empresa Alfa",
    strategicFit: 28,
    whyNow: 25,
    access: 16,
    readiness: 15,
    penalty: 0,
    confidence: "alta",
  });
  assert.equal(result.score, 84);
  assert.equal(result.band, "A");
  assert.equal(result.eligible, true);
});

test("Empresa Beta resulta em faixa B", () => {
  const result = prioritizeProspect({
    ...eligible,
    prospect: "Empresa Beta",
    strategicFit: 22,
    whyNow: 19,
    access: 12,
    readiness: 12,
    confidence: "media",
  });
  assert.equal(result.score, 65);
  assert.equal(result.band, "B");
});

test("Empresa Gama é excluída por território", () => {
  const result = prioritizeProspect({ ...eligible, territoryFit: false, prospect: "Empresa Gama" });
  assert.equal(result.eligible, false);
  assert.equal(result.status, "excluded_out_of_territory");
  assert.equal(result.score, null);
});

test("Empresa Delta é redirecionada por relacionamento existente", () => {
  const result = prioritizeProspect({ ...eligible, newProspect: false, prospect: "Empresa Delta" });
  assert.equal(result.eligible, false);
  assert.equal(result.status, "reroute_existing_relationship");
});

test("nota final permanece entre zero e cem", () => {
  const high = prioritizeProspect({ ...eligible, strategicFit: 999, whyNow: 999, access: 999, readiness: 999, penalty: -5 });
  const low = prioritizeProspect({ ...eligible, strategicFit: 0, whyNow: 0, access: 0, readiness: 0, penalty: 999 });
  assert.equal(high.score, 100);
  assert.equal(low.score, 0);
});

test("confiança baixa bloqueia contato automático", () => {
  const result = prioritizeProspect({
    ...eligible,
    strategicFit: 30,
    whyNow: 30,
    access: 20,
    readiness: 20,
    confidence: "baixa",
  });
  assert.equal(result.band, "A");
  assert.equal(result.automaticContactAllowed, false);
  assert.match(result.nextAction, /Validar as evidências/);
});

test("CSV sintético gera ranking e mantém bloqueios", () => {
  const csv = `prospect,territory_fit,new_prospect,segment_fit,public_sources,no_duplicate,strategic_fit,why_now,access,readiness,penalty,confidence
Empresa Beta,true,true,true,true,true,22,19,12,12,0,media
Empresa Alfa,true,true,true,true,true,28,25,16,15,0,alta
Empresa Gama,false,true,true,true,true,25,24,15,14,0,alta
Empresa Delta,true,false,true,true,true,26,22,17,13,0,alta`;
  const ranking = rankProspects(parseProspectCsv(csv));
  assert.deepEqual(ranking.map((item) => item.prospect), ["Empresa Alfa", "Empresa Beta", "Empresa Gama", "Empresa Delta"]);
  assert.deepEqual(ranking.slice(0, 2).map((item) => item.band), ["A", "B"]);
  assert.equal(ranking[2].status, "excluded_out_of_territory");
  assert.equal(ranking[3].status, "reroute_existing_relationship");
});
