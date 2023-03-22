import {Command, Flags} from "@oclif/core";
import {datasetDb, DatasetKey, sourceTypes} from "../db/dataset";
import {AMR, fs, path} from "../lib";
import {tqdm, tqdmAsync} from "../tqdm";
import {writeCleanLines} from "../utils";
import amr from "./sync-dataset/amr";

type AMRBARTData = {
  id: string;
  en: string | undefined;
  amr: string;
};
type DatasetType = "pretrain" | "train" | "dev" | "test";
type GoldKey = "val" | "test";

export default class _Command extends Command {
  static override flags = {
    fetchSize: Flags.integer({
      description: `Fetch size of batch data.`,
      default: 5000,
    }),
    outputDir: Flags.string({
      description: `The output files directory.`,
      default: `data/outputs/amrbart-concat`,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(_Command);
    fs.ensureDirSync(flags.outputDir);

    const datasetKeys: {
      dataKey: Omit<DatasetKey, "idx" | "source_type">;
      datasetType: DatasetType;
      goldKey?: GoldKey;
      concat: boolean;
    }[] = [
      {
        datasetType: "pretrain",
        concat: true,
        dataKey: {
          data_source: "IWSLT17",
          split: "train",
        },
      },
      {
        datasetType: "pretrain",
        concat: true,
        dataKey: {
          data_source: "PANL-BPPT",
          split: "train",
        },
      },
      {
        datasetType: "train",
        concat: true,
        dataKey: {
          data_source: "LDC2020",
          split: "train",
        },
      },
      {
        datasetType: "dev",
        concat: false,
        goldKey: "val",
        dataKey: {
          data_source: "LDC2020",
          split: "dev",
        },
      },
      {
        datasetType: "test",
        concat: false,
        goldKey: "test",
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

    const amrs: Record<GoldKey, AMR[]> = {
      val: [],
      test: [],
    };

    const fetchSize = flags.fetchSize;

    for (const {dataKey, datasetType, concat, goldKey} of datasetKeys) {
      for (const source_type of sourceTypes) {
        const datasetKey = {...dataKey, source_type};
        const fetchGen = datasetDb.batchSelect(
          datasetKey,
          ["amr", "amr_dfs", "en", "id"],
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
          if (!data.id) {
            console.error(`id is null on: ${JSON.stringify(dataKey)}`);
            continue;
          }
          if (concat && !data.en) {
            console.error(`en is null on: ${JSON.stringify(dataKey)}`);
            continue;
          }
          results[datasetType].push({
            amr: data.amr_dfs,
            id: data.id,
            en: data.en,
          });
          if (goldKey) {
            if (data.amr) {
              const amr = new AMR(data.amr);
              amr.metadata.set("data_source", dataKey.data_source);
              amr.metadata.set("split", dataKey.split);
              amr.metadata.set("source_type", dataKey.source_type);
              amr.metadata.set("idx", dataKey.idx.toString());
              if (data.en) {
                amr.metadata.set("snt", data.en);
              }
              if (data.id) {
                amr.metadata.set("snt-id", data.id);
              }
              amrs[goldKey].push(amr);
            } else {
              console.error(`amr is null on: ${JSON.stringify(dataKey)}`);
            }
          }
        }
      }
    }

    for (const [datasetType, data] of tqdm(Object.entries(results))) {
      writeCleanLines(
        path.join(flags.outputDir, `${datasetType}.jsonl`),
        data.map((v) => JSON.stringify(v)),
      );
    }

    for (const [goldKey, amrList] of tqdm(Object.entries(amrs))) {
      await AMR.writeAllToFile(
        path.join(flags.outputDir, `${goldKey}-gold.amr`),
        amrList,
      );
    }
  }
}
