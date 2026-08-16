export function buildConsensus(first, validation) {
  if (!first || !validation) {
    return {
      approved: false,
      direction: "WAIT",
      score: 0,
      reasons: ["Sin consenso."]
    };
  }

  const approved =
    validation.approved === true &&
    validation.direction === first.direction &&
    !["WAIT", "NO_OPERAR"].includes(first.direction);

  return {
    approved,
    direction: approved ? first.direction : "WAIT",
    score: Math.round((Number(first.score) + Number(validation.score)) / 2),
    reasons: [
      ...(first.reasons || []),
      ...(validation.reasons || [])
    ],
    warnings: first.warnings || [],
    metadata: first.metadata || {}
  };
}
