export interface UserLogin {
  email: string;
  password: string;
}

export interface UserEdit {
  email?: string;
  password?: string;
  raw_user_meta_data?: Record<string, any>; //TODO: need to add name into this? need ot figure out hwo
}

export interface UserProfile {
  id: string;
  email?: string;
  is_anonymous?: boolean; //TODO: get rid of anonymous; need to provide defaults
  raw_user_meta_data?: Record<string, any>;
}

export interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  signup: (credentials: UserLogin) => Promise<any>;
  login: (credentials: UserLogin) => Promise<any>;
  loginAnonymously: () => Promise<any>;
  logout: () => Promise<any>;
  editUser: (updateData: UserEdit) => Promise<any>;
  deleteUser: () => Promise<any>;
}