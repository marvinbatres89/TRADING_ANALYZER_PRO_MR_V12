export function validateOpportunity(first, fresh) {
  if (!first || !fresh) {
    return {
      approved: false,
      direction: "WAIT",
      score: 0,
      reasons: ["Validación incompleta."]
    };
  }

  if (["WAIT", "NO_OPERAR"].includes(first.direction)) {
    return {
      approved: false,
      direction: "WAIT",
      score: first.score || 0,
      reasons: ["Motor explorador todavía no presenta una oportunidad clara."]
    };
  }

  const sameDirection =
    first.strategy === fresh.strategy &&
    first.direction === fresh.direction &&
    (
      first.strategy !== "match" ||
      first.metadata?.digit === fresh.metadata?.digit
    );

  let score = Math.round((Number(first.score) + Number(fresh.score)) / 2);

  const reasons = [];

  if (sameDirection) {
    score += 5;
    reasons.push("La dirección se mantuvo durante la revalidación.");
  } else {
    score -= 18;
    reasons.push("La dirección cambió durante la revalidación.");
  }

  // Validador deliberadamente corto: confirma, no repite todos los filtros.
  const minimum = first.strategy === "match" ? 68 : 60;

  return {
    approved: sameDirection && score >= minimum,
    direction: sameDirection ? first.direction : "WAIT",
    score: Math.max(0, Math.min(100, score)),
    reasons
  };
}
