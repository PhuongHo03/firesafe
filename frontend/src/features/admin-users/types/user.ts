export type Role = "ROLE_ADMIN" | "ROLE_VIEWER";

export interface UserAccount {
  id: number;
  username: string;
  email: string;
  active: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserUpdateInput {
  active?: boolean;
  role?: Role;
}

export interface UserUpdateRequest {
  active: boolean;
  role: Role;
}
