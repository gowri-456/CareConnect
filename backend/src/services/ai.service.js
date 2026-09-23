// ---------------------------------------------------------------------------
// AI SERVICE
// ---------------------------------------------------------------------------
// This is a simple, rule-based "AI" so the project runs with zero API keys
// or external cost. It matches keywords in the customer's free-text request
// against each ServiceCategory's name + requiredSkills.
//
// To upgrade this to a real LLM later, keep the same function signatures
// (classifyRequest / rankProviders) and swap the logic inside for a call to
// the OpenAI/Claude API. Nothing else in the app needs to change.
// ---------------------------------------------------------------------------

// Classifies free-text into one of the given categories.
// categories: array of ServiceCategory documents
function classifyRequest(descriptionText, categories) {
  const text = normalizeSkill(descriptionText);
  const availableCategories = categories.length ? categories : [
    { name: "Plumbing", requiredSkills: ["plumbing", "pipe repair", "leak", "water heater"] },
    { name: "Electrical", requiredSkills: ["electrical", "wiring", "outlet", "breaker"] },
    { name: "Cleaning", requiredSkills: ["cleaning", "deep clean", "housekeeping"] },
    { name: "Appliance Repair", requiredSkills: ["appliance repair", "washing machine", "washing", "machine", "washer", "repair", "fridge", "oven"] },
  ];

  let bestMatch = null;
  let bestScore = 0;

  for (const category of availableCategories) {
    const keywords = [category.name, ...(category.requiredSkills || [])];
    let score = 0;

    for (const keyword of keywords) {
      if (keyword && phraseMatches(text, keyword)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  if (!bestMatch) {
    return {
      category: null,
      categoryId: null,
      confidence: 0,
      suggestedSkills: [],
    };
  }

  // Very simple confidence score: how many keywords matched, capped at 1
  const totalKeywords = 1 + (bestMatch.requiredSkills || []).length;
  const confidence = Math.min(bestScore / totalKeywords, 1);

  return {
    category: bestMatch.name,
    categoryId: bestMatch._id || null,
    confidence: Number(confidence.toFixed(2)),
    suggestedSkills: bestMatch.requiredSkills || [],
  };
}

// Ranks providers for a given service request.
// providers: array of ProviderProfile documents (already populated with .user)
// requiredSkills: array of skill strings needed for the job
function rankProviders(providers, requiredSkills = []) {
  const scored = providers.map((provider) => {
    let score = 0;

    // +2 points per matching skill
    const matchingSkills = (provider.skills || []).filter((skill) =>
      requiredSkills.map((s) => s.toLowerCase()).includes(skill.toLowerCase())
    );
    score += matchingSkills.length * 2;

    // +rating (0-5)
    score += provider.ratingAvg || 0;

    // +1 if currently available for work
    if (provider.isAvailableForWork) score += 1;

    // +1 if verified
    if (provider.verificationStatus === "verified") score += 1;

    return { provider, score, matchingSkills };
  });

  // Highest score first
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

function normalizeSkill(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const current = row[j];
      row[j] = left[i - 1] === right[j - 1]
        ? previous
        : Math.min(previous + 1, row[j - 1] + 1, current + 1);
      previous = current;
    }
  }
  return row[right.length];
}

function wordMatches(left, right) {
  if (left === right) return true;
  if (left.length < 4 || right.length < 4) return false;
  if (left.includes(right) || right.includes(left)) return true;
  return levenshtein(left, right) <= Math.max(1, Math.ceil(Math.min(left.length, right.length) / 4));
}

function phraseMatches(text, phrase) {
  const words = normalizeSkill(phrase).split(" ").filter(Boolean);
  const textWords = text.split(" ").filter(Boolean);
  return words.every((word) => textWords.some((textWord) => wordMatches(textWord, word)));
}

function skillsMatch(providerSkills = [], requiredSkills = []) {
  const available = providerSkills.map((skill) => normalizeSkill(skill).split(" ").filter(Boolean)).filter((skill) => skill.length);
  const required = requiredSkills.map((skill) => normalizeSkill(skill).split(" ").filter(Boolean)).filter((skill) => skill.length);
  return required.some((neededWords) => available.some((availableWords) =>
    neededWords.every((neededWord) => availableWords.some((availableWord) => wordMatches(availableWord, neededWord)))
  ));
}

function providerMatchesRequest(provider, serviceRequest) {
  const requiredSkills = [
    ...(serviceRequest.aiClassification?.suggestedSkills || []),
    serviceRequest.aiClassification?.category,
    serviceRequest.category?.name,
  ].filter(Boolean).filter((skill) => {
    const normalized = normalizeSkill(skill);
    return !["repair", "repairs", "service", "services", "maintenance", "help", "work"].includes(normalized);
  });
  return skillsMatch(provider.skills || [], requiredSkills);
}

function summarizeQuote(quote, request = {}) {
  const price = Number(quote?.price || 0).toLocaleString();
  const duration = Number(quote?.estimatedDurationMins || 60);
  const durationText = duration >= 60 ? `${Math.round(duration / 60)} hour${duration >= 120 ? "s" : ""}` : `${duration} minutes`;
  const message = String(quote?.message || "").trim();
  const service = request?.category?.name || request?.aiClassification?.category || "your service request";
  return `${service}: Rs. ${price}, estimated ${durationText}${message ? ` - ${message}` : "."}`;
}

module.exports = { classifyRequest, rankProviders, providerMatchesRequest, summarizeQuote };
