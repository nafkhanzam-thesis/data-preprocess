import {Command} from "@oclif/core";
import assert from "assert";
import {commons} from "../../commons";
import {AMRDataset, DataCategory} from "../../constants";
import {dataDb, mapCategoryToSplit} from "../../db/data";
import {AMR, globby, path, printDiff} from "../../lib";
import {tqdmIterable} from "../../tqdm";

export default class _Command extends Command {
  async run(): Promise<void> {
    const comb: [AMRDataset, DataCategory, string[] | undefined][] = [
      // [
      //   AMRDataset.AMR2,
      //   DataCategory.TEST,
      //   ["consensus", "xinhua", "dfa", "proxy", "bolt"],
      // ],
      [
        AMRDataset.AMR3,
        DataCategory.TRAIN,
        [
          "wiki",
          "cctv",
          "wb",
          "guidelines",
          "proxy",
          "mt09sdl",
          "dfb",
          "xinhua",
          "bolt",
          "dfa",
          "lorelei",
          "fables",
        ],
      ],
      // [
      //   AMRDataset.AMR3,
      //   DataCategory.DEV,
      //   ["xinhua", "proxy", "lorelei", "dfa", "bolt", "consensus"],
      // ],
    ];

    for (const [dataset, category, orders] of comb) {
      const filePathList = await globby(
        path.join(
          commons.ORIGINAL_DIRECTORY,
          String(dataset),
          `data/amrs/split`,
          String(category),
          `*.txt`,
        ),
      );

      if (orders) {
        filePathList.sort(
          (a, b) =>
            orders.findIndex((v) => a.includes(v)) -
            orders.findIndex((v) => b.includes(v)),
        );
      }

      const amrss: AMR[][] = await Promise.all(
        filePathList.map((filePath) =>
          AMR.fromFile(filePath).catch((err: unknown) => {
            console.error(`Error while reading ${filePath}.`);
            throw err;
          }),
        ),
      );

      const amrs = amrss.flat();

      const iter = tqdmIterable(amrs.entries(), amrs.length, {
        suffix: ([idx]) => `${dataset}-${category}-${idx}/${amrs.length}`,
      });

      for (const [idx, amr] of iter) {
        const iterationInfo = JSON.stringify({dataset, category, idx});

        const result = await dataDb.selectFirst(
          {data_source: dataset, split: mapCategoryToSplit(category), idx},
          ["amr", "en"],
        );

        if (!result) {
          throw new Error(`Data not found! [${iterationInfo}]`);
        }

        const {dataKey, data} = result;

        const en = data.en;
        let snt = amr.metadata.get("snt");

        if (data.amr) {
          continue;
        }
        assert(typeof en === "string");
        assert(typeof snt === "string");
        snt = snt
          .replace(/(<[^ ]?([^>]+)>)/gi, "")
          .replace(/(&quot;)/g, `"`)
          .trim();
        if (en !== snt) {
          console.log();
          printDiff.printUnifiedDiff(en, snt);
          throw new Error(`Sentence different on: ${iterationInfo}`);
        }

        await dataDb.update(dataKey, {amr: amr.linearizedAmr});
      }
    }
  }
}
