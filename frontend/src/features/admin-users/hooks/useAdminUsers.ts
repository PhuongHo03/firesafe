/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser, isAdmin } from "@/shared/utils/auth";
import { usersApi } from "@/features/admin-users/api/usersApi";
import { buildUserUpdateRequest } from "@/features/admin-users/dtos/userUpdateDto";
import { ADMIN_USERS_MIN_REFRESH_MS, replaceUser, wait } from "@/features/admin-users/states/adminUsersState";
import { UserAccount, UserUpdateInput } from "@/features/admin-users/types/user";

export function useAdminUsers() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (!token) return;
    if (showLoading) setLoading(true);
    setError("");
    try {
      setUsers(await usersApi.getUsers(token));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách user");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [token]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(false), wait(ADMIN_USERS_MIN_REFRESH_MS)]);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    const currentToken = getToken() ?? null;
    setCurrentEmail(getUser()?.email ?? "");
    setToken(currentToken);
    if (!currentToken) {
      router.push("/login");
      return;
    }
    if (!isAdmin()) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateUser(user: UserAccount, input: UserUpdateInput) {
    if (!token) return;
    setError("");
    try {
      const updated = await usersApi.updateUser(user.id, buildUserUpdateRequest(user, input), token);
      setUsers(prev => replaceUser(prev, updated));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật user");
    }
  }

  return { users, currentEmail, loading, refreshing, error, reload, updateUser };
}
