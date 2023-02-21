import {Command} from "@oclif/core";
import {AMRDataset, DataCategory, totalEstimations} from "../constants";
import {mapCategoryToSplit} from "../db/data";
import {DatasetBatchKey, datasetDb} from "../db/dataset";
import {tqdmAsync} from "../tqdm";

export default class _Command extends Command {
  async run(): Promise<void> {
    const comb: [AMRDataset, DataCategory][] = [
      [AMRDataset.AMR2, DataCategory.TEST],
      // [AMRDataset.IWSLT17, DataCategory.TRAIN],
      // [AMRDataset.PANL_BPPT, DataCategory.TRAIN],
      [AMRDataset.AMR3, DataCategory.TRAIN],
      [AMRDataset.AMR3, DataCategory.DEV],
    ];

    const fetchSize = 2000;

    for (const [dataset, category] of comb) {
      const source_type = "original";

      const fetchGen = datasetDb.batchSelect(
        {
          data_source: dataset,
          split: mapCategoryToSplit(category),
          source_type,
        },
        ["id"],
        fetchSize,
      );
      const estimation = totalEstimations[`${dataset}-${category}`] ?? 0;
      const iter = tqdmAsync(fetchGen, estimation, {
        suffix: (v) =>
          `${v.dataKey.data_source}-${v.dataKey.split}-${v.dataKey.idx}`,
      });

      let counter = 0;
      const batchDeleteQueries: DatasetBatchKey[] = [];
      for await (const {dataKey, data} of iter) {
        if (data.id === null) {
          ++counter;
          batchDeleteQueries.push({
            dataKey: {
              ...dataKey,
              source_type,
            },
          });
        }
      }

      if (batchDeleteQueries.length > 0) {
        await datasetDb.batchDelete(batchDeleteQueries);
      }

      console.log(`${dataset}-${category}-${source_type}: ${counter}`);
    }
  }
}
