import { UserAccount } from "@/features/admin-users/types/user";

export const ADMIN_USERS_MIN_REFRESH_MS = 250;

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function replaceUser(users: UserAccount[], updated: UserAccount) {
  return users.map(user => user.id === updated.id ? updated : user);
}
