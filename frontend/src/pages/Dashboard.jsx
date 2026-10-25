import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ChartCard from "../components/ChartCard";
import StatusBadge from "../components/StatusBadge";
import Alert from "../components/Alert";
import EmptyState from "../components/EmptyState";
import { SkeletonStat, SkeletonChart } from "../components/Skeleton";
import IncomeExpenseChart from "../components/charts/IncomeExpenseChart";
import ExpenseDonut from "../components/charts/ExpenseDonut";
import { CHART_COLORS } from "../components/charts/chartColors";
import { formatCurrency, formatNumber, formatDateTime } from "../utils/format";
import StudentPortal from "./StudentPortal";

const yearToDate = () => {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
};

const StatGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <SkeletonStat key={index} />
    ))}
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
      <div>
        <PageHeader title="My classes" description="Classes, students and materials you manage." />
        <StatGrid />
      </div>
    );
  }

  if (error) return <Alert type="error" message={error} />;

  return (
    <div>
      <PageHeader
        title="My classes"
        icon="book"
        eyebrow="Teaching"
        description="Classes, students and materials you manage."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Classes" value={data.classCount} icon="book" tone="brand" format={(v) => Math.round(v)} delay={0} />
        <StatCard label="Students" value={data.studentCount} icon="student" tone="teal" format={(v) => Math.round(v)} delay={80} />
        <StatCard label="Materials" value={data.materialCount} icon="document" tone="neutral" format={(v) => Math.round(v)} delay={160} />
      </div>

      <div className="mt-6">
        {data.classes.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="book"
              title="No classes yet"
              description="Create your first class from the Classes page to get started."
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.classes.map((classRecord, index) => (
              <div
                key={classRecord.id}
                className="card reveal p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
                style={{ "--d": `${index * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="soft-brand flex h-10 w-10 items-center justify-center rounded-xl">
                      <span className="text-sm font-bold">{classRecord.name.charAt(0)}</span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-content">
                        {classRecord.name}
                        {classRecord.section ? ` · ${classRecord.section}` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        {classRecord.teacher?.name || "No teacher assigned"}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-brand">
                    {classRecord.studentCount}{" "}
                    {classRecord.studentCount === 1 ? "student" : "students"}
                  </span>
                </div>
                {classRecord.materials.length > 0 && (
                  <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
                    {classRecord.materials.map((material) => (
                      <li key={material.id} className="flex items-center gap-2 text-xs text-muted">
                        <span className="h-1 w-1 rounded-full bg-brand-500" />
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
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isTeacher = role === "TEACHER";

  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTeacher) return undefined;
    let cancelled = false;
    const endpoint = isAdmin ? "/dashboard/admin/summary" : "/dashboard/summary";
    const { from, to } = yearToDate();

    Promise.all([
      api.get(endpoint),
      api.get(`/reports/summary?from=${from}&to=${to}`).catch(() => null),
    ])
      .then(([summaryData, reportData]) => {
        if (!cancelled) {
          setSummary(summaryData);
          setTrend(reportData);
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

  if (role === "STUDENT") return <StudentPortal />;
  if (isTeacher) return <TeacherDashboard />;

  if (loading) {
    return (
      <div>
        <PageHeader
          title={isAdmin ? "Institute overview" : "Dashboard"}
          icon="dashboard"
          description="Loading your latest figures…"
        />
        <StatGrid />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SkeletonChart />
          </div>
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error) return <Alert type="error" message={error} />;

  const hasDues = summary.outstandingDues > 0;
  const byMonth = trend?.byMonth ?? [];
  const incomeSpark = byMonth.slice(-8).map((row) => row.income);
  const outgoing = [
    { name: "Refunds", value: summary.refunded, color: CHART_COLORS.expense },
    { name: "Salaries", value: summary.salariesPaid, color: "#f59e0b" },
    { name: "Expenses", value: summary.expenses, color: CHART_COLORS.tealLight },
  ];

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Institute overview" : "Dashboard"}
        icon="dashboard"
        eyebrow={isAdmin ? "Administration" : "Finance"}
        description={
          isAdmin
            ? "Auto-computed fee, refund, salary and expense figures across the institute."
            : "A snapshot of your recorded fee collections and expenses."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Fees collected (all time)"
          value={summary.feeCollected}
          icon="banknotes"
          tone="brand"
          hint={`${summary.feeTypeCount} fee types in use`}
          spark={incomeSpark.length > 1 ? incomeSpark : undefined}
          delay={0}
        />
        <StatCard
          label="Net this month"
          value={summary.monthlyNet}
          icon="trendingUp"
          tone={summary.monthlyNet >= 0 ? "brand" : "danger"}
          hint="Collections minus refunds, salaries & expenses"
          delay={80}
        />
        <StatCard
          label="Outstanding dues"
          value={summary.outstandingDues}
          icon="clock"
          tone={hasDues ? "warning" : "brand"}
          hint={`${summary.studentsWithDues} ${
            summary.studentsWithDues === 1 ? "student has" : "students have"
          } pending installments`}
          delay={160}
        />
        {isAdmin ? (
          <StatCard
            label="Total users"
            value={summary.totalUsers}
            icon="users"
            tone="teal"
            format={(v) => Math.round(v)}
            hint={`${summary.studentCount} students across ${summary.classCount} classes`}
            delay={240}
          />
        ) : (
          <StatCard
            label="Expenses recorded"
            value={summary.expenses}
            icon="expense"
            tone="danger"
            hint={`${formatCurrency(summary.monthlyExpenses)} this month`}
            delay={240}
          />
        )}
      </div>

      {!isAdmin && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Collected this month"
            value={summary.monthlyFeeCollected}
            icon="wallet"
            tone="brand"
            delay={0}
          />
          <StatCard
            label="Refunds this month"
            value={summary.monthlyRefunds}
            icon="refund"
            tone="danger"
            delay={70}
          />
          <StatCard
            label="Salaries this month"
            value={summary.monthlySalaries}
            icon="userGroup"
            tone="warning"
            delay={140}
          />
          <StatCard
            label="Expenses this month"
            value={summary.monthlyExpenses}
            icon="expense"
            tone="danger"
            delay={210}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Income vs expenses"
          subtitle="Monthly fee income against refunds, salaries and expenses (year to date)"
          delay={120}
        >
          <IncomeExpenseChart data={byMonth} />
        </ChartCard>

        <ChartCard
          title="Outgoing breakdown"
          subtitle="All-time refunds, salaries and expenses"
          delay={200}
        >
          <ExpenseDonut data={outgoing} />
          <ul className="mt-3 space-y-2">
            {outgoing.map((slice) => (
              <li key={slice.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: slice.color }}
                  />
                  {slice.name}
                </span>
                <span className="font-semibold text-content">
                  {formatCurrency(slice.value)}
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="mt-6">
        {summary.recentReceipts.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="receipt"
              title="No receipts yet"
              description="Collect your first payment from the Fee Plans page and it will appear here."
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-content">Recent receipts</h2>
                <p className="mt-0.5 text-xs text-muted">Latest payments recorded</p>
              </div>
              <span className="badge badge-neutral">{summary.recentReceipts.length} shown</span>
            </div>
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-faint">
                    <th className="px-5 py-3 font-semibold">Receipt</th>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="hidden px-5 py-3 font-semibold sm:table-cell">Fee type</th>
                    <th className="px-5 py-3 font-semibold">Paid at</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentReceipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="border-b border-line last:border-0 transition hover:bg-surface-2"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-brand-strong">
                            {receipt.number}
                          </span>
                          {receipt.refundStatus !== "NONE" && (
                            <StatusBadge status={receipt.refundStatus} />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-content">
                        {receipt.student?.name || "—"}
                        {receipt.student?.admissionNo ? (
                          <span className="ml-1 text-xs text-faint">
                            ({receipt.student.admissionNo})
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden px-5 py-3 text-muted sm:table-cell">
                        {receipt.feeType?.name || "—"}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {formatDateTime(receipt.paidAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-content">
                          {formatNumber(receipt.amount)}
                        </span>
                        {receipt.refundedAmount > 0 && (
                          <span className="mt-0.5 block text-[11px] font-medium text-danger">
                            −{formatNumber(receipt.refundedAmount)} refunded
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
