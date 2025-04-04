import { useEffect, useState } from "react";
import Cookies from "js-cookie";

const useRoles = () => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const user = Cookies.get("user");
    if (user) {
      const userData = JSON.parse(user);
      setRole(userData.role); // Adjust this based on your user object structure
    }
  }, []);

  return role;
};

export default useRoles;
