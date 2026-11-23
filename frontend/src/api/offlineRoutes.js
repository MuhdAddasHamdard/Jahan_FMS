const classEntry = /^\/classes\/\d+\/(materials|schedules)(?:\/\d+)?$/;
const entry = /^\/(students|classes|staff|refunds|expenses|fees\/(types|plans|receipts)|salaries\/(rates|payments))\/\d+$/;
const collection = /^\/(students|classes|staff|refunds|expenses|fees\/(types|plans|payments)|salaries\/(rates|payments))$/;

export const canQueueChange = (method, path) =>
  (method === "POST" && collection.test(path)) ||
  (method === "PATCH" && path === "/settings/institute") ||
  (method === "POST" ? classEntry.test(path) && !/\/\d+$/.test(path) :
    entry.test(path) || (classEntry.test(path) && /\/\d+$/.test(path)));

// Use the revision associated with the data shown in the editing form.
export const revisionPaths = (path) => {
  if (path === "/fees/payments") return ["/fees/plans"];
  if (path === "/refunds") return ["/fees/receipts", "/refunds"];
  if (path === "/salaries/payments") return ["/salaries/payments", "/salaries/rates"];
  if (classEntry.test(path)) return [path.split("/").slice(0, 3).join("/")];
  return [path, path.replace(/\/\d+$/, "")];
};

export const requiresRevision = (method, path) =>
  method !== "POST" || ["/fees/payments", "/refunds", "/salaries/payments"].includes(path);

const dateFields = {
  "/expenses": "paidOn",
  "/fees/payments": "date",
  "/refunds": "refundedOn",
  "/salaries/payments": "paidOn",
};

export const keepEntryDate = (method, path, body) => {
  const field = dateFields[path];
  if (method !== "POST" || !field || body?.[field]) return body;
  return { ...body, [field]: new Date().toISOString() };
};
