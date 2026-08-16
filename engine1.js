const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(Number(value) || 0)));

function out(strategy, direction, score, reasons = [], warnings = [], metadata = {}) {
  return {
    source: "ENGINE_1_HYBRID",
    strategy,
    direction,
    score: clamp(score),
    reasons,
    warnings,
    metadata,
    createdAt: Date.now()
  };
}

function riseFall(snapshot) {
  let up = 0;
  let down = 0;
  const upReasons = [];
  const downReasons = [];
  const warnings = [];

  if (snapshot.trend.direction === "BULLISH") {
    up += 24 + snapshot.trend.strength * 4;
    upReasons.push("Tendencia principal alcista.");
  }
  if (snapshot.trend.direction === "BEARISH") {
    down += 24 + snapshot.trend.strength * 4;
    downReasons.push("Tendencia principal bajista.");
  }

  if (snapshot.momentum.direction === "POSITIVE") {
    up += 18 + snapshot.momentum.strength * 3;
    upReasons.push("Momentum positivo.");
  }
  if (snapshot.momentum.direction === "NEGATIVE") {
    down += 18 + snapshot.momentum.strength * 3;
    downReasons.push("Momentum negativo.");
  }

  if (snapshot.shortFlow.direction === "BULLISH") {
    up += 16;
    upReasons.push("Flujo corto alcista.");
  }
  if (snapshot.shortFlow.direction === "BEARISH") {
    down += 16;
    downReasons.push("Flujo corto bajista.");
  }

  if (snapshot.mediumFlow.direction === "BULLISH") up += 7;
  if (snapshot.mediumFlow.direction === "BEARISH") down += 7;
  if (snapshot.rsiState === "BULLISH") up += 8;
  if (snapshot.rsiState === "BEARISH") down += 8;

  if (snapshot.lateral) {
    up -= 10;
    down -= 10;
    warnings.push("Mercado lateral.");
  }

  if (snapshot.volatility.level === "VERY HIGH") {
    up -= 10;
    down -= 10;
    warnings.push("Volatilidad extrema.");
  }

  const direction = up >= down ? "RISE" : "FALL";
  const score = Math.max(up, down);
  const difference = Math.abs(up - down);

  return out(
    "rise_fall",
    score >= 58 && difference >= 8 ? direction : "WAIT",
    score,
    direction === "RISE" ? upReasons : downReasons,
    warnings,
    { difference }
  );
}

function digitBinary(strategy, snapshot) {
  const short = snapshot.digits.short;
  const context = snapshot.digits.context;

  if (short.count < 20) {
    return out(strategy, "WAIT", 0, ["Recopilando 20 dígitos."]);
  }

  let shortA, shortB, contextA, contextB, direction, labelA, labelB;

  if (strategy === "even_odd") {
    shortA = short.evenPct;
    shortB = short.oddPct;
    contextA = context.evenPct;
    contextB = context.oddPct;
    direction = shortA >= shortB ? "EVEN" : "ODD";
    labelA = "pares";
    labelB = "impares";
  } else {
    shortA = short.highPct;
    shortB = short.lowPct;
    contextA = context.highPct;
    contextB = context.lowPct;
    direction = shortA >= shortB ? "OVER" : "UNDER";
    labelA = "altos";
    labelB = "bajos";
  }

  const shortDiff = Math.abs(shortA - shortB);
  const contextDiff = Math.abs(contextA - contextB);

  const shortSideA = shortA >= shortB;
  const contextSideA = contextA >= contextB;
  const agreement = shortSideA === contextSideA;

  let score = 48 + shortDiff * 1.35;

  if (context.count >= 30 && agreement) score += 6 + Math.min(6, contextDiff * 0.25);
  if (context.count >= 30 && !agreement) score -= 6;
  if (shortDiff < 6) score -= 8;

  score = clamp(score, 0, 88);

  return out(
    strategy,
    score >= 56 && shortDiff >= 6 ? direction : "WAIT",
    score,
    [
      `Ventana rápida: ${shortDiff.toFixed(1)}% de diferencia.`,
      `Comparación de ${labelA} frente a ${labelB}.`,
      context.count >= 30
        ? `Contexto ${agreement ? "acompaña" : "contradice"} la señal.`
        : "Contexto todavía creciendo."
    ],
    ["La frecuencia pasada no garantiza el siguiente dígito."],
    {
      shortDiff,
      contextDiff,
      agreement,
      barrier: strategy === "over_under"
        ? (direction === "OVER" ? 4 : 5)
        : undefined
    }
  );
}

function match(snapshot) {
  const d = snapshot.digits.long.count >= 30
    ? snapshot.digits.long
    : snapshot.digits.context;

  if (d.count < 30) {
    return out("match", "WAIT", 0, [`Recopilando dígitos para Match: ${d.count}/30.`]);
  }

  const ranked = d.frequency
    .map((count, digit) => ({ digit, count, pct: d.count ? count / d.count * 100 : 0 }))
    .filter(item => item.digit !== 0)
    .sort((a, b) => b.count - a.count);

  const first = ranked[0];
  const second = ranked[1];

  if (!first) return out("match", "WAIT", 0, ["Sin candidato Match."]);

  const separation = first.pct - (second?.pct || 0);
  const recent = snapshot.rawDigits.slice(-10);
  const recentHits = recent.filter(digit => digit === first.digit).length;

  let score = 50;
  score += Math.max(0, first.pct - 10) * 2.2;
  score += Math.min(10, separation * 2);
  score += recentHits >= 2 ? 8 : 0;
  score = clamp(score, 0, 86);

  const approved =
    first.pct >= 13 &&
    separation >= 1.5 &&
    recentHits >= 2 &&
    score >= 64;

  return out(
    "match",
    approved ? "MATCH" : "WAIT",
    score,
    [
      `Candidato ${first.digit}: ${first.pct.toFixed(1)}%.`,
      `Separación: ${separation.toFixed(1)} puntos.`,
      `Presencia reciente: ${recentHits}/10.`
    ],
    ["Match se mantiene experimental y requiere pruebas propias."],
    {
      digit: first.digit,
      separation,
      recentHits,
      combinedFrequency: first.pct
    }
  );
}

export function exploreOpportunity(strategy, snapshot) {
  if (!snapshot) return out(strategy, "WAIT", 0, ["Sin snapshot."]);
  if (strategy === "rise_fall") return riseFall(snapshot);
  if (strategy === "even_odd") return digitBinary("even_odd", snapshot);
  if (strategy === "over_under") return digitBinary("over_under", snapshot);
  return match(snapshot);
}
