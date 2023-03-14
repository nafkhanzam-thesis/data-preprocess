import {fs, globby, path} from "./lib";

function cartesianProduct<T extends readonly unknown[]>(
  ...allEntries: (readonly unknown[])[]
): T {
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

export function readJSONLines(filePath: string): unknown[] {
  return readCleanedLines(filePath).map((v) => JSON.parse(v));
}

export function writeJSONLines(filePath: string, data: unknown[]): void {
  writeCleanLines(
    filePath,
    data.map((v) => JSON.stringify(v)),
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

export async function mergeFilesInto(a: {
  regex: string;
  outputFile: string;
}): Promise<string[]> {
  const filePathList: string[] = await globby(a.regex);

  const results: string[] = [];

  for (const filePath of filePathList) {
    results.push(...readCleanedLines(filePath));
  }

  writeCleanLines(a.outputFile, results);

  return results;
}

export async function splitFileInto(a: {
  inputFile: string;
  outputDir: string;
  splitCount: number;
}): Promise<string[]> {
  const tmpFileList: string[] = [];

  const lines = readCleanedLines(a.inputFile);
  let stream: fs.WriteStream | null = null;
  let currBatch = 0;
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    const lastIndex = Math.floor(
      (lines.length / a.splitCount) * (currBatch + 1),
    );
    if (i > lastIndex) {
      ++currBatch;
      if (stream) {
        stream.end();
        await new Promise((resolve, reject) => {
          if (!stream) {
            return reject(new Error(`stream is null.`));
          }
          stream.on("finish", resolve);
          stream.on("close", reject);
        });
        stream = null;
      }
    }
    if (!stream) {
      const tmpFile = path.join(a.outputDir, `${currBatch}.split`);
      tmpFileList.push(tmpFile);
      if (fs.existsSync(tmpFile)) {
        i = lastIndex;
        ++currBatch;
        continue;
      }
      fs.ensureFileSync(tmpFile);
      stream = fs.createWriteStream(tmpFile);
    }
    if (line.length > 0) {
      stream.write(line);
      stream.write("\n");
    }
  }

  return tmpFileList;
}

export const utils = {
  cartesianProduct,
  readCleanedLines,
  readJSONLines,
  writeJSONLines,
  writeCleanLines,
  mergeFilesInto,
  splitFileInto,
};
