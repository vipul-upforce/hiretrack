
import { useSelector } from "react-redux";
import { User } from "@/lib/features/org/orgApi";

const useRoles = () => {
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  const role = user?.role || null;

  return role;
};

export default useRoles;
