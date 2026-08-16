export function visualDirection(result) {
  const direction = String(result?.direction || "").toUpperCase();
  const digit = result?.metadata?.digit;

  const map = {
    RISE: "SUBE",
    FALL: "BAJA",
    EVEN: "PAR",
    ODD: "IMPAR",
    OVER: "MÁS",
    UNDER: "MENOS"
  };

  if (direction === "MATCH") {
    return Number.isInteger(Number(digit))
      ? `COINCIDENCIA ${digit}`
      : "COINCIDENCIA";
  }

  return map[direction] || direction || "ESPERAR";
}

export function voiceDirection(result) {
  const direction = String(result?.direction || "").toUpperCase();
  const digit = result?.metadata?.digit;
  const barrier = result?.metadata?.barrier;

  if (direction === "RISE") return "sube";
  if (direction === "FALL") return "baja";
  if (direction === "EVEN") return "par";
  if (direction === "ODD") return "impar";
  if (direction === "OVER") return Number.isFinite(Number(barrier)) ? `más de ${barrier}` : "más";
  if (direction === "UNDER") return Number.isFinite(Number(barrier)) ? `menos de ${barrier}` : "menos";
  if (direction === "MATCH") return Number.isFinite(Number(digit)) ? `coincidencia ${digit}` : "coincidencia";

  return "esperar";
}

export function briefExplanation(result) {
  const reasons = result?.reasons || [];
  const clean = reasons
    .filter(Boolean)
    .slice(0, 2)
    .map(text => String(text).replace(/\.$/, ""));

  if (!clean.length) return "Los motores mantienen una señal suficientemente clara.";

  return `${clean.join(". ")}.`;
}
