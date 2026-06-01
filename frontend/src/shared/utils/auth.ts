"use client";

import Cookies from "js-cookie";

const TOKEN_KEY = "firesafe_token";
const USER_KEY = "firesafe_user";

export interface AuthUser {
  token: string;
  username: string;
  email: string;
  roles: string[];
}

export function saveAuth(user: AuthUser) {
  Cookies.set(TOKEN_KEY, user.token, { expires: 1, sameSite: "strict" });
  Cookies.set(USER_KEY, JSON.stringify({ username: user.username, email: user.email, roles: user.roles }), {
    expires: 1,
    sameSite: "strict",
  });
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function getUser(): { username: string; email: string; roles: string[] } | null {
  const raw = Cookies.get(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(USER_KEY);
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.roles.includes("ROLE_ADMIN") ?? false;
}

export function roleLabel(): string {
  return isAdmin() ? "Admin" : "Viewer";
}
