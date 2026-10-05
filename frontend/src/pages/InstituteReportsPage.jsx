import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import { formatNumber } from "../utils/format";

const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

const StatCard = ({ label, value, accent = "", count = false }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p className={`mt-2 text-2xl font-bold ${accent}`}>
      {count ? Number(value || 0).toLocaleString("en-US") : formatNumber(value)}
    </p>
  </div>
);

const InstituteReportsPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/reports/institute")
      .then((data) => {
        if (!cancelled) {
          setReport(data);
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

  const runReport = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();

    try {
      const data = await api.get(`/reports/institute${query ? `?${query}` : ""}`);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totals = report?.totals;

  return (
    <div>
      <PageHeader
        title="Institute Report"
        description="Fees, refunds, salaries, expenses and outstanding dues at a glance."
      />

      <form
        onSubmit={runReport}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          Run report
        </button>
        {report?.period?.from && (
          <p className="text-xs text-slate-400">
            Filtered from {report.period.from} to {report.period.to}
          </p>
        )}
      </form>

      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : !totals ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No report data.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Fees collected" value={totals.feeCollected} accent="text-teal-700" />
          <StatCard label="Receipts issued" value={totals.feeCount} count />
          <StatCard label="Refunds issued" value={totals.refunded} accent="text-red-600" />
          <StatCard label="Expenses" value={totals.expenses} accent="text-red-600" />
          <StatCard label="Net collected" value={totals.netCollected} />
          <StatCard label="Salaries paid" value={totals.salariesPaid} accent="text-red-600" />
          <StatCard label="Outstanding dues" value={totals.outstandingDues} accent="text-amber-700" />
          <StatCard label="Students with dues" value={totals.studentsWithDues} count />
          <StatCard label="Net result" value={totals.netResult} accent="text-slate-900" />
          <StatCard label="Salary payments" value={totals.salaryCount} count />
          <StatCard label="Expense entries" value={totals.expenseCount} count />
        </div>
      )}
    </div>
  );
};

export default InstituteReportsPage;