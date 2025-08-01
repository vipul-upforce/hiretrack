import { User } from "@/lib/features/org/orgApi";
import Cookies from "js-cookie";
import { useSelector } from "react-redux";

export const useAuth = () => {
  // const isAuthenticated = !!Cookies.get("token");
  const { user }: { user: User} = useSelector(
      (state: any) => state.auth || {}
    );
  // const userRole = Cookies.get("role");
  const isAuthenticated = user.id?true:false;
  const userRole = user.role

  return { isAuthenticated, userRole };
};
