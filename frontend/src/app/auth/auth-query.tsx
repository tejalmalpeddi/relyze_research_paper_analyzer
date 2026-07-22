import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

//fetches user + user session? + user preferences
const fetchMe = async () => {
  const res = await fetch('/api/auth/get-user-details', {
    credentials: 'include', // httponly cookie
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
};

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['authUser'],
    queryFn: fetchMe,
    retry: false, 
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    },
  });

  // 3. Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => fetch('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(['authUser'], null);
    },
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };
}