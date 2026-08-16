const CHANNEL_NAME = "trading-analyzer-bot-v1-mr";
const STORAGE_KEY = "TA_BOT_SIGNAL_V1";

const channel =
  "BroadcastChannel" in window
    ? new BroadcastChannel(CHANNEL_NAME)
    : null;

function send(message) {
  let ok = false;

  try {
    channel?.postMessage(message);
    ok = Boolean(channel);
  } catch {}

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
    ok = true;
  } catch {}

  return ok;
}

export const botBridge = {
  prepare(signal) {
    const now = Date.now();

    return send({
      ...signal,
      id: `${signal.operacionId}-PREPARE`,
      fase: "PREPARAR",
      protocolo: "HYBRID-1",
      targetExecutionAt: null,
      targetVisualAt: null,
      analyzerSentEpoch: now,
      timestamp: now,
      metadata: {
        ...(signal.metadata || {}),
        fase: "PREPARAR",
        prepararCotizacion: true,
        ejecutar: false
      }
    });
  },

  target(signal, targetAt) {
    const now = Date.now();

    return send({
      ...signal,
      id: `${signal.operacionId}-TARGET`,
      fase: "EJECUTAR",
      protocolo: "HYBRID-1",
      targetExecutionAt: targetAt,
      targetVisualAt: targetAt,
      analyzerSentEpoch: now,
      timestamp: now,
      metadata: {
        ...(signal.metadata || {}),
        fase: "EJECUTAR",
        targetExecutionAt: targetAt,
        targetVisualAt: targetAt,
        ejecutar: true,
        referenciaEntrada: "INICIO_10"
      }
    });
  },

  close() {
    try { channel?.close(); } catch {}
  }
};
