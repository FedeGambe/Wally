import {
  TARGET_PRIMARIE,
  TARGET_SECONDARIE,
  TARGET_INVESTIMENTI,
  TARGET_RISPARMIO,
  TARGET_NETTO,
} from "../config/targets";

const normalize = (value: string) => value.toLowerCase().trim();

const findHeaderIndex = (
  headers: string[],
  target: number,
  keyword: string,
  fallback: number
) => {
  // 1. Cerca il numero (35 o 35%)
  const targetStr = String(target);

  let index = headers.findIndex((h) => {
    const text = normalize(h).replace("%", "");
    return text === targetStr;
  });

  if (index >= 0) {
    return index;
  }

  // 2. Cerca la keyword e usa l'elemento successivo
  index = headers.findIndex((h) => normalize(h).includes(keyword));

  if (index >= 0 && index + 1 < headers.length) {
    return index + 1;
  }

  // 3. Fallback
  return fallback;
};


const parseThreshold = (headerString: string, fallback: number): number => {
  if (!headerString) return fallback;
  const pctMatch = headerString.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pctMatch) {
    return parseFloat(pctMatch[1].replace(',', '.'));
  }
  const numMatch = headerString.match(/(\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1].replace(',', '.'));
  }
  return fallback;
};

export const getThresholds = (headers: string[]) => {
  const primarieIndex = findHeaderIndex(
    headers,
    TARGET_PRIMARIE,
    "prim",
    4
  );

  const secondarieIndex = findHeaderIndex(
    headers,
    TARGET_SECONDARIE,
    "sec",
    6
  );

  const investitiIndex = findHeaderIndex(
    headers,
    TARGET_INVESTIMENTI,
    "invest",
    9
  );

  const risparmioIndex = findHeaderIndex(
    headers,
    TARGET_RISPARMIO,
    "risp",
    headers[11] ? 11 : 10
  );

  const nettoIndex = findHeaderIndex(
    headers,
    TARGET_NETTO,
    "netto",
    headers[13] ? 13 : 12
  );

  return {
    primarie: parseThreshold(headers[primarieIndex], TARGET_PRIMARIE),
    secondarie: parseThreshold(headers[secondarieIndex], TARGET_SECONDARIE),
    investiti: parseThreshold(headers[investitiIndex], TARGET_INVESTIMENTI),
    risparmio: parseThreshold(headers[risparmioIndex], TARGET_RISPARMIO),
    totali: parseThreshold(headers[nettoIndex], TARGET_NETTO),
  };
};