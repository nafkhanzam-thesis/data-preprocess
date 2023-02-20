import {Command} from "@oclif/core";
import {AMRDataset, DataCategory, totalEstimations} from "../../constants";
import {dataDb, mapCategoryToSplit} from "../../db/data";
import {DatasetBatchValue, datasetDb, sourceTypes} from "../../db/dataset";
import {tqdmAsync} from "../../tqdm";

export default class _Command extends Command {
  async run(): Promise<void> {
    const comb: [AMRDataset, DataCategory][] = [
      // [AMRDataset.AMR2, DataCategory.TEST],
      [AMRDataset.AMR3, DataCategory.TRAIN],
      [AMRDataset.AMR3, DataCategory.DEV],
    ];

    const fetchSize = 2000;

    for (const [dataset, category] of comb) {
      const fetchGen = dataDb.batchSelect(
        {
          data_source: dataset,
          split: mapCategoryToSplit(category),
        },
        ["amr"],
        fetchSize,
      );
      const estimation = totalEstimations[`${dataset}-${category}`] ?? 0;
      const iter = tqdmAsync(fetchGen, estimation, {
        suffix: (v) =>
          `${v.dataKey.data_source}-${v.dataKey.split}-${v.dataKey.idx}`,
      });
      const batchValues: DatasetBatchValue[] = [];
      for await (const {dataKey, data} of iter) {
        for (const source_type of sourceTypes) {
          batchValues.push({
            dataKey: {
              ...dataKey,
              source_type,
            },
            data: {
              amr: data.amr,
            },
          });
        }
        if (batchValues.length >= fetchSize) {
          await datasetDb.batchUpdate(batchValues);
          batchValues.length = 0;
        }
      }

      if (batchValues.length > 0) {
        await datasetDb.batchUpdate(batchValues);
      }
    }
  }
}
