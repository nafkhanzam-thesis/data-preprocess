import {Command, Flags} from "@oclif/core";
import {datasetDb, DatasetKey} from "../db/dataset";
import {fs, path} from "../lib";
import {tqdmAsync} from "../tqdm";
import {writeCleanLines} from "../utils";

export default class _Command extends Command {
  static override flags = {
    fetchSize: Flags.integer({
      description: `Fetch size of batch data.`,
      default: 5000,
    }),
    outputDir: Flags.string({
      description: `The output files directory.`,
      default: `data/outputs/amrbart-tnp`,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(_Command);
    fs.ensureDirSync(flags.outputDir);

    const dataKey: Omit<DatasetKey, "idx"> = {
      data_source: "LDC2017",
      split: "test",
      source_type: "original",
    };

    const results: string[] = [];

    const fetchSize = flags.fetchSize;

    const fetchGen = datasetDb.batchSelect(dataKey, ["id"], fetchSize);

    const count = await datasetDb.count(dataKey);
    if (!count) {
      throw new Error(`No data found!`);
    }
    const iter = tqdmAsync(fetchGen, count, {
      suffix: (v) =>
        `${v.dataKey.data_source} ${v.dataKey.split} ${v.dataKey.source_type} ${v.dataKey.idx}`,
    });

    for await (const {dataKey, data} of iter) {
      if (!data.id) {
        console.error(`id is null on: ${JSON.stringify(dataKey)}`);
        continue;
      }
      results.push(data.id);
    }

    writeCleanLines(path.join(flags.outputDir, `LDC2017-test.id`), results);
  }
}
