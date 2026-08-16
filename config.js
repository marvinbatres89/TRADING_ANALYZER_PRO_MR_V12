export const APP_VERSION = "11.4.0-H";

export const DERIV = Object.freeze({
  ws: "wss://ws.derivws.com/websockets/v3?app_id=1089",
  historyCount: 100,
  pingMs: 25000,
  reconnectMs: 1500
});

export const MARKETS = Object.freeze({
  "R_10": "Volatility 10 Index",
  "R_25": "Volatility 25 Index",
  "R_50": "Volatility 50 Index",
  "R_75": "Volatility 75 Index",
  "R_100": "Volatility 100 Index",
  "1HZ10V": "Volatility 10 (1s) Index",
  "1HZ25V": "Volatility 25 (1s) Index",
  "1HZ50V": "Volatility 50 (1s) Index",
  "1HZ75V": "Volatility 75 (1s) Index",
  "1HZ100V": "Volatility 100 (1s) Index"
});

export const STRATEGIES = Object.freeze({
  rise_fall: { name: "Rise / Fall", voice: "sube o baja" },
  even_odd: { name: "Even / Odd", voice: "par o impar" },
  over_under: { name: "Over / Under", voice: "más o menos" },
  match: { name: "Match", voice: "coincidencia" }
});

export const ENGINE = Object.freeze({
  maxPrices: 500,
  maxDigits: 500,

  // Recupera la fluidez de la base estable.
  minFast: 20,
  minDeep: 40,

  // El análisis vive en segundo plano; PREDICTION solo revalida.
  validationStandardMs: 850,
  validationOneSecondMs: 650,

  thresholds: {
    rise_fall: 68,
    even_odd: 66,
    over_under: 66,
    match: 72
  },

  executionSeconds: 10,

  // Desde el final de la frase hasta el inicio del "10".
  phraseToTenMs: 900,

  // Evita que "Predicción finalizada" se monte sobre "cero".
  afterZeroMs: 800,

  cooldownMs: 1800
});

export const VOICE = Object.freeze({
  lang: "es-SV",
  rate: 1.05,
  pitch: 1,
  volume: 1
});
