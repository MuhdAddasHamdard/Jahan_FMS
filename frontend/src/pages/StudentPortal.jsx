import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import { formatNumber, formatDate, formatDateTime } from "../utils/format";

const statusClass = (status) => {
  const styles = {
    PAID: "bg-teal-50 text-teal-700",
    PARTIAL: "bg-amber-50 text-amber-700",
    PENDING: "bg-slate-100 text-slate-600",
    ACTIVE: "bg-teal-50 text-teal-700",
  };
  return styles[status] ?? "bg-slate-100 text-slate-600";
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TOTALS = [
  { key: "totalPaid", label: "Fees paid", accent: "text-teal-700" },
  { key: "outstandingDues", label: "Outstanding dues", accent: "text-amber-700" },
  { key: "totalRefunded", label: "Refunds received", accent: "text-red-600" },
];

const StudentPortal = () => {
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/students/me")
      .then((data) => {
        if (!cancelled) {
          setPortal(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (!portal?.student) {
    return (
      <Alert
        type="info"
        message="Your account is not linked to a student record yet. Ask your institute to link your login."
      />
    );
  }

  const { student, class: classInfo, feePlans, refunds, totals } = portal;
  const openPlans = feePlans.filter((plan) => plan.status !== "PAID");
  const receipts = feePlans
    .flatMap((plan) =>
      plan.installments
        .map((installment) => installment.receipt)
        .filter((receipt) => Boolean(receipt)),
    )
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

  return (
    <div>
      <PageHeader
        title={`Welcome, ${student.name}`}
        description="Your fees, receipts, refunds and class information."
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Admission:</span>{" "}
              {student.admissionNo}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Status:</span>{" "}
              {student.status}
            </p>
            {classInfo && (
              <>
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Class:</span>{" "}
                  {classInfo.name}
                  {classInfo.section ? ` - Section ${classInfo.section}` : ""}
                </p>
                {classInfo.teacher && (
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">Teacher:</span>{" "}
                    {classInfo.teacher.name}
                  </p>
                )}
              </>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(student.status)}`}
          >
            {student.status}
          </span>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TOTALS.map((total) => (
          <div
            key={total.key}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {total.label}
            </p>
            <p className={`mt-2 text-2xl font-bold ${total.accent}`}>
              {formatNumber(totals?.[total.key] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {classInfo && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Class details</h2>
            </div>
            <div className="space-y-5 px-5 py-4">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Schedule
                </h3>
                {classInfo.schedules?.length === 0 ? (
                  <p className="text-sm text-slate-400">No schedule published.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {classInfo.schedules.map((schedule) => (
                      <li
                        key={schedule.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {DAYS[schedule.dayOfWeek] ?? `Day ${schedule.dayOfWeek}`}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {schedule.startTime} - {schedule.endTime}
                            {schedule.room ? ` · ${schedule.room}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Course materials
                </h3>
                {classInfo.materials?.length === 0 ? (
                  <p className="text-sm text-slate-400">No materials published.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {classInfo.materials.map((material) => (
                      <li key={material.id} className="px-3 py-2">
                        <p className="text-xs font-medium text-slate-700">
                          {material.title}
                        </p>
                        {material.description && (
                          <p className="text-[11px] text-slate-400">
                            {material.description}
                          </p>
                        )}
                        {material.link && (
                          <a
                            href={material.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-semibold text-teal-600 hover:underline"
                          >
                            Open material
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Your fee plans</h2>
          </div>
          {openPlans.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              You have no outstanding dues. Nice work!
            </p>
          ) : (
            <div className="space-y-3 px-5 py-4">
              {openPlans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {plan.feeType.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Total {formatNumber(plan.totalAmount)} · Paid{" "}
                        {formatNumber(plan.paidAmount)} · Balance{" "}
                        {formatNumber(plan.balance)}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(plan.status)}`}
                    >
                      {plan.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {plan.installments.map((installment) => (
                      <div
                        key={installment.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {formatNumber(installment.amount)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Due {formatDate(installment.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-900">
                            Paid {formatNumber(installment.paidAmount)}
                          </p>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusClass(installment.status)}`}
                          >
                            {installment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400">
                Payments are collected at the institute's accounts office.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Receipts</h2>
          </div>
          {receipts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No receipts yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {receipts.map((receipt) => (
                <li
                  key={receipt.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-teal-700">{receipt.number}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatDateTime(receipt.paidAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatNumber(receipt.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Refunds</h2>
          </div>
          {refunds.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No refunds.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {refunds.map((refund) => (
                <li
                  key={refund.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {refund.reason || "Refund"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(refund.refundedOn)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {formatNumber(refund.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;