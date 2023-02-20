import cassandra from "cassandra-driver";
import {env} from "../env.js";

export type BatchValue<K, D> = {dataKey: K; data: D};

export class Client<
  K extends {idx: number; [k: string]: unknown},
  D extends {[k: string]: unknown},
> {
  static MAX_CHUNK = (1 << 16) - 2;
  private static _client?: cassandra.Client;
  static get instance(): cassandra.Client {
    if (!this._client) {
      this._client = new cassandra.Client({
        contactPoints: [env.SCYLLA_DB_HOST],
        localDataCenter: "datacenter1",
        keyspace: env.SCYLLA_DB_KEYSPACE,
        credentials: {
          username: env.SCYLLA_DB_USER,
          password: env.SCYLLA_DB_PASSWORD,
        },
      });
    }
    return this._client;
  }

  static async destroy(): Promise<void> {
    await this._client?.shutdown();
  }

  constructor(private table: string) {}

  async update(dataKey: K, data: D): Promise<void> {
    const {updateTemplate, values} = this.createUpdateQuery({dataKey, data});
    await Client.instance.execute(updateTemplate, values, {prepare: true});
  }

  async batchUpdate(dataList: BatchValue<K, D>[]): Promise<void> {
    const queries = dataList
      .map((batchValue) => this.createUpdateQuery(batchValue))
      .map(({updateTemplate, values}) => ({
        query: updateTemplate,
        params: values,
      }));
    await Client.instance.batch(queries, {prepare: true});
  }

  async selectFirst(
    dataKey: K,
    selects: (keyof D)[],
  ): Promise<{dataKey: K; data: D} | null> {
    const selectTemplate = `SELECT ${selects.join(",")} FROM ${
      this.table
    } WHERE ${Object.entries(dataKey)
      .map(([key]) => `${key}=?`)
      .join(" AND ")}`;

    const resultSet = await Client.instance.execute(
      selectTemplate,
      Object.values(dataKey),
      {
        prepare: true,
        fetchSize: 1,
      },
    );

    const row = resultSet.first();
    if (!row) {
      return null;
    }
    const data: D = {} as D;
    for (const col of selects) {
      data[col] = row.get(String(col));
    }
    return {
      dataKey,
      data,
    };
  }

  async *batchSelect(
    dataKey: Omit<K, "idx">,
    selects: (keyof D)[],
    fetchSize: number,
  ): AsyncGenerator<{dataKey: K; data: D}> {
    const selectTemplate = `SELECT idx,${selects.join(",")} FROM ${
      this.table
    } WHERE ${Object.entries(dataKey)
      .map(([key]) => `${key}=?`)
      .join(" AND ")}`;
    const resultSet = await Client.instance.execute(
      selectTemplate,
      Object.values(dataKey),
      {
        prepare: true,
        fetchSize,
      },
    );

    for await (const row of resultSet) {
      const rowDataKey: K = {
        ...dataKey,
        idx: row.get("idx"),
      } as K;
      const data: D = {} as D;
      for (const col of selects) {
        data[col] = row.get(String(col));
      }
      yield {
        dataKey: rowDataKey,
        data,
      };
    }
  }

  async count(dataKey: Omit<K, "idx">): Promise<number> {
    const res = await Client.instance.execute(
      `SELECT COUNT(*) FROM ${this.table} WHERE ${Object.entries(dataKey)
        .map(([key]) => `${key}=?`)
        .join(" AND ")}`,
      Object.values(dataKey),
    );
    return res.first().get(0);
  }

  private createUpdateQuery({dataKey, data}: BatchValue<K, D>): {
    updateTemplate: string;
    values: cassandra.ArrayOrObject;
  } {
    const dataEntries = Object.entries(data);
    const setTemplate = dataEntries.map(([key]) => `${key}=?`).join(",");

    const dataKeyEntries = Object.entries(dataKey);
    const whereTemplate = dataKeyEntries
      .map(([key]) => `${key}=?`)
      .join(" AND ");

    const values = [
      ...dataEntries.map(([_, v]) => v),
      ...dataKeyEntries.map(([_, v]) => v),
    ];
    const updateTemplate = `UPDATE ${this.table} SET ${setTemplate} WHERE ${whereTemplate}`;
    return {updateTemplate, values};
  }
}
