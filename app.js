import {
  APP_VERSION,
  ENGINE,
  MARKETS,
  STRATEGIES
} from "./config.js";

import { derivAPI } from "./deriv-api.js";
import { buildSnapshot } from "./indicators.js";
import { exploreOpportunity } from "./engine1.js";
import { validateOpportunity } from "./engine2.js";
import { buildConsensus } from "./consensus.js";
import {
  visualDirection,
  voiceDirection,
  briefExplanation
} from "./prediction.js";
import { voiceAssistant } from "./voice.js";
import { botBridge } from "./bridge.js";

const $ = id => document.getElementById(id);

const UI = {};
[
  "connectionStatus","engineStatus","marketSelect","strategySelect","modeSelect",
  "connectButton","disconnectButton","predictionButton","voiceButton",
  "price","tickCount","lastDigit","trend","rsi","momentum","volatility",
  "signalState","signalValue","signalScore","signalReason","countdown",
  "statsTests","statsWins","statsLosses","statsAccuracy",
  "diagnostic","clearDiagnostic","appVersion"
].forEach(id => UI[id] = $(id));

const state = {
  connected: false,
  engineOn: false,
  predictionActive: false,
  cooldown: false,
  symbol: "R_50",
  strategy: "even_odd",
  mode: "fast",
  prices: [],
  digits: [],
  pipSize: 2,
  ticks: 0,
  snapshot: null,
  liveOpportunity: null,
  lastPrice: null,
  lastDigit: null,
  countdownTimer: null,
  cooldownTimer: null,
  pendingEvaluation: null,
  stats: { tests: 0, wins: 0, losses: 0 }
};

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)));

function text(element, value) {
  if (element) element.textContent = String(value);
}

function diag(message, data = null, level = "info") {
  const line = document.createElement("div");
  line.className = `diag ${level}`;
  line.textContent =
    `[${new Date().toLocaleTimeString("es-SV")}] ${message}` +
    (data ? `\n${JSON.stringify(data, null, 2)}` : "");

  UI.diagnostic?.prepend(line);

  while (UI.diagnostic?.children.length > 80) {
    UI.diagnostic.lastElementChild?.remove();
  }
}

function digitFromPrice(price, pipSize = 2) {
  const formatted = Number(price).toFixed(Math.max(0, Number(pipSize) || 2));
  const chars = formatted.replace(/\D/g, "");
  const last = chars.at(-1);
  return last === undefined ? null : Number(last);
}

function appendMarketPoint(price, digit) {
  if (Number.isFinite(price)) {
    state.prices.push(price);
    if (state.prices.length > ENGINE.maxPrices) state.prices.shift();
  }

  if (Number.isInteger(digit)) {
    state.digits.push(digit);
    if (state.digits.length > ENGINE.maxDigits) state.digits.shift();
  }
}

function minimumData() {
  if (state.strategy === "match") return Math.max(30, state.mode === "deep" ? 40 : 30);
  return state.mode === "deep" ? ENGINE.minDeep : ENGINE.minFast;
}

function enoughData() {
  return state.prices.length >= minimumData() &&
    state.digits.length >= (state.strategy === "rise_fall" ? 10 : minimumData());
}

function isOneSecondMarket() {
  return /^1HZ/i.test(state.symbol);
}

function renderStats() {
  const { tests, wins, losses } = state.stats;
  const accuracy = tests ? wins / tests * 100 : null;

  text(UI.statsTests, tests);
  text(UI.statsWins, wins);
  text(UI.statsLosses, losses);
  text(UI.statsAccuracy, accuracy === null ? "--" : `${accuracy.toFixed(1)}%`);
}

function renderIndicators() {
  const s = state.snapshot;
  if (!s) return;

  text(UI.trend, s.trend.direction);
  text(UI.rsi, s.rsi === null ? "--" : s.rsi.toFixed(1));
  text(UI.momentum, s.momentum.direction);
  text(UI.volatility, s.volatility.level);
}

