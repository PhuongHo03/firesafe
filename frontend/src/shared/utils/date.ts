export function formatVietnamDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function formatOptionalVietnamDateTime(value: string | Date | null | undefined, fallback = "-") {
  return value ? formatVietnamDateTime(value) : fallback;
}
