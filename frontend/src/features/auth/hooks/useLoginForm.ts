import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAuth } from "@/shared/utils/auth";
import { authApi } from "@/features/auth/api/authApi";
import { buildLoginRequest } from "@/features/auth/dtos/authFormDto";
import { INITIAL_LOGIN_FORM } from "@/features/auth/states/authFormState";

export function useLoginForm() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_LOGIN_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const request = buildLoginRequest(form);
      const data = await authApi.login(request.email, request.password);
      saveAuth(data);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return { form, error, loading, updateField, handleSubmit };
}