function renderControls() {
  text(UI.engineStatus, state.engineOn ? "ANÁLISIS ACTIVO" : "OFF");

  if (UI.predictionButton) {
    UI.predictionButton.disabled =
      !state.connected ||
      !state.engineOn ||
      state.predictionActive ||
      state.cooldown ||
      !enoughData();

    UI.predictionButton.textContent =
      state.predictionActive ? "ANALIZANDO..." :
      state.cooldown ? "ESPERA..." :
      enoughData() ? "PREDICTION" :
      `DATOS ${Math.min(state.prices.length, minimumData())}/${minimumData()}`;
  }

  if (UI.marketSelect) UI.marketSelect.disabled = state.predictionActive;
  if (UI.strategySelect) UI.strategySelect.disabled = state.predictionActive;
  if (UI.modeSelect) UI.modeSelect.disabled = state.predictionActive;
}

function refreshContinuousAnalysis() {
  if (!state.prices.length) return;

  state.snapshot = buildSnapshot({
    prices: state.prices,
    digits: state.digits,
    mode: state.mode
  });

  state.liveOpportunity = exploreOpportunity(
    state.strategy,
    state.snapshot
  );

  renderIndicators();
  renderControls();
}

function evaluatePending(price, digit, tickEpochMs) {
  const pending = state.pendingEvaluation;
  if (!pending || pending.done) return;
  if (tickEpochMs < pending.targetAt) return;

  pending.done = true;
  let success = false;

  if (pending.strategy === "even_odd") {
    success = pending.direction === "EVEN"
      ? digit % 2 === 0
      : digit % 2 !== 0;
  } else if (pending.strategy === "over_under") {
    success = pending.direction === "OVER"
      ? digit >= 5
      : digit <= 4;
  } else if (pending.strategy === "match") {
    success = digit === Number(pending.metadata?.digit);
  } else if (pending.strategy === "rise_fall") {
    success = pending.direction === "RISE"
      ? price > pending.referencePrice
      : price < pending.referencePrice;
  }

  state.stats.tests += 1;
  success ? state.stats.wins += 1 : state.stats.losses += 1;
  renderStats();

  diag(
    success ? "RESULTADO AUTOMÁTICO: GANADA." : "RESULTADO AUTOMÁTICO: PERDIDA.",
    {
      strategy: pending.strategy,
      direction: pending.direction,
      digit,
      price,
      targetAt: pending.targetAt
    },
    success ? "ok" : "warn"
  );

  state.pendingEvaluation = null;
}

function processTick(tick) {
  if (tick.symbol !== state.symbol) return;

  state.pipSize = tick.pipSize || state.pipSize;
  state.lastPrice = tick.price;
  state.lastDigit = digitFromPrice(tick.price, state.pipSize);
  state.ticks += 1;

  appendMarketPoint(state.lastPrice, state.lastDigit);

  text(UI.price, Number(state.lastPrice).toFixed(state.pipSize));
  text(UI.tickCount, state.prices.length);
  text(UI.lastDigit, state.lastDigit ?? "--");

  refreshContinuousAnalysis();
  evaluatePending(state.lastPrice, state.lastDigit, tick.epoch * 1000);
}

function processHistory({ symbol, prices }) {
  if (symbol !== state.symbol) return;

  state.prices = [];
  state.digits = [];

  prices.forEach(price => {
    const digit = digitFromPrice(price, state.pipSize);
    appendMarketPoint(price, digit);
  });

  state.lastPrice = state.prices.at(-1) ?? null;
  state.lastDigit = state.digits.at(-1) ?? null;

  text(UI.price, state.lastPrice === null ? "--" : Number(state.lastPrice).toFixed(state.pipSize));
  text(UI.tickCount, state.prices.length);
  text(UI.lastDigit, state.lastDigit ?? "--");

  refreshContinuousAnalysis();

  diag("Histórico precargado. Motor listo en segundo plano.", {
    prices: state.prices.length,
    digits: state.digits.length,
    mode: state.mode
  }, "ok");
}

function resetMarketData() {
  state.prices = [];
  state.digits = [];
  state.ticks = 0;
  state.snapshot = null;
  state.liveOpportunity = null;
  state.lastPrice = null;
  state.lastDigit = null;
  state.pendingEvaluation = null;

  text(UI.price, "--");
  text(UI.tickCount, 0);
  text(UI.lastDigit, "--");
  renderControls();
}

function buildBotSignal(result, operacionId) {
  return {
    operacionId,
    mercado: state.symbol,
    estrategia: state.strategy,
    direccion: result.direction,
    confianza: result.score,
    precio: state.lastPrice,
    ultimoDigito: state.lastDigit,
    modo: state.mode,
    segundosEntrada: 10,
    metadata: {
      ...(result.metadata || {})
    },
    origen: `Trading Analyst Pro MR ${APP_VERSION}`
  };
}

