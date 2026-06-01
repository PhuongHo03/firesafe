import { LoginFormState, RegisterFormState } from "@/features/auth/types/auth";

export const ALLOWED_EMAIL_DOMAIN = "@nhattienchung.vn";

export const INITIAL_LOGIN_FORM: LoginFormState = {
  email: "",
  password: "",
};

export const INITIAL_REGISTER_FORM: RegisterFormState = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};
