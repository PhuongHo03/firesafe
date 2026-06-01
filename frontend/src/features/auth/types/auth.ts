export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  roles: string[];
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
