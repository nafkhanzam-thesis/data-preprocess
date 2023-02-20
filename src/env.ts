import {Hook} from "@oclif/core";
import {dotenv, zod} from "./lib.js";

const envValidators = zod.object({
  SCYLLA_DB_HOST: zod.string(),
  SCYLLA_DB_USER: zod.string(),
  SCYLLA_DB_PASSWORD: zod.string(),
  SCYLLA_DB_KEYSPACE: zod.string(),
  SCYLLA_DB_TABLE: zod.string(),
});

export type Env = zod.infer<typeof envValidators>;

export let env: Env;

const hook: Hook<"init"> = async function () {
  dotenv.config();
  env = envValidators.parse(process.env);
};

export default hook;
