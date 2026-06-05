import { UserAccount, UserUpdateInput, UserUpdateRequest } from "@/features/admin-users/types/user";

export function buildUserUpdateRequest(user: UserAccount, input: UserUpdateInput): UserUpdateRequest {
  return {
    active: input.active ?? user.active,
  };
}
