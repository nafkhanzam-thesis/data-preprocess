import IRunOptions from "@open-tech-world/cli-progress-bar/lib/IRunOptions";
import {cliProgressBar} from "./lib";

export interface TqdmOptions<T> {
  prefix?: (v: T) => string;
  suffix?: (v: T) => string;
  skipTo?: number;
}

export function* tqdm<T>(array: T[], opts?: TqdmOptions<T>): Generator<T> {
  const progress = new cliProgressBar.ProgressBar({});

  const total = array.length;
  let value = 0;

  if (opts?.skipTo) {
    value = opts.skipTo;
    array = array.slice(opts.skipTo);
  }

  progress.run({value, total});

  for (const v of array) {
    const o: IRunOptions = {value: value++, total};
    if (opts?.prefix) {
      o.prefix = opts.prefix(v);
    }
    if (opts?.suffix) {
      o.suffix = opts.suffix(v);
    }
    progress.run(o);
    yield v;
  }

  progress.run({value, total});
  progress.stop();
}

export async function* tqdmAsync<T>(
  array: AsyncIterableIterator<T>,
  total: number,
  opts?: TqdmOptions<T>,
): AsyncGenerator<T> {
  const progress = new cliProgressBar.ProgressBar({});

  let value = 0;

  if (opts?.skipTo) {
    value = opts.skipTo;
    let i = opts.skipTo;
    while (i--) {
      await array.next();
    }
  }

  progress.run({value, total});

  for await (const v of array) {
    const o: IRunOptions = {value: value++, total};
    if (opts?.prefix) {
      o.prefix = opts.prefix(v);
    }
    if (opts?.suffix) {
      o.suffix = opts.suffix(v);
    }
    progress.run(o);
    yield v;
  }

  progress.run({value, total});
  progress.stop();
}

export function* tqdmIterable<T>(
  array: IterableIterator<T>,
  total: number,
  opts?: TqdmOptions<T>,
): Generator<T> {
  const progress = new cliProgressBar.ProgressBar({});

  let value = 0;

  if (opts?.skipTo) {
    value = opts.skipTo;
    let i = opts.skipTo;
    while (i--) {
      array.next();
    }
  }

  progress.run({value, total});

  for (const v of array) {
    const o: IRunOptions = {value: value++, total};
    if (opts?.prefix) {
      o.prefix = opts.prefix(v);
    }
    if (opts?.suffix) {
      o.suffix = opts.suffix(v);
    }
    progress.run(o);
    yield v;
  }

  progress.run({value, total});
  progress.stop();
}
