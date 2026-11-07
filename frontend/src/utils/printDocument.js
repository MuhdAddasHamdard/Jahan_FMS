import { formatDate, formatNumber } from "./format";

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; color: #111827; font: 14px/1.5 Arial, sans-serif; }
  .sheet { max-width: 760px; margin: 36px auto; padding: 40px; border: 1px solid #d1d5db; }
  .brand { color: #0f766e; font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 28px 0 4px; font-size: 25px; }
  .subtitle, .muted { color: #6b7280; }
  .reference { margin-top: 20px; padding: 12px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
  .recipient { margin: 24px 0; }
  .recipient-label { margin-bottom: 3px; color: #6b7280; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .recipient-name { font-size: 17px; font-weight: 700; }
  .detail { color: #4b5563; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 11px 0; border-bottom: 1px solid #e5e7eb; }
  td:last-child { text-align: right; }
  tr.total td { padding-top: 16px; border-bottom: 0; color: #0f766e; font-size: 17px; font-weight: 700; }
  .note { margin-top: 22px; color: #4b5563; font-size: 12px; }
  .signatures { display: flex; justify-content: space-between; gap: 48px; margin-top: 64px; }
  .signature { width: 45%; padding-top: 8px; border-top: 1px solid #9ca3af; color: #6b7280; font-size: 11px; }
  .footer { margin-top: 36px; color: #6b7280; font-size: 11px; text-align: center; }
  @media print {
    @page { margin: 16mm; }
    .sheet { max-width: none; margin: 0; padding: 0; border: 0; }
  }
`;

const appendText = (document, parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text ?? "";
  parent.append(element);
  return element;
};

export const openPrintWindow = () =>
  window.open("", "_blank", "popup,width=800,height=760");

export const printDocument = (data, printWindow = openPrintWindow()) => {
  if (!printWindow) return false;

  printWindow.opener = null;
  const document = printWindow.document;
  document.title = data.title;

  const charset = document.createElement("meta");
  charset.charset = "UTF-8";
  const style = document.createElement("style");
  style.textContent = PRINT_STYLES;
  document.head.replaceChildren(charset, style);
  document.body.replaceChildren();

  const sheet = appendText(document, document.body, "main", "", "sheet");
  appendText(document, sheet, "div", "Jahan FMS", "brand");
  appendText(document, sheet, "h1", data.title);
  if (data.subtitle) appendText(document, sheet, "p", data.subtitle, "subtitle");

  const reference = appendText(document, sheet, "div", "", "reference");
  appendText(document, reference, "strong", data.referenceLabel ?? "Reference");
  appendText(
    document,
    reference,
    "span",
    ` ${data.reference ?? "—"}  |  Date: ${data.date ?? "—"}`,
  );

  const recipient = appendText(document, sheet, "section", "", "recipient");
  appendText(document, recipient, "div", data.recipientLabel ?? "Recipient", "recipient-label");
  appendText(document, recipient, "div", data.recipientName ?? "—", "recipient-name");
  (data.recipientDetails ?? []).forEach((detail) =>
    appendText(document, recipient, "div", detail, "detail"),
  );

  const table = document.createElement("table");
  const body = document.createElement("tbody");
  (data.rows ?? []).forEach((row) => {
    const tableRow = document.createElement("tr");
    if (row.total) tableRow.className = "total";
    appendText(document, tableRow, "td", row.label);
    appendText(document, tableRow, "td", row.value);
    body.append(tableRow);
  });
  table.append(body);
  sheet.append(table);

  if (data.note) appendText(document, sheet, "p", data.note, "note");

  const signatures = appendText(document, sheet, "div", "", "signatures");
  (data.signatures ?? ["Received by", "Authorized by"]).forEach((label) =>
    appendText(document, signatures, "div", label, "signature"),
  );
  if (data.footer) appendText(document, sheet, "p", data.footer, "footer");

  printWindow.focus();
  printWindow.print();
  return true;
};

export const printFeeReceipt = (receipt, printWindow) =>
  printDocument(
    {
      title: "Student fee receipt",
      subtitle: "Payment received",
      referenceLabel: "Receipt number",
      reference: receipt.number,
      date: formatDate(receipt.paidAt),
      recipientLabel: "Received from",
      recipientName: receipt.student?.name ?? "Student",
      recipientDetails: receipt.student?.admissionNo
        ? [`Admission number: ${receipt.student.admissionNo}`]
        : [],
      rows: [
        { label: "Fee", value: receipt.feeType?.name ?? "Student fees" },
        ...(receipt.discountAmount > 0
          ? [{ label: "Plan discount (total)", value: formatNumber(receipt.discountAmount) }]
          : []),
        { label: "Amount received", value: formatNumber(receipt.amount), total: true },
      ],
      note: receipt.notes || "Thank you. Please retain this receipt for your records.",
      signatures: ["Cashier", "Student / guardian"],
    },
    printWindow,
  );

export const printSalaryVoucher = (payment, printWindow) =>
  printDocument(
    {
      title: "Salary payment voucher",
      subtitle: "Staff salary payment",
      referenceLabel: "Voucher number",
      reference: `SV-${String(payment.id).padStart(6, "0")}`,
      date: formatDate(payment.paidOn),
      recipientLabel: "Paid to",
      recipientName: payment.staff?.name ?? "Staff member",
      recipientDetails: [
        payment.staff?.staffNo ? `Staff number: ${payment.staff.staffNo}` : "",
        payment.staff?.designation ? `Designation: ${payment.staff.designation}` : "",
      ].filter(Boolean),
      rows: [
        { label: "Salary month", value: payment.periodMonth },
        { label: "Amount paid", value: formatNumber(payment.amount), total: true },
      ],
      note: payment.notes || "Please retain this voucher as proof of salary payment.",
      signatures: ["Paid by", "Staff member"],
    },
    printWindow,
  );
