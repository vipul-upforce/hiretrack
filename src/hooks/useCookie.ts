import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

const useCookie = () => {
  const [user, setUSer] = useState<{[key: string]: string|number|boolean}>({});

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUSer(decryptedResponse.user);
        }
      }
    })();
  }, []);

  return user;
};

export default useCookie;