async function runCountdown(seconds) {
  clearInterval(state.countdownTimer);

  return new Promise(resolve => {
    const startedAt = performance.now();
    let lastShown = null;

    const update = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const remaining = Math.max(0, Number(seconds) - Math.floor(elapsed));

      if (remaining !== lastShown) {
        lastShown = remaining;
        text(UI.countdown, remaining);
        voiceAssistant.speakCountdownNumber(remaining);
      }

      if (elapsed >= Number(seconds)) {
        clearInterval(state.countdownTimer);
        state.countdownTimer = null;
        text(UI.countdown, 0);
        resolve();
      }
    };

    update();
    state.countdownTimer = setInterval(update, 25);
  });
}

async function executionSequence(result) {
  const operacionId = `${Date.now()}-${state.symbol}-${state.strategy}`;
  const signal = buildBotSignal(result, operacionId);

  text(UI.signalState, "CONFIRMADA");
  text(UI.signalValue, visualDirection(result));
  text(UI.signalScore, `${result.score}/100`);
  text(UI.signalReason, briefExplanation(result));

  const explanation =
    `Predicción confirmada. ${voiceDirection(result)}. ` +
    `${briefExplanation(result)}`;

  await voiceAssistant.speak(explanation, {
    replace: true,
    rate: 1.04
  });

  botBridge.prepare(signal);
  diag("BOT PREPARAR enviado.", {
    mercado: signal.mercado,
    direccion: signal.direccion,
    confianza: signal.confianza
  }, "ok");

  await voiceAssistant.speak(
    "Tienes diez segundos para realizar la operación.",
    { replace: true, rate: 1.05 }
  );

  const phraseEndedAt = Date.now();
  const targetAt = phraseEndedAt + ENGINE.phraseToTenMs;

  botBridge.target(signal, targetAt);

  diag("TARGET 10 programado.", {
    phraseEndedAt,
    targetAt,
    margenMs: ENGINE.phraseToTenMs
  }, "ok");

  await sleep(Math.max(0, targetAt - Date.now()));

  const reachedAt = Date.now();
  diag("TARGET 10 alcanzado.", {
    targetAt,
    reachedAt,
    desviacionMs: reachedAt - targetAt
  }, "ok");

  state.pendingEvaluation = {
    strategy: result.strategy,
    direction: result.direction,
    metadata: result.metadata,
    targetAt,
    referencePrice: state.lastPrice,
    done: false
  };

  await runCountdown(ENGINE.executionSeconds);

  // Da espacio real para que Android termine de pronunciar "cero".
  await sleep(ENGINE.afterZeroMs);

  await voiceAssistant.speak(
    "Predicción finalizada. Puede solicitar otra entrada.",
    { replace: true, rate: 1.04 }
  );
}

