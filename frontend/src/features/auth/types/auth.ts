export interface AuthResponse {
  token: string;
  username: string;
  email: string;
}

export interface RegisterResponse {
  token: string | null;
  username: string;
  email: string;
}

export interface LoginFormState {
  email: string;
  password: string;
}

export interface RegisterFormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
