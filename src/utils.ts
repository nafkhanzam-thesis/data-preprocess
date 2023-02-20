import {fs} from "./lib";

function cartesianProduct<T extends unknown[]>(...allEntries: unknown[][]): T {
  // @ts-expect-error idc
  return allEntries.reduce(
    (results, entries) =>
      results
        // @ts-expect-error idc
        .map((result) => entries.map((entry) => [...result, entry]))
        .reduce((subResults, result) => [...subResults, ...result], []),
    [[]],
  );
}

export function readCleanedLines(
  filePath: string,
  ignoreEmpty = true,
  ignoreEmptyLast = true,
): string[] {
  return String(fs.readFileSync(filePath))
    .split("\n")
    .map((v) => v.trim())
    .filter(
      (v, i, a) =>
        (!ignoreEmpty || v) && (!ignoreEmptyLast || i < a.length - 1 || v),
    );
}

export function writeCleanLines(
  filePath: string,
  data: string[],
  filterEmpty = true,
): void {
  fs.writeFileSync(
    filePath,
    data
      .map((v) => v.trim())
      .filter((v) => !filterEmpty || v)
      .join("\n"),
  );
}

export const utils = {cartesianProduct, readCleanedLines, writeCleanLines};
