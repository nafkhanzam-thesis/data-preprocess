export enum DataCategory {
  TRAIN = "training",
  DEV = "dev",
  TEST = "test",
}

export enum AMRDataset {
  AMR2 = "LDC2017",
  AMR3 = "LDC2020",
  PANL_BPPT = "PANL-BPPT",
  IWSLT17 = "IWSLT17",
}

export const totalEstimations: Partial<
  Record<`${AMRDataset}-${DataCategory}`, number>
> = {
  "PANL-BPPT-training": 24024,
  "IWSLT17-training": 107329,
  "LDC2020-training": 55635,
  "LDC2020-dev": 1722,
  "LDC2017-test": 1371,
};
