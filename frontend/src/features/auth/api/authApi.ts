import { request } from "@/shared/utils/http";
import { AuthResponse } from "@/features/auth/types/auth";

export const authApi = {
  login(email: string, password: string) {
    return request<AuthResponse>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
  },

  register(username: string, email: string, password: string) {
    return request<AuthResponse>(
      "/api/v1/auth/register",
      { method: "POST", body: JSON.stringify({ username, email, password }) }
    );
  },
};
