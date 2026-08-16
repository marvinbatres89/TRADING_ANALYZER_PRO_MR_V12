const avg = values =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

function trend(prices, size) {
  const sample = prices.slice(-size);
  if (sample.length < 8) return { direction: "LATERAL", strength: 0, percent: 0 };

  const part = Math.max(2, Math.floor(sample.length / 3));
  const first = avg(sample.slice(0, part));
  const last = avg(sample.slice(-part));
  const percent = first ? ((last - first) / first) * 100 : 0;

  return {
    direction: Math.abs(percent) < 0.003 ? "LATERAL" : percent > 0 ? "BULLISH" : "BEARISH",
    strength: clamp(Math.abs(percent) * 900, 0, 3),
    percent
  };
}

function momentum(prices, size) {
  if (prices.length < size + 1) return { direction: "NEUTRAL", strength: 0, percent: 0 };

  const start = prices[prices.length - size - 1];
  const end = prices.at(-1);
  const percent = start ? ((end - start) / start) * 100 : 0;

  return {
    direction: Math.abs(percent) < 0.001 ? "NEUTRAL" : percent > 0 ? "POSITIVE" : "NEGATIVE",
    strength: clamp(Math.abs(percent) * 1200, 0, 3),
    percent
  };
}

function flow(prices, size) {
  const sample = prices.slice(-(size + 1));
  let rises = 0;
  let falls = 0;

  for (let i = 1; i < sample.length; i += 1) {
    if (sample[i] > sample[i - 1]) rises += 1;
    if (sample[i] < sample[i - 1]) falls += 1;
  }

  const total = Math.max(1, rises + falls);
  const difference = Math.abs(rises - falls);

  return {
    direction: difference / total < 0.16 ? "NEUTRAL" : rises > falls ? "BULLISH" : "BEARISH",
    strength: clamp(difference / 2, 0, 3),
    rises,
    falls
  };
}

function rsi(prices, period = 14) {
  if (prices.length < period + 1) return null;
  const sample = prices.slice(-(period + 1));

  let gains = 0;
  let losses = 0;

  for (let i = 1; i < sample.length; i += 1) {
    const d = sample[i] - sample[i - 1];
    if (d > 0) gains += d;
    if (d < 0) losses += Math.abs(d);
  }

  if (!losses) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function volatility(prices, size = 30) {
  const sample = prices.slice(-size);
  if (sample.length < 5) return { level: "LOW", percent: 0 };

  const mean = avg(sample);
  const dev = Math.sqrt(avg(sample.map(v => (v - mean) ** 2)));
  const percent = mean ? (dev / mean) * 100 : 0;

  return {
    level: percent > 0.08 ? "VERY HIGH" : percent > 0.04 ? "HIGH" : percent > 0.015 ? "MEDIUM" : "LOW",
    percent
  };
}

function digitStats(digits, size) {
  const sample = digits.slice(-size);
  const frequency = Array(10).fill(0);

  sample.forEach(d => {
    if (Number.isInteger(d) && d >= 0 && d <= 9) frequency[d] += 1;
  });

  const even = sample.filter(d => d % 2 === 0).length;
  const high = sample.filter(d => d >= 5).length;

  let hot = 0;
  frequency.forEach((count, digit) => {
    if (count > frequency[hot]) hot = digit;
  });

  return {
    count: sample.length,
    even,
    odd: sample.length - even,
    evenPct: sample.length ? even / sample.length * 100 : 0,
    oddPct: sample.length ? (sample.length - even) / sample.length * 100 : 0,
    high,
    low: sample.length - high,
    highPct: sample.length ? high / sample.length * 100 : 0,
    lowPct: sample.length ? (sample.length - high) / sample.length * 100 : 0,
    frequency,
    hot,
    hotFreq: frequency[hot]
  };
}

export function buildSnapshot({ prices = [], digits = [], mode = "fast" } = {}) {
  const deep = mode === "deep";

  const t = trend(prices, deep ? 40 : 20);
  const m = momentum(prices, deep ? 18 : 10);
  const shortFlow = flow(prices, 8);
  const mediumFlow = flow(prices, 20);
  const rsiValue = rsi(prices);
  const vol = volatility(prices);

  return {
    mode,
    rawPrices: prices.slice(-160),
    rawDigits: digits.slice(-120),
    trend: t,
    momentum: m,
    shortFlow,
    mediumFlow,
    rsi: rsiValue,
    rsiState:
      rsiValue === null ? "NO DATA" :
      rsiValue >= 58 ? "BULLISH" :
      rsiValue <= 42 ? "BEARISH" :
      "NEUTRAL",
    volatility: vol,
    lateral: t.direction === "LATERAL" && shortFlow.direction === "NEUTRAL",
    digits: {
      short: digitStats(digits, 20),
      context: digitStats(digits, deep ? 40 : 30),
      long: digitStats(digits, 60)
    }
  };
}
