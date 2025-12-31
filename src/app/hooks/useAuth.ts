import { useAppSelector } from '@/lib/redux/hooks';

export const useAuth = () => {
  const { user } = useAppSelector((state) => state.auth || {});
  const isAuthenticated = !!user?.id;
  const userRole = user?.role;
  const email = user?.email;

  return { isAuthenticated, userRole, email };
};
