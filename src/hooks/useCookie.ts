import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { useSelector } from "react-redux";
import { User } from "@/lib/features/org/orgApi";

const useCookie = () => {
  // const [user, setUSer] = useState<{[key: string]: string|number|boolean}>({});
const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  // useEffect(() => {
  //   (async () => {
  //     const token = Cookies.get("token");
  //     if (token) {
  //       const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
  //       if (decryptedResponse.success && decryptedResponse.user) {
  //         setUSer(decryptedResponse.user);
  //       }
  //     }
  //   })();
  // }, []);

  return user;
};

export default useCookie;
