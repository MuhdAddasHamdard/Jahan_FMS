import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import { formatCurrency, formatNumber, formatDateTime } from "../utils/format";
import StudentPortal from "./StudentPortal";

const StatCard = ({ label, value, accent = "text-slate-900", hint }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
      {label}
    </p>
    <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
  </div>
);

const TeacherDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/dashboard/teacher")
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
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

  return (
    <div>
      <PageHeader
        title="My classes"
        description="Classes, students and materials you manage."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Classes" value={data.classCount} accent="text-teal-600" />
        <StatCard label="Students" value={data.studentCount} accent="text-teal-600" />
        <StatCard
          label="Materials"
          value={data.materialCount}
          accent="text-teal-600"
        />
      </div>

      {data.classes.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">
            No classes yet. Create your first class from the Classes page.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {data.classes.map((classRecord) => (
            <div
              key={classRecord.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {classRecord.name}
                    {classRecord.section ? ` · ${classRecord.section}` : ""}
                  </p>
                  <p className="text-xs text-slate-400">
                    {classRecord.teacher?.name || "No teacher assigned"}
                  </p>
                </div>
                <span className="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                  {classRecord.studentCount}{" "}
                  {classRecord.studentCount === 1 ? "student" : "students"}
                </span>
              </div>
              {classRecord.materials.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {classRecord.materials.map((material) => (
                    <li
                      key={material.id}
                      className="text-xs text-slate-500"
                    >
                      {material.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isTeacher = role === "TEACHER";
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTeacher) return;
    let cancelled = false;
    const endpoint = isAdmin ? "/dashboard/admin/summary" : "/dashboard/summary";

    api
      .get(endpoint)
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
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
  }, [isAdmin, isTeacher]);

  if (role === "STUDENT") {
    return <StudentPortal />;
  }

  if (isTeacher) {
    return <TeacherDashboard />;
  }

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

  const hasDues = summary.outstandingDues > 0;

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Institute overview" : "Dashboard"}
        description={
          isAdmin
            ? "Auto-computed fee, refund, salary and expense figures across the institute."
            : "A snapshot of your recorded fee collections and expenses."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Fees collected (all time)"
          value={formatCurrency(summary.feeCollected)}
          accent="text-teal-600"
          hint={`${summary.feeTypeCount} fee types in use`}
        />
        <StatCard
          label="Net this month"
          value={formatCurrency(summary.monthlyNet)}
          accent={summary.monthlyNet >= 0 ? "text-teal-600" : "text-red-500"}
          hint="Collections minus refunds, salaries and expenses"
        />
        <StatCard
          label="Outstanding dues"
          value={formatCurrency(summary.outstandingDues)}
          accent={hasDues ? "text-amber-600" : "text-teal-600"}
          hint={`${summary.studentsWithDues} ${
            summary.studentsWithDues === 1 ? "student has" : "students have"
          } pending installments`}
        />
        {isAdmin ? (
          <StatCard
            label="Total users"
            value={summary.totalUsers}
            hint={`${summary.studentCount} students across ${summary.classCount} classes`}
          />
        ) : (
          <StatCard
            label="Expenses recorded"
            value={formatCurrency(summary.expenses)}
            accent="text-red-500"
            hint={`${formatCurrency(summary.monthlyExpenses)} this month`}
          />
        )}
      </div>

      {!isAdmin && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Collected this month"
            value={formatCurrency(summary.monthlyFeeCollected)}
            accent="text-teal-600"
          />
          <StatCard
            label="Refunds this month"
            value={formatCurrency(summary.monthlyRefunds)}
            accent="text-red-500"
          />
          <StatCard
            label="Salaries this month"
            value={formatCurrency(summary.monthlySalaries)}
            accent="text-red-500"
          />
          <StatCard
            label="Expenses this month"
            value={formatCurrency(summary.monthlyExpenses)}
            accent="text-red-500"
          />
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent receipts</h2>
          <span className="text-xs text-slate-400">
            {summary.recentReceipts.length} shown
          </span>
        </div>
        {summary.recentReceipts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            No receipts yet. Collect your first payment from the Fee Plans page.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Fee type</th>
                  <th className="px-4 py-3">Paid at</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentReceipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-teal-700">
                      {receipt.number}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {receipt.student?.name || "—"}
                      {receipt.student?.admissionNo
                        ? ` (${receipt.student.admissionNo})`
                        : ""}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-slate-500 sm:table-cell">
                      {receipt.feeType?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDateTime(receipt.paidAt)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                      {formatNumber(receipt.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;