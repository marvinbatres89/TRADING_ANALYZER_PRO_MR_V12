const WINDOWS = [20, 50, 100, 250, 500, 1000];

const pct = (part, total) => total ? (part / total) * 100 : 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

function windowStats(digits, size) {
  const sample = digits.slice(-size);
  const frequency = Array(10).fill(0);
  sample.forEach((digit) => {
    if (Number.isInteger(digit) && digit >= 0 && digit <= 9) frequency[digit] += 1;
  });

  const even = frequency.reduce((sum, count, digit) => sum + (digit % 2 === 0 ? count : 0), 0);
  const low = frequency.slice(0, 5).reduce((a, b) => a + b, 0);
  const hotCount = Math.max(...frequency);
  const coldCount = Math.min(...frequency);

  return {
    size,
    count: sample.length,
    complete: sample.length >= size,
    even,
    odd: sample.length - even,
    evenPercent: pct(even, sample.length),
    oddPercent: pct(sample.length - even, sample.length),
    low,
    high: sample.length - low,
    lowPercent: pct(low, sample.length),
    highPercent: pct(sample.length - low, sample.length),
    frequency,
    hotDigit: frequency.indexOf(hotCount),
    coldDigit: frequency.indexOf(coldCount)
  };
}

function ticksSince(digits, target) {
  for (let i = digits.length - 1, gap = 0; i >= 0; i -= 1, gap += 1) {
    if (digits[i] === target) return gap;
  }
  return digits.length;
}

function streak(digits, predicate) {
  let count = 0;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    if (!predicate(digits[i])) break;
    count += 1;
  }
  return count;
}

function transitionMatrix(digits) {
  const matrix = Array.from({ length: 10 }, () => Array(10).fill(0));
  for (let i = 1; i < digits.length; i += 1) {
    const from = digits[i - 1];
    const to = digits[i];
    if (Number.isInteger(from) && Number.isInteger(to)) matrix[from][to] += 1;
  }
  return matrix;
}

function triggerCandidate(digits, direction) {
  const allowed = direction === "EVEN" ? [0, 2, 4, 6, 8] : [1, 3, 5, 7, 9];
  const recent = digits.slice(-100);
  const freq = Array(10).fill(0);
  recent.forEach((d) => { if (Number.isInteger(d)) freq[d] += 1; });
  const expected = recent.length / 10 || 1;

  const ranked = allowed.map((digit) => {
    const gap = ticksSince(digits.slice(-250), digit);
    const frequencyBalance = 1 - Math.min(1, Math.abs(freq[digit] - expected) / Math.max(1, expected));
    const gapScore = Math.min(1, gap / 12);
    const score = gapScore * 0.55 + frequencyBalance * 0.45;
    return { digit, gap, frequency: freq[digit], score };
  }).sort((a, b) => b.score - a.score);

  return ranked[0] || null;
}

function overUnderBarriers(digits) {
  const sample = digits.slice(-250);
  return [2, 3, 4, 5, 6, 7].map((barrier) => {
    const over = sample.filter((d) => d > barrier).length;
    const under = sample.filter((d) => d < barrier).length;
    const equal = sample.length - over - under;
    return {
      barrier,
      count: sample.length,
      overPercent: pct(over, sample.length),
      underPercent: pct(under, sample.length),
      equalPercent: pct(equal, sample.length)
    };
  });
}

function chooseBarrier(barriers) {
  const candidates = [];
  barriers.forEach((row) => {
    if (row.overPercent >= 58 && row.overPercent <= 82) candidates.push({ barrier: row.barrier, direction: "OVER", percent: row.overPercent });
    if (row.underPercent >= 58 && row.underPercent <= 82) candidates.push({ barrier: row.barrier, direction: "UNDER", percent: row.underPercent });
  });
  return candidates.sort((a, b) => b.percent - a.percent)[0] || null;
}

export function analyzeDigitIntelligence(digits = []) {
  const clean = digits.filter((d) => Number.isInteger(d) && d >= 0 && d <= 9);
  const windows = WINDOWS.map((size) => windowStats(clean, size));
  const usable = windows.filter((row) => row.count >= Math.min(row.size, 20));
  const short = windows[0];
  const medium = windows[2];
  const long = windows[4];

  const parityVotes = usable.slice(0, 5).map((w) => w.evenPercent >= w.oddPercent ? "EVEN" : "ODD");
  const evenVotes = parityVotes.filter((x) => x === "EVEN").length;
  const oddVotes = parityVotes.length - evenVotes;
  const parityDirection = evenVotes >= oddVotes ? "EVEN" : "ODD";
  const parityAgreement = parityVotes.length ? Math.max(evenVotes, oddVotes) / parityVotes.length : 0;
  const parityEdge = short ? Math.abs(short.evenPercent - short.oddPercent) : 0;
  const parityConfidence = Math.round(clamp(50 + parityEdge * 0.9 + parityAgreement * 18, 0, 100));

  const trigger = triggerCandidate(clean, parityDirection);
  const barriers = overUnderBarriers(clean);
  const barrierCandidate = chooseBarrier(barriers);
  const transitions = transitionMatrix(clean.slice(-250));
  const lastDigit = clean.at(-1) ?? null;
  const nextCounts = lastDigit === null ? [] : transitions[lastDigit];
  const nextTotal = nextCounts?.reduce((a, b) => a + b, 0) || 0;
  const likelyNextDigit = nextTotal ? nextCounts.indexOf(Math.max(...nextCounts)) : null;

  return {
    count: clean.length,
    windows,
    parity: {
      direction: parityDirection,
      confidence: parityConfidence,
      agreement: parityAgreement,
      shortEven: short?.evenPercent ?? 0,
      shortOdd: short?.oddPercent ?? 0,
      mediumEven: medium?.evenPercent ?? 0,
      mediumOdd: medium?.oddPercent ?? 0,
      longEven: long?.evenPercent ?? 0,
      longOdd: long?.oddPercent ?? 0,
      currentStreak: streak(clean, (d) => parityDirection === "EVEN" ? d % 2 === 0 : d % 2 !== 0),
      trigger
    },
    overUnder: {
      barriers,
      candidate: barrierCandidate
    },
    transitions: {
      lastDigit,
      likelyNextDigit,
      sampleTransitions: nextTotal,
      probability: likelyNextDigit === null ? 0 : pct(nextCounts[likelyNextDigit], nextTotal)
    },
    distribution: windows.find((w) => w.size === 100) || windows[0]
  };
}
