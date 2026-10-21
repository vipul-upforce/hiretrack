import { useAppSelector } from '@/lib/redux/hooks';

const useRoles = () => {
  const { user } = useAppSelector((state) => state.auth);

  if (user === null) {
    return '';
  }

  return user?.role;
};

export default useRoles;
