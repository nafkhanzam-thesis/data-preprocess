import {Command, Flags} from "@oclif/core";
import {datasetDb, DatasetKey, sourceTypes} from "../db/dataset";
import {fs, path} from "../lib";
import {tqdm, tqdmAsync} from "../tqdm";
import {writeCleanLines} from "../utils";

type AMRBARTData = {sent: string; amr: string; lang: "en" | "id"};
type DatasetType = "pretrain" | "train" | "dev" | "test";

export default class _Command extends Command {
  static override flags = {
    fetchSize: Flags.integer({
      description: `Fetch size of batch data.`,
      default: 5000,
    }),
    outputDir: Flags.string({
      description: `The output files directory.`,
      default: `data/outputs/amrbart`,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(_Command);
    fs.ensureDirSync(flags.outputDir);

    const datasetKeys: {
      dataKey: Omit<DatasetKey, "idx" | "source_type">;
      datasetType: DatasetType;
    }[] = [
      {
        datasetType: "pretrain",
        dataKey: {
          data_source: "IWSLT17",
          split: "train",
        },
      },
      {
        datasetType: "pretrain",
        dataKey: {
          data_source: "PANL-BPPT",
          split: "train",
        },
      },
      {
        datasetType: "train",
        dataKey: {
          data_source: "LDC2020",
          split: "train",
        },
      },
      {
        datasetType: "dev",
        dataKey: {
          data_source: "LDC2020",
          split: "dev",
        },
      },
      {
        datasetType: "test",
        dataKey: {
          data_source: "LDC2017",
          split: "test",
        },
      },
    ];

    const results: Record<DatasetType, AMRBARTData[]> = {
      pretrain: [],
      train: [],
      dev: [],
      test: [],
    };

    const fetchSize = flags.fetchSize;

    for (const {dataKey, datasetType} of datasetKeys) {
      for (const source_type of sourceTypes) {
        const datasetKey = {...dataKey, source_type};
        const fetchGen = datasetDb.batchSelect(
          datasetKey,
          ["amr_dfs", "en", "id"],
          fetchSize,
        );

        const count = await datasetDb.count(datasetKey);
        if (!count) {
          continue;
        }
        const iter = tqdmAsync(fetchGen, count, {
          suffix: (v) =>
            `${v.dataKey.data_source} ${v.dataKey.split} ${v.dataKey.source_type} ${v.dataKey.idx}`,
        });

        for await (const {dataKey, data} of iter) {
          if (!data.amr_dfs) {
            console.error(`amr_dfs is null on: ${JSON.stringify(dataKey)}`);
            continue;
          }
          if (!data.en) {
            console.error(`en is null on: ${JSON.stringify(dataKey)}`);
            continue;
          }
          results[datasetType].push({
            amr: data.amr_dfs,
            sent: data.en,
            lang: "en",
          });
          if (!data.id) {
            console.error(`id is null on: ${JSON.stringify(dataKey)}`);
            continue;
          }
          results[datasetType].push({
            amr: data.amr_dfs,
            sent: data.id,
            lang: "id",
          });
        }
      }
    }

    for (const [datasetType, data] of tqdm(Object.entries(results))) {
      writeCleanLines(
        path.join(flags.outputDir, `${datasetType}.jsonl`),
        data.map((v) => JSON.stringify(v)),
      );
    }
  }
}