async function requestPrediction() {
  if (
    !state.connected ||
    !state.engineOn ||
    state.predictionActive ||
    state.cooldown ||
    !enoughData()
  ) return;

  state.predictionActive = true;
  renderControls();

  text(UI.signalState, "ANALIZANDO");
  text(UI.signalValue, "--");
  text(UI.signalScore, "--");
  text(UI.signalReason, "Validación rápida sobre el análisis que ya estaba activo.");
  text(UI.countdown, "--");

  // Motor 1 toma el estado ya precalculado.
  const firstSnapshot = buildSnapshot({
    prices: state.prices,
    digits: state.digits,
    mode: state.mode
  });

  const first = exploreOpportunity(state.strategy, firstSnapshot);

  const validationDelay = isOneSecondMarket()
    ? ENGINE.validationOneSecondMs
    : ENGINE.validationStandardMs;

  await sleep(validationDelay);

  const freshSnapshot = buildSnapshot({
    prices: state.prices,
    digits: state.digits,
    mode: state.mode
  });

  const fresh = exploreOpportunity(state.strategy, freshSnapshot);
  const validation = validateOpportunity(first, fresh);
  const consensus = buildConsensus(first, validation);

  const threshold = ENGINE.thresholds[state.strategy] ?? 66;

  const approved =
    consensus.approved &&
    consensus.score >= threshold;

  diag("DIAGNÓSTICO PREDICCIÓN HÍBRIDA.", {
    first: {
      direction: first.direction,
      score: first.score
    },
    fresh: {
      direction: fresh.direction,
      score: fresh.score
    },
    validation: {
      approved: validation.approved,
      score: validation.score
    },
    consensus: {
      approved: consensus.approved,
      score: consensus.score
    },
    threshold,
    approved
  }, approved ? "ok" : "warn");

  if (!approved) {
    text(UI.signalState, "ESPERAR");
    text(UI.signalValue, "SIN ENTRADA");
    text(UI.signalScore, `${consensus.score}/100`);
    text(
      UI.signalReason,
      first.direction === "WAIT"
        ? "El motor rápido todavía no ve ventaja suficiente."
        : "La señal no se mantuvo con suficiente claridad en la revalidación."
    );

    state.predictionActive = false;
    state.cooldown = true;
    renderControls();

    state.cooldownTimer = setTimeout(() => {
      state.cooldown = false;
      renderControls();
    }, ENGINE.cooldownMs);

    return;
  }

  const result = {
    ...consensus,
    strategy: state.strategy,
    direction: first.direction,
    score: consensus.score,
    metadata: first.metadata || {}
  };

  await executionSequence(result);

  state.predictionActive = false;
  state.cooldown = true;
  renderControls();

  state.cooldownTimer = setTimeout(() => {
    state.cooldown = false;
    renderControls();
  }, ENGINE.cooldownMs);
}

async function init() {
  await voiceAssistant.init();

  Object.entries(MARKETS).forEach(([symbol, name]) => {
    const option = document.createElement("option");
    option.value = symbol;
    option.textContent = name;
    if (symbol === state.symbol) option.selected = true;
    UI.marketSelect?.appendChild(option);
  });

  Object.entries(STRATEGIES).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = value.name;
    if (key === state.strategy) option.selected = true;
    UI.strategySelect?.appendChild(option);
  });

  text(UI.appVersion, `V${APP_VERSION}`);
  renderStats();
  renderControls();

  diag("Trading Analyst híbrido listo. Conectar precarga histórico y activa análisis continuo.", null, "ok");
}

UI.connectButton?.addEventListener("click", () => {
  derivAPI.connect(state.symbol);
});

UI.disconnectButton?.addEventListener("click", () => {
  derivAPI.disconnect();
  state.connected = false;
  state.engineOn = false;
  renderControls();
});

UI.predictionButton?.addEventListener("click", requestPrediction);

UI.voiceButton?.addEventListener("click", () => {
  const on = voiceAssistant.toggle();
  text(UI.voiceButton, on ? "🔊 VOZ" : "🔇 VOZ");
});

UI.marketSelect?.addEventListener("change", () => {
  state.symbol = UI.marketSelect.value;
  resetMarketData();
  if (state.connected) derivAPI.changeSymbol(state.symbol);
});

UI.strategySelect?.addEventListener("change", () => {
  state.strategy = UI.strategySelect.value;
  refreshContinuousAnalysis();
});

UI.modeSelect?.addEventListener("change", () => {
  state.mode = UI.modeSelect.value;
  refreshContinuousAnalysis();
});

UI.clearDiagnostic?.addEventListener("click", () => {
  if (UI.diagnostic) UI.diagnostic.innerHTML = "";
});

derivAPI.on("state", ({ state: status, label }) => {
  state.connected = status === "live";
  text(UI.connectionStatus, label);

  if (status === "live") {
    // Motor continuo automático desde la conexión.
    state.engineOn = true;
    text(UI.engineStatus, "ANÁLISIS ACTIVO");
  } else if (status === "offline") {
    state.engineOn = false;
  }

  renderControls();
});

derivAPI.on("history", processHistory);
derivAPI.on("tick", processTick);
derivAPI.on("log", ({ message, level }) => diag(message, null, level));
derivAPI.on("error", ({ message }) => diag(message, null, "error"));

window.addEventListener("beforeunload", () => {
  clearInterval(state.countdownTimer);
  clearTimeout(state.cooldownTimer);
  derivAPI.disconnect();
  botBridge.close();
});

init().catch(error => {
  diag("Error de inicio.", {
    name: error.name,
    message: error.message,
    stack: error.stack
  }, "error");
});
