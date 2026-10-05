import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import { formatCurrency } from "../utils/format";

const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

const monthBounds = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
};

const SummaryCard = ({ label, value, accent }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
      {label}
    </p>
    <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
  </div>
);

const ReportsPage = () => {
  const defaults = monthBounds();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);

    api
      .get(`/reports/summary?${params.toString()}`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const data = await api.get(`/reports/summary?${params.toString()}`);
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
        title="Reports"
        description="Income statement for your institute over a period."
      />

      <form
        onSubmit={handleApply}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
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
          <label className="mb-1 block text-xs font-semibold text-slate-600">
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
          className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Apply
        </button>
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
      ) : report ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Fee income"
              value={formatCurrency(totals.totalIncome)}
              accent="text-teal-600"
            />
            <SummaryCard
              label="Total expenses"
              value={formatCurrency(totals.totalExpense)}
              accent="text-red-500"
            />
            <SummaryCard
              label="Net"
              value={formatCurrency(totals.net)}
              accent={totals.net >= 0 ? "text-teal-600" : "text-red-500"}
            />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Refunds"
              value={formatCurrency(totals.totalRefunds)}
              accent="text-red-500"
            />
            <SummaryCard
              label="Salaries"
              value={formatCurrency(totals.totalSalaries)}
              accent="text-red-500"
            />
            <SummaryCard
              label="Recorded expenses"
              value={formatCurrency(totals.totalExpenses)}
              accent="text-red-500"
            />
            <SummaryCard
              label="Receipts issued"
              value={totals.feeCount}
              accent="text-slate-900"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Monthly breakdown
              </h2>
            </div>
            {report.byMonth.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                No activity in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-semibold">Month</th>
                      <th className="px-5 py-3 text-right font-semibold">Income</th>
                      <th className="px-5 py-3 text-right font-semibold">Expenses</th>
                      <th className="px-5 py-3 text-right font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byMonth.map((row) => (
                      <tr key={row.month} className="border-b border-slate-100 last:border-0">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {row.month}
                        </td>
                        <td className="px-5 py-3 text-right text-teal-600">
                          {formatCurrency(row.income)}
                        </td>
                        <td className="px-5 py-3 text-right text-red-500">
                          {formatCurrency(row.expense)}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-semibold ${
                            row.income - row.expense >= 0
                              ? "text-slate-900"
                              : "text-red-500"
                          }`}
                        >
                          {formatCurrency(row.income - row.expense)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ReportsPage;