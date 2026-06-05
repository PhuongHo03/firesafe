export interface UserAccount {
  id: number;
  username: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserUpdateInput {
  active?: boolean;
}

export interface UserUpdateRequest {
  active: boolean;
}
