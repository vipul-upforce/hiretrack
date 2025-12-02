
import { useSelector } from "react-redux";
import { User } from "@/lib/features/org/orgApi";

const useCookie = () => {
  // const [user, setUSer] = useState<{[key: string]: string|number|boolean}>({});
const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );

  return user;
};

export default useCookie;
