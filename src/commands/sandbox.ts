import {Command} from "@oclif/core";
import {readCleanedLines, utils} from "../utils";

export default class _Command extends Command {
  async run(): Promise<void> {
    const objs: any[] = utils.readJSONLines(
      `data/outputs/amrbart-new/test.jsonl`,
    );

    const lines = readCleanedLines(
      `data/outputs/amrbart-tnp/LDC2017-test.en-trans`,
    );

    for (let i = 0; i < lines.length; ++i) {
      objs[i].lang = "en";
      objs[i].sent = lines[i];
    }

    utils.writeJSONLines(`data/outputs/amrbart-tnp/test.jsonl`, objs);
  }
}
