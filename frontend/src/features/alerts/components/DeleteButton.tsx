import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  id?: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  size?: "sm" | "md";
  title?: string;
}

export default function DeleteButton({ children, disabled = false, id, onClick, size = "sm", title }: DeleteButtonProps) {
  return (
    <button
      id={id}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      title={title}
      type="button"
    >
      <Trash2 size={size === "md" ? 16 : 14} />
      {children}
    </button>
  );
}

const baseStyle: React.CSSProperties = {
  background: "var(--accent-dim)",
  border: "1px solid var(--accent)",
  borderRadius: "0.45rem",
  color: "var(--accent)",
  display: "flex",
  alignItems: "center",
  fontWeight: 700,
};

const sizeStyles: Record<NonNullable<DeleteButtonProps["size"]>, React.CSSProperties> = {
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
