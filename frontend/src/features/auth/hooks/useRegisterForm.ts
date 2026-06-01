import { FormEvent, useState } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { buildRegisterRequest, getRegisterSuccessForm } from "@/features/auth/dtos/authFormDto";
import { INITIAL_REGISTER_FORM } from "@/features/auth/states/authFormState";

export function useRegisterForm() {
  const [form, setForm] = useState(INITIAL_REGISTER_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const request = buildRegisterRequest(form);
      setLoading(true);
      await authApi.register(request.username, request.email, request.password);
      setSuccess(true);
      setForm(getRegisterSuccessForm());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  return { form, error, success, loading, updateField, handleSubmit };
}
