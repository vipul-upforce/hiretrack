import { useAppSelector } from '@/lib/redux/hooks';

const useCookie = () => {
  const { user } = useAppSelector((state) => state.auth);

  return user;
};

export default useCookie;
