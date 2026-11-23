import "dotenv/config";

import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const client = new PrismaClient({
  adapter,
});

const transactionContext = new AsyncLocalStorage();

export const inMutationTransaction = (run) =>
  client.$transaction((tx) => transactionContext.run(tx, () => run(tx)));

const prisma = new Proxy(client, {
  get(target, property) {
    const tx = transactionContext.getStore();
    // Service transactions join the transaction that records the sync result.
    if (tx && property === "$transaction") {
      return (run) => run(tx);
    }
    const owner = tx ?? target;
    const value = Reflect.get(owner, property);
    return typeof value === "function" ? value.bind(owner) : value;
  },
});

export default prisma;
