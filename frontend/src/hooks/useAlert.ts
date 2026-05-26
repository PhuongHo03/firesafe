import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, Alert } from "@/lib/api";
import { getToken } from "@/lib/auth";

export function useAlert(id: number) {
  const router = useRouter();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = getToken();

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    if (isNaN(id)) {
      setError("ID không hợp lệ");
      setLoading(false);
      return;
    }

    setLoading(true);
    api.getAlert(id, token)
      .then(setAlert)
      .catch(() => setError("Không tìm thấy cảnh báo"))
      .finally(() => setLoading(false));
  }, [id, token, router]);

  const deleteAlert = useCallback(async () => {
    if (!token) {
      return;
    }
    await api.deleteAlert(id, token);
    router.push("/alerts");
  }, [id, token, router]);

  return { alert, loading, error, deleteAlert };
}
