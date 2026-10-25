import Icon from "./Icons";

const TYPES = {
  error: { className: "alert-error", icon: "error" },
  success: { className: "alert-success", icon: "success" },
  warning: { className: "alert-warning", icon: "warning" },
  info: { className: "alert-info", icon: "info" },
};

const Alert = ({ type = "info", message, className = "" }) => {
  if (!message) return null;
  const tone = TYPES[type] || TYPES.info;

  return (
    <div className={`alert ${tone.className} ${className}`} role="alert">
      <Icon name={tone.icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
};

export default Alert;
