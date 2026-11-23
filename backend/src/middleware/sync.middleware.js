import { createHash, randomUUID } from "node:crypto";
import prisma, { inMutationTransaction } from "../prisma";

const scopes = {
  classes: "classes",
  students: "student-finance",
  fees: "student-finance",
  refunds: "student-finance",
  staff: "payroll",
  salaries: "payroll",
  "salary-payments": "payroll",
  expenses: "expenses",
  settings: "settings",
};

const moduleFor = (req) => req.baseUrl.split("/").at(-1);
const pathFor = (req) => `/${moduleFor(req)}${req.path}`.replace(/\/$/, "");
const scopeFor = (req) => scopes[moduleFor(req)];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export const syncReadRevision = async (req, res) => {
  if (req.method !== "GET") return;
  const scope = scopeFor(req);
  if (!scope) return;

  // Read the revision before the controller reads its data. An intervening write
  // can cause a conservative conflict without letting a stale edit overwrite it.
  const latest = await prisma.syncMutation.findFirst({
    where: { scope },
    orderBy: { revision: "desc" },
    select: { revision: true },
  });
  res.set("X-Sync-Revision", String(latest?.revision ?? 0n));
};

class RollbackResponse extends Error {
  constructor(status, body) {
    super("Mutation rejected");
    this.status = status;
    this.body = body;
  }
}

const send = (res, { status, body }) =>
  status === 204 ? res.status(status).send() : res.status(status).json(body);

export const syncMutation = (controller) => async (req, res, next) => {
  const key = req.get("X-Sync-Operation");
  const deviceId = req.get("X-Sync-Device") || null;
  const base = req.get("X-Sync-Revision");
  if ((key && (!uuid.test(key) || !uuid.test(deviceId ?? ""))) ||
      (base !== undefined && (!key || !/^\d{1,18}$/.test(base)))) {
    return res.status(400).json({ message: "Invalid offline sync headers." });
  }

  const actorId = req.user.id;
  const operationId = key ?? randomUUID();
  const scope = scopeFor(req);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([req.method, pathFor(req), req.body ?? null]))
    .digest("hex");

  try {
    const result = await inMutationTransaction(async (tx) => {
      // Serialize revision checks and writes for each group of related records.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scope})::bigint)`;
      if (key) {
        const prior = await tx.syncMutation.findUnique({
          where: { actorId_operationId: { actorId, operationId } },
        });
        if (prior) {
          if (prior.fingerprint !== fingerprint || prior.deviceId !== deviceId) {
            throw new RollbackResponse(409, { message: "This sync ID already belongs to a different change." });
          }
          return { status: prior.status, body: prior.response, replay: true };
        }
        if (base !== undefined) {
          const changed = await tx.syncMutation.findFirst({
            where: {
              scope,
              revision: { gt: BigInt(base) },
              OR: [{ deviceId: null }, { deviceId: { not: deviceId } }],
            },
            select: { revision: true },
          });
          if (changed) {
            throw new RollbackResponse(409, {
              message: "Related records changed since this device downloaded them. Review the latest records and enter this change again.",
            });
          }
        }
      }

      // Controllers use only status/json/send for these routes. Send the result
      // to Express only after the mutation and its receipt have both committed.
      let status = 200;
      let body;
      const reply = {
        status(code) { status = code; return reply; },
        json(value) { body = value; return reply; },
        send(value) { body = value; return reply; },
      };
      await controller(req, reply);
      if (status >= 400) throw new RollbackResponse(status, body);

      await tx.syncMutation.create({
        data: {
          actorId, operationId, deviceId, scope, fingerprint, status,
          ...(key && body !== undefined ? { response: JSON.parse(JSON.stringify(body)) } : {}),
        },
      });
      return { status, body };
    });
    res.locals.syncReplay = result.replay;
    return send(res, result);
  } catch (error) {
    if (error instanceof RollbackResponse) return send(res, error);
    return next(error);
  }
};
