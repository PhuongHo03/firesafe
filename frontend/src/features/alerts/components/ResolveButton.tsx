import { CheckCircle } from "lucide-react";
import { AlertStatus, isNewAlertStatus } from "@/shared/utils/alertStatus";

interface ResolveButtonProps {
  disabled?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  size?: "sm" | "md";
  status: AlertStatus;
  title?: string;
}

export default function ResolveButton({ disabled = false, onClick, size = "sm", status, title }: ResolveButtonProps) {
  const isNew = isNewAlertStatus(status);
  const tone = isNew ? yellowTone : greenTone;
  const isDisabled = disabled || !isNew;

  return (
    <button
      disabled={isDisabled}
      onClick={onClick}
      style={{
        ...baseStyle,
        background: tone.background,
        borderColor: tone.borderColor,
        color: tone.color,
        ...sizeStyles[size],
        cursor: isDisabled ? "default" : "pointer",
      }}
      title={title}
      type="button"
    >
      <CheckCircle size={size === "md" ? 16 : 14} />
      {isNew ? "Đánh dấu đã xử lý" : "Đã xử lý"}
    </button>
  );
}

const baseStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: "0.45rem",
  display: "flex",
  alignItems: "center",
  fontWeight: 700,
};

const yellowTone = {
  background: "rgba(245,158,11,0.14)",
  borderColor: "var(--yellow)",
  color: "var(--yellow)",
};

const greenTone = {
  background: "rgba(34,197,94,0.15)",
  borderColor: "var(--green)",
  color: "var(--green)",
};

const sizeStyles: Record<NonNullable<ResolveButtonProps["size"]>, React.CSSProperties> = {
  sm: {
    gap: "0.35rem",
    padding: "0.35rem 0.6rem",
    fontSize: "0.8rem",
  },
  md: {
    gap: "0.45rem",
    padding: "0.65rem 1rem",
    fontSize: "0.95rem",
  },
};
