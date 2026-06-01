"use client";

import AuthShell from "@/features/auth/components/AuthShell";
import LoginForm from "@/features/auth/components/LoginForm";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

export default function LoginScreen() {
  const { form, error, loading, updateField, handleSubmit } = useLoginForm();

  return (
    <AuthShell title="FireSafe" subtitle="Hệ thống phát hiện cháy">
      <LoginForm form={form} error={error} loading={loading} onFieldChange={updateField} onSubmit={handleSubmit} />
    </AuthShell>
  );
}
