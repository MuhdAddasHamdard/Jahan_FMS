const TONE_BY_STATUS = {
  ACTIVE: "success",
  PAID: "success",
  INACTIVE: "neutral",
  PENDING: "warning",
  PARTIAL: "warning",
  REFUNDED: "danger",
  NONE: "neutral",
  ADMIN: "brand",
  FINANCE: "teal",
  TEACHER: "warning",
  STUDENT: "neutral",
  TEACHER_STAFF: "teal",
  SUPPORT: "neutral",
};

const StatusBadge = ({ status, tone, label, className = "" }) => {
  if (status === undefined || status === null || status === "") return null;
  const resolvedTone = tone ?? TONE_BY_STATUS[String(status).toUpperCase()] ?? "neutral";
  return (
    <span className={`badge badge-${resolvedTone} ${className}`}>
      {label ?? String(status).replace(/_/g, " ")}
    </span>
  );
};

export default StatusBadge;
