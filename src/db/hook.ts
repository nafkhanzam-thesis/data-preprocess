import {Hook} from "@oclif/core";
import {Client} from "./base";

const hook: Hook<"postrun"> = async function () {
  await Client.destroy();
};

export default hook;
