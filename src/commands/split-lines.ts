import {Command, Flags} from "@oclif/core";
import {fs} from "../lib";
import {utils} from "../utils";

export default class _Command extends Command {
  static override flags = {
    inputFile: Flags.string({char: "i", required: true}),
    outputDir: Flags.string({char: "o", required: true}),
    splitCount: Flags.integer({char: "c", required: true}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(_Command);
    fs.ensureDirSync(flags.outputDir);

    await utils.splitFileInto({
      inputFile: flags.inputFile,
      outputDir: flags.outputDir,
      splitCount: flags.splitCount,
    });
  }
}
