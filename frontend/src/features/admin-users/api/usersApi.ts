import { request } from "@/shared/utils/http";
import { UserAccount, UserUpdateRequest } from "@/features/admin-users/types/user";

export const usersApi = {
  getUsers(token: string) {
    return request<UserAccount[]>("/api/v1/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  updateUser(id: number, data: UserUpdateRequest, token: string) {
    return request<UserAccount>(`/api/v1/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
