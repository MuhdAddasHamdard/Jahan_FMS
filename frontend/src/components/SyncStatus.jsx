import { useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import {
  acknowledgeSync, discardFailedChange, getSyncStatus, retrySync, subscribeSync,
} from "../api/client";

const recordNames = {
  classes: "Class",
  expenses: "Expense",
  "fees/types": "Fee type",
  "fees/plans": "Fee plan",
  "fees/payments": "Fee payment",
  "fees/receipts": "Receipt",
  refunds: "Refund",
  "salaries/rates": "Salary rate",
  "salaries/payments": "Salary payment",
  "settings/institute": "Institute profile",
  staff: "Staff member",
  students: "Student",
};

const describe = ({ method, path, body }) => {
  const parts = path.split("/").filter(Boolean);
  const record = parts[2] === "schedules" ? "Class schedule" : parts[2] === "materials"
    ? "Class material" : recordNames[parts.filter((part) => !/^\d+$/.test(part)).join("/")];
  const operation = { POST: "Add", PATCH: "Edit", DELETE: "Delete" }[method];
  const subject = body?.name || body?.title || body?.description || body?.admissionNo;
  const id = parts.at(-1);
  return `${operation} ${record.toLowerCase()}${subject ? ` · ${subject}` : /^\d+$/.test(id) ? ` #${id}` : ""}`;
};

const actionClass = "font-semibold text-brand underline underline-offset-2 hover:no-underline disabled:opacity-50";

export default function SyncStatus() {
  const { offline, syncing, changes, uploaded } = useSyncExternalStore(subscribeSync, getSyncStatus);
  const navigate = useNavigate();
  const needsReview = changes.filter((change) => change.error).length;
  const pending = changes.length - needsReview;

  if (!offline && !changes.length && !uploaded) return null;

  const refresh = () => {
    acknowledgeSync();
    navigate(0);
  };

  return (
    <section aria-label="Offline sync" className="mb-4 rounded-xl border border-line bg-surface-1 px-4 py-3 text-sm text-content">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="status">
        {offline && <p><strong>Offline</strong> · Showing downloaded records.</p>}
        {syncing && <p>Syncing saved changes…</p>}
        {pending > 0 && <p>{pending} {pending === 1 ? "change" : "changes"} saved on this device.</p>}
        {needsReview > 0 && <p>{needsReview} {needsReview === 1 ? "change needs" : "changes need"} review.</p>}
        {!offline && pending > 0 && !syncing && (
          <button type="button" className={actionClass} onClick={() => void retrySync()}>Sync now</button>
        )}
        {!offline && uploaded > 0 && (
          <>
            <p>{uploaded} {uploaded === 1 ? "change" : "changes"} synced.</p>
            <button type="button" className={actionClass} onClick={refresh}>Refresh records</button>
          </>
        )}
      </div>
      {changes.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">Saved changes</summary>
          <ul className="mt-2 space-y-2">
            {changes.map((change) => (
              <li key={change.id} className="rounded-md border border-line p-2">
                <p className="font-medium">{describe(change)}</p>
                {change.error ? <p className="text-muted">{change.error}</p> : <p className="text-muted">Waiting to sync</p>}
                {change.body && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs">View saved details</summary>
                    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 break-words text-xs">
                      {Object.entries(change.body).map(([key, value]) => (
                        <div key={key} className="contents">
                          <dt className="capitalize text-muted">{key.replace(/([A-Z])/g, " $1")}</dt>
                          <dd className="min-w-0">{value == null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
                {change.error && (
                  <button type="button" className={`${actionClass} mt-2 text-xs`} onClick={() => void discardFailedChange(change.sequence)}>
                    Discard rejected change
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
