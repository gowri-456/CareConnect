const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyRequest, providerMatchesRequest } = require("../src/services/ai.service");

const categories = [
  { _id: "plumbing-id", name: "Plumbing", requiredSkills: ["plumbing", "pipe repair", "leak"] },
  { _id: "electrical-id", name: "Electrical", requiredSkills: ["electrical", "wiring"] },
];

test("classifies a request and returns specialist skills", () => {
  const result = classifyRequest("There is a leak under my sink", categories);
  assert.equal(result.category, "Plumbing");
  assert.deepEqual(result.suggestedSkills, categories[0].requiredSkills);
  assert.ok(result.confidence > 0);
});

test("matches providers by request category and skill wording", () => {
  const request = { aiClassification: { category: "Plumbing", suggestedSkills: ["pipe repair"] } };
  assert.equal(providerMatchesRequest({ skills: ["Pipe Repair"] }, request), true);
  assert.equal(providerMatchesRequest({ skills: ["Electrical"] }, request), false);
});

test("does not match an unclassified request to a specialist", () => {
  const request = { aiClassification: { category: null, suggestedSkills: [] } };
  assert.equal(providerMatchesRequest({ skills: ["Plumbing"] }, request), false);
});
