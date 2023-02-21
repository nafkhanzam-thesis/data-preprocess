import {BatchKey, BatchValue, Client} from "./base.js";
import {dataSources, splits} from "./data.js";

export const sourceTypes = ["original", "alternative"] as const;

export type DatasetKey = {
  data_source: (typeof dataSources)[number];
  split: (typeof splits)[number];
  source_type: (typeof sourceTypes)[number];
  idx: number;
};

export type Dataset = {
  amr?: string | undefined;
  amr_dfs?: string | undefined;
  en?: string | undefined;
  id?: string | undefined;
  labse_distance?: number | undefined;
  back_bleu?: number | undefined;
};

export type DatasetBatchValue = BatchValue<DatasetKey, Dataset>;
export type DatasetBatchKey = BatchKey<DatasetKey>;

export const datasetColumns: readonly [keyof Dataset, ...(keyof Dataset)[]] = [
  "amr",
  "amr_dfs",
  "en",
  "id",
  "labse_distance",
  "back_bleu",
] as const;

export class DatasetClient extends Client<DatasetKey, Dataset> {}

export const datasetDb = new DatasetClient(`dataset`);
