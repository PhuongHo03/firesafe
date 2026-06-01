import { ALLOWED_EMAIL_DOMAIN, INITIAL_REGISTER_FORM } from "@/features/auth/states/authFormState";
import { LoginFormState, RegisterFormState } from "@/features/auth/types/auth";

export function buildLoginRequest(form: LoginFormState) {
  const email = form.email.trim().toLowerCase();
  if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Email phải dùng tên miền ${ALLOWED_EMAIL_DOMAIN}`);
  }
  return { email, password: form.password };
}

export function buildRegisterRequest(form: RegisterFormState) {
  const username = form.username.trim();
  const email = form.email.trim().toLowerCase();
  if (!username) {
    throw new Error("Tên tài khoản không được để trống");
  }
  if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Email phải dùng tên miền ${ALLOWED_EMAIL_DOMAIN}`);
  }
  if (form.password !== form.confirmPassword) {
    throw new Error("Mật khẩu xác nhận không khớp");
  }
  return { username, email, password: form.password };
}

export function getRegisterSuccessForm(): RegisterFormState {
  return {
    ...INITIAL_REGISTER_FORM,
    email: "",
  };
}
