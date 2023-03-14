import {Command, Flags} from "@oclif/core";
import {fs} from "../lib";
import {utils} from "../utils";

export default class _Command extends Command {
  static override flags = {
    regex: Flags.string({char: "r", required: true}),
    outputFile: Flags.string({char: "o", required: true}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(_Command);

    await utils.mergeFilesInto({
      regex: flags.regex,
      outputFile: flags.outputFile,
    });
  }
}
