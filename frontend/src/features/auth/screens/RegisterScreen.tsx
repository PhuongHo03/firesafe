"use client";

import AuthShell from "@/features/auth/components/AuthShell";
import RegisterForm from "@/features/auth/components/RegisterForm";
import { useRegisterForm } from "@/features/auth/hooks/useRegisterForm";
import { ALLOWED_EMAIL_DOMAIN } from "@/features/auth/states/authFormState";

export default function RegisterScreen() {
  const { form, error, success, loading, updateField, handleSubmit } = useRegisterForm();

  return (
    <AuthShell title="Tạo tài khoản" subtitle={`Chỉ email ${ALLOWED_EMAIL_DOMAIN} được đăng ký`} maxWidth="420px">
      <RegisterForm form={form} error={error} success={success} loading={loading} onFieldChange={updateField} onSubmit={handleSubmit} />
    </AuthShell>
  );
}
