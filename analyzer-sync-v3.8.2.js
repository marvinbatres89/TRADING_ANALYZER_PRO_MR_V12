/*
TRADING ANALYZER — SYNC V3.8.2
Reloj absoluto compartido + transición de voz inmediata.
Este módulo NO recalcula la predicción. Publica el mismo TARGET para Analyzer y BOT.
*/
export const SYNC_V382 = Object.freeze({
  protocol: "SYNC-V3.8.2",
  channel: "trading-analyzer-bot-v1-mr",
  storageKey: "TA_BOT_SIGNAL_V1",
  prepareLeadMs: 1200,
  executeMessageGapMs: 250
});

export function createSharedTiming({
  executionSeconds = 10,
  entrySecond = 10,
  visualDelayMs = 0,
  direction = ""
} = {}) {
  const now = Date.now();
  const countdownStartAt = now + SYNC_V382.prepareLeadMs;
  const baseTargetAt =
    countdownStartAt +
    Math.max(0, (Number(executionSeconds) - Number(entrySecond)) * 1000);

  // El BOT aplica la calibración direccional. Analyzer NO crea otro reloj.
  return {
    protocol: SYNC_V382.protocol,
    createdAt: now,
    countdownStartAt,
    targetExecutionAt: baseTargetAt,
    targetVisualAt: baseTargetAt + Number(visualDelayMs || 0),
    direction: String(direction || "").toUpperCase()
  };
}

export function sendSharedSignal(message) {
  const payload = {
    ...message,
    protocolo: SYNC_V382.protocol,
    timestamp: Date.now()
  };

  localStorage.setItem(SYNC_V382.storageKey, JSON.stringify(payload));

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(SYNC_V382.channel);
    channel.postMessage(payload);
    channel.close();
  }

  return payload;
}
