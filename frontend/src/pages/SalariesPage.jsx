import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import Alert from "../components/Alert";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import { FormField, inputClass } from "../components/FormField";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";
import { formatDate, formatNumber } from "../utils/format";

const today = () => new Date().toISOString().slice(0, 10);
const emptyRate = () => ({ staffId: "", amount: "", effectiveFrom: today() });
const emptyPayment = { staffId: "", periodMonth: "", amount: "", paidOn: "" };

const SalariesPage = () => {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [rates, setRates] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rateEditor, setRateEditor] = useState(null);
  const [paymentEditor, setPaymentEditor] = useState(null);
  const [rateForm, setRateForm] = useState(emptyRate);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const refresh = async () => {
    const [staffData, rateData, paymentData] = await Promise.all([
      api.get("/staff"),
      api.get("/salaries/rates"),
      api.get("/salaries/payments"),
    ]);
    setStaff(staffData);
    setRates(rateData);
    setPayments(paymentData);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/staff"),
      api.get("/salaries/rates"),
      api.get("/salaries/payments"),
    ])
      .then(([staffData, rateData, paymentData]) => {
        if (!cancelled) {
          setStaff(staffData);
          setRates(rateData);
          setPayments(paymentData);
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

  const rateForPayment = useMemo(() => {
    if (!paymentForm.staffId || !paymentForm.periodMonth) return null;
    const monthStart = `${paymentForm.periodMonth}-01`;
    return rates
      .filter(
        (rate) =>
          rate.staff.id === Number(paymentForm.staffId) &&
          String(rate.effectiveFrom).slice(0, 10) <= monthStart,
      )
      .sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)))[0] ?? null;
  }, [paymentForm.periodMonth, paymentForm.staffId, rates]);

  const openNewRate = () => {
    setRateForm(emptyRate());
    setFormError("");
    setRateEditor({ mode: "create" });
  };

  const openEditRate = (rate) => {
    setRateForm({
      staffId: String(rate.staff.id),
      amount: String(rate.amount),
      effectiveFrom: String(rate.effectiveFrom).slice(0, 10),
    });
    setFormError("");
    setRateEditor({ mode: "edit", rate });
  };

  const saveRate = async (event) => {
    event.preventDefault();
    if (!rateForm.staffId || !rateForm.amount || Number(rateForm.amount) <= 0) {
      setFormError("Choose a staff member and enter a salary greater than zero.");
      return;
    }
    if (!rateForm.effectiveFrom) {
      setFormError("Choose the date this salary rate becomes effective.");
      return;
    }

    setBusy(true);
    setFormError("");
    try {
      if (rateEditor.mode === "create") {
        await api.post("/salaries/rates", {
          staffId: Number(rateForm.staffId),
          amount: Number(rateForm.amount),
          effectiveFrom: rateForm.effectiveFrom,
        });
        toast.success("Salary rate added");
      } else {
        await api.patch(`/salaries/rates/${rateEditor.rate.id}`, {
          amount: Number(rateForm.amount),
          effectiveFrom: rateForm.effectiveFrom,
        });
        toast.success("Salary rate updated");
      }
      setRateEditor(null);
      await refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openNewPayment = () => {
    setPaymentForm(emptyPayment);
    setFormError("");
    setPaymentEditor({ mode: "create" });
  };

  const openEditPayment = (payment) => {
    setPaymentForm({
      staffId: String(payment.staff.id),
      periodMonth: payment.periodMonth,
      amount: String(payment.amount),
      paidOn: payment.paidOn ? String(payment.paidOn).slice(0, 10) : "",
    });
    setFormError("");
    setPaymentEditor({ mode: "edit", payment });
  };

  const savePayment = async (event) => {
    event.preventDefault();
    if (!paymentForm.periodMonth) {
      setFormError("Choose the month this salary is for.");
      return;
    }
    if (paymentEditor.mode === "create" && !paymentForm.staffId) {
      setFormError("Choose a staff member.");
      return;
    }
    if (paymentForm.amount && Number(paymentForm.amount) <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    const payload = {
      periodMonth: paymentForm.periodMonth,
      amount: paymentForm.amount ? Number(paymentForm.amount) : undefined,
      paidOn: paymentForm.paidOn || undefined,
    };
    setBusy(true);
    setFormError("");
    try {
      if (paymentEditor.mode === "create") {
        await api.post("/salaries/payments", {
          ...payload,
          staffId: Number(paymentForm.staffId),
        });
        toast.success(`Salary payment recorded for ${paymentForm.periodMonth}`);
      } else {
        await api.patch(`/salaries/payments/${paymentEditor.payment.id}`, payload);
        toast.success("Salary payment updated");
      }
      setPaymentEditor(null);
      await refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      if (deleting.type === "rate") {
        await api.delete(`/salaries/rates/${deleting.item.id}`);
        toast.success("Salary rate deleted");
      } else {
        await api.delete(`/salaries/payments/${deleting.item.id}`);
        toast.success("Salary payment deleted");
      }
      setDeleting(null);
      await refresh();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const rateColumns = [
    {
      key: "staff",
      header: "Staff member",
      sortable: true,
      sortValue: (rate) => rate.staff.name,
      render: (rate) => (
        <div>
          <p className="font-medium text-content">{rate.staff.name}</p>
          <p className="text-xs text-muted">{rate.staff.staffNo} · {rate.staff.designation}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Monthly salary",
      align: "right",
      sortable: true,
      render: (rate) => <span className="font-semibold text-content">{formatNumber(rate.amount)}</span>,
    },
    {
      key: "effectiveFrom",
      header: "Effective from",
      sortable: true,
      sortValue: (rate) => String(rate.effectiveFrom).slice(0, 10),
      render: (rate) => formatDate(rate.effectiveFrom),
    },
  ];

  const paymentColumns = [
    {
      key: "staff",
      header: "Staff member",
      sortable: true,
      sortValue: (payment) => payment.staff.name,
      render: (payment) => (
        <div>
          <p className="font-medium text-content">{payment.staff.name}</p>
          <p className="text-xs text-muted">{payment.staff.staffNo} · {payment.staff.designation}</p>
        </div>
      ),
    },
    { key: "periodMonth", header: "Salary month", sortable: true },
    {
      key: "amount",
      header: "Amount paid",
      align: "right",
      sortable: true,
      render: (payment) => <span className="font-semibold text-content">{formatNumber(payment.amount)}</span>,
    },
    {
      key: "paidOn",
      header: "Payment date",
      sortable: true,
      sortValue: (payment) => payment.paidOn,
      render: (payment) => formatDate(payment.paidOn),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salaries"
        description="Manage effective-dated salary rates and record staff salary payments."
        icon="banknotes"
      />

      {error && <Alert type="error" message={error} />}

      <DataTable
        title="Salary payments"
        count={payments.length}
        loading={loading}
        rows={payments}
        columns={paymentColumns}
        searchPlaceholder="Search salary payments..."
        searchValue={(payment) =>
          [payment.staff.name, payment.staff.staffNo, payment.periodMonth]
            .filter(Boolean)
            .join(" ")
        }
        defaultSort={{ key: "paidOn", direction: "desc" }}
        addButton={{ label: "Record payment", onClick: openNewPayment }}
        emptyMessage="No salary payments have been recorded."
        rowActions={(payment) => [
          { label: "Edit", icon: "edit", onClick: () => openEditPayment(payment) },
          {
            label: "Delete",
            icon: "trash",
            tone: "danger",
            onClick: () => setDeleting({ type: "payment", item: payment }),
          },
        ]}
      />

      <DataTable
        title="Salary rate history"
        count={rates.length}
        loading={loading}
        rows={rates}
        columns={rateColumns}
        searchPlaceholder="Search salary rates..."
        searchValue={(rate) =>
          [rate.staff.name, rate.staff.staffNo, rate.staff.designation]
            .filter(Boolean)
            .join(" ")
        }
        defaultSort={{ key: "effectiveFrom", direction: "desc" }}
        addButton={{ label: "Add salary rate", onClick: openNewRate }}
        emptyMessage="No salary rates have been added. Add one to set a default payment amount."
        rowActions={(rate) => [
          { label: "Edit", icon: "edit", onClick: () => openEditRate(rate) },
          {
            label: "Delete",
            icon: "trash",
            tone: "danger",
            onClick: () => setDeleting({ type: "rate", item: rate }),
          },
        ]}
      />

      <Modal
        open={Boolean(rateEditor)}
        onClose={() => setRateEditor(null)}
        title={rateEditor?.mode === "edit" ? "Edit salary rate" : "Add salary rate"}
        description={
          rateEditor?.mode === "edit"
            ? `${rateEditor.rate.staff.name} · changes affect future default payments only`
            : "Rate changes are saved as separate effective-dated records."
        }
        footer={
          <>
            <button type="button" onClick={() => setRateEditor(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" form="salary-rate-form" disabled={busy} className="btn btn-primary">
              {busy ? "Saving..." : "Save salary rate"}
            </button>
          </>
        }
      >
        <form id="salary-rate-form" onSubmit={saveRate} className="space-y-3">
          {formError && <Alert type="error" message={formError} />}
          {rateEditor?.mode === "create" && (
            <FormField label="Staff member" htmlFor="salary-rate-staff">
              <select
                id="salary-rate-staff"
                value={rateForm.staffId}
                onChange={(event) => setRateForm((current) => ({ ...current, staffId: event.target.value }))}
                className={inputClass}
                required
              >
                <option value="">Choose staff</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.staffNo} · {person.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Monthly salary amount" htmlFor="salary-rate-amount">
            <input
              id="salary-rate-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={rateForm.amount}
              onChange={(event) => setRateForm((current) => ({ ...current, amount: event.target.value }))}
              className={inputClass}
              required
            />
          </FormField>
          <FormField label="Effective from" htmlFor="salary-rate-date">
            <input
              id="salary-rate-date"
              type="date"
              value={rateForm.effectiveFrom}
              onChange={(event) => setRateForm((current) => ({ ...current, effectiveFrom: event.target.value }))}
              className={inputClass}
              required
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={Boolean(paymentEditor)}
        onClose={() => setPaymentEditor(null)}
        title={paymentEditor?.mode === "edit" ? "Edit salary payment" : "Record salary payment"}
        description={
          paymentEditor?.mode === "edit"
            ? `${paymentEditor.payment.staff.name} · ${paymentEditor.payment.periodMonth}`
            : "Leave amount empty to use the salary rate effective for the selected month."
        }
        footer={
          <>
            <button type="button" onClick={() => setPaymentEditor(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" form="salary-payment-form" disabled={busy} className="btn btn-primary">
              {busy ? "Saving..." : paymentEditor?.mode === "edit" ? "Save changes" : "Record payment"}
            </button>
          </>
        }
      >
        <form id="salary-payment-form" onSubmit={savePayment} className="space-y-3">
          {formError && <Alert type="error" message={formError} />}
          {paymentEditor?.mode === "create" && (
            <FormField label="Staff member" htmlFor="salary-payment-staff">
              <select
                id="salary-payment-staff"
                value={paymentForm.staffId}
                onChange={(event) => setPaymentForm((current) => ({ ...current, staffId: event.target.value }))}
                className={inputClass}
                required
              >
                <option value="">Choose staff</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.staffNo} · {person.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Salary month" htmlFor="salary-payment-month">
            <input
              id="salary-payment-month"
              type="month"
              value={paymentForm.periodMonth}
              onChange={(event) => setPaymentForm((current) => ({ ...current, periodMonth: event.target.value }))}
              className={inputClass}
              required
            />
          </FormField>
          <FormField
            label="Amount paid"
            htmlFor="salary-payment-amount"
            hint={
              paymentForm.amount
                ? "A custom payment amount will be recorded."
                : rateForPayment
                  ? `Defaults to ${formatNumber(rateForPayment.amount)}`
                  : "No rate found for this month; enter an amount or add an effective salary rate."
            }
          >
            <input
              id="salary-payment-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={paymentForm.amount}
              onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder={rateForPayment ? formatNumber(rateForPayment.amount) : "Enter amount"}
              className={inputClass}
            />
          </FormField>
          <FormField label="Payment date" htmlFor="salary-payment-date" hint="Leave empty to use today">
            <input
              id="salary-payment-date"
              type="date"
              value={paymentForm.paidOn}
              onChange={(event) => setPaymentForm((current) => ({ ...current, paidOn: event.target.value }))}
              className={inputClass}
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting?.type === "rate" ? "Delete salary rate" : "Delete salary payment"}
        message={
          deleting?.type === "rate"
            ? `The ${formatNumber(deleting.item.amount)} rate for ${deleting.item.staff.name}, effective ${formatDate(deleting.item.effectiveFrom)}, will be removed. Existing payments remain unchanged.`
            : deleting
              ? `The ${deleting.item.periodMonth} payment of ${formatNumber(deleting.item.amount)} to ${deleting.item.staff.name} will be removed from reports.`
              : ""
        }
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default SalariesPage;
