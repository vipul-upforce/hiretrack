import { useSelector } from 'react-redux';
import { User } from '@/lib/features/org/orgApi';

const useRoles = () => {
  // const [role, setRole] = useState<string | null>("");
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {},
  );
  const role = user?.role;
  // useEffect(() => {
  //   (async () => {
  //     const token = Cookies.get("token");
  //     if (token) {
  //       const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
  //       if (decryptedResponse.success && decryptedResponse.user) {
  //         setRole(decryptedResponse.user.role);
  //       }
  //     }
  //   })();
  // }, []);

  return role;
};

export default useRoles;
