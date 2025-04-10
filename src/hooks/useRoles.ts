import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

const useRoles = () => {
  const [role, setRole] = useState<string | null>("");

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setRole(decryptedResponse.user.role);
        }
      }
    })();
  }, []);

  return role;
};

export default useRoles;
