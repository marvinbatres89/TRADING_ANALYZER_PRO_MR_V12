export function buildConsensus(engine1, engine2) {
  if (!engine1 || !engine2) {
    return {
      approved: false,
      score: 0,
      direction: "WAIT",
      reasons: ["Sin consenso disponible."]
    };
  }

  const approved =
    engine2.approved &&
    engine1.direction === engine2.direction &&
    !["WAIT", "NO_OPERAR"].includes(engine1.direction);

  return {
    approved,
    score: Math.round((engine1.score + engine2.score) / 2),
    direction: approved ? engine1.direction : engine1.direction,
    reasons: [
      ...(engine1.reasons || []),
      ...(engine2.reasons || [])
    ],
    warnings: engine1.warnings || [],
    metadata: engine1.metadata || {}
  };
}
