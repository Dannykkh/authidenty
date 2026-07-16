const wordPattern = /[a-z0-9]+(?:['’-][a-z0-9]+)*/gi;
const contractionPattern = /\b[a-z]+(?:['’](?:d|ll|m|re|s|t|ve))\b/gi;
const firstPersonPattern = /\b(?:i|i'd|i'll|i'm|i've|me|my|mine)\b/gi;
const hedgePattern =
  /\b(?:honestly|usually|maybe|probably|personally|roughly|generally|i think)\b/gi;
const connectorPattern =
  /\b(?:because|but|then|so|once|first|second|finally|instead)\b/gi;

const metricWeights = {
  averageWords: 0.08,
  averageWordLength: 0.08,
  commaRate: 0.07,
  exclamationRate: 0.08,
  lowercaseStartRate: 0.16,
  contractionRate: 0.12,
  firstPersonRate: 0.16,
  hedgeRate: 0.13,
  connectorRate: 0.12,
} as const;

export type StyleMetrics = Record<keyof typeof metricWeights, number>;

export type StyleVector = {
  version: "style-v1";
  sampleCount: number;
  metrics: StyleMetrics;
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function occurrences(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function startsWithLowercase(value: string) {
  const firstLetter = value.match(/[a-z]/i)?.[0];
  return firstLetter ? firstLetter === firstLetter.toLowerCase() : false;
}

export function extractStyleVector(answers: string[]): StyleVector {
  if (
    answers.length < 3 ||
    answers.length > 6 ||
    answers.some((answer) => {
      const length = answer.trim().length;
      return length < 10 || length > 500;
    })
  ) {
    throw new Error("Provide three to six substantial answers.");
  }

  const normalizedAnswers = answers.map((answer) => answer.trim());
  const combined = normalizedAnswers.join(" ");
  const words = combined.match(wordPattern) ?? [];
  const totalWords = Math.max(1, words.length);
  const averageWords = totalWords / normalizedAnswers.length;
  const averageWordLength =
    words.reduce((sum, word) => sum + word.length, 0) / totalWords;

  return {
    version: "style-v1",
    sampleCount: normalizedAnswers.length,
    metrics: {
      averageWords: clamp(averageWords / 25),
      averageWordLength: clamp(averageWordLength / 8),
      commaRate: clamp(occurrences(combined, /,/g) / normalizedAnswers.length / 3),
      exclamationRate: clamp(
        occurrences(combined, /!/g) / normalizedAnswers.length / 2,
      ),
      lowercaseStartRate:
        normalizedAnswers.filter(startsWithLowercase).length /
        normalizedAnswers.length,
      contractionRate: clamp(
        (occurrences(combined, contractionPattern) / totalWords) * 20,
      ),
      firstPersonRate: clamp(
        (occurrences(combined, firstPersonPattern) / totalWords) * 10,
      ),
      hedgeRate: clamp(
        (occurrences(combined, hedgePattern) / totalWords) * 10,
      ),
      connectorRate: clamp(
        (occurrences(combined, connectorPattern) / totalWords) * 8,
      ),
    },
  };
}

export function compareStyleVectors(
  enrolled: StyleVector,
  candidate: StyleVector,
) {
  if (
    enrolled.version !== "style-v1" ||
    candidate.version !== "style-v1"
  ) {
    return 0;
  }

  const distance = Object.entries(metricWeights).reduce(
    (total, [metric, weight]) =>
      total +
      Math.abs(
        enrolled.metrics[metric as keyof StyleMetrics] -
          candidate.metrics[metric as keyof StyleMetrics],
      ) *
        weight,
    0,
  );

  return clamp(1 - distance);
}
