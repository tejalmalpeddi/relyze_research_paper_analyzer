export interface UserLogin {
  email: string;
  password: string;
}

export interface UserEdit {
  email?: string;
  password?: string;
  raw_user_meta_data?: Record<string, unknown>;
}

export interface UserProfile {
  id: string;
  email?: string;
  is_anonymous?: boolean;
  raw_user_meta_data?: Record<string, unknown>;
}

export interface AuthMessageResponse {
  message?: string;
  user?: UserProfile;
}

export interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  signup: (credentials: UserLogin) => Promise<AuthMessageResponse>;
  login: (credentials: UserLogin) => Promise<AuthMessageResponse>;
  loginAnonymously: () => Promise<AuthMessageResponse>;
  logout: () => Promise<AuthMessageResponse>;
  editUser: (updateData: UserEdit) => Promise<AuthMessageResponse>;
  deleteUser: (credentials: UserLogin) => Promise<AuthMessageResponse>;
  requestPasswordReset: (email: string) => Promise<AuthMessageResponse>;
}
