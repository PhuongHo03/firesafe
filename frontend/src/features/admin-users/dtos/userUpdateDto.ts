import { Role, UserAccount, UserUpdateInput, UserUpdateRequest } from "@/features/admin-users/types/user";

export function getUserRole(user: UserAccount): Role {
  return user.roles.includes("ROLE_ADMIN") ? "ROLE_ADMIN" : "ROLE_VIEWER";
}

export function buildUserUpdateRequest(user: UserAccount, input: UserUpdateInput): UserUpdateRequest {
  return {
    active: input.active ?? user.active,
    role: input.role ?? getUserRole(user),
  };
}
