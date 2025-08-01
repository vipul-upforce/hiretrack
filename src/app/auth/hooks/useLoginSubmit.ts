"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLoginMutation } from "@/lib/features/auth/authApi";
import { useCustomFields } from "@/Custom_Fields/hooks/use-customFields";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import * as jose from "jose";


import { LoginFormValues, UserWithoutCF } from "@/types/login";
import { useCallback } from "react";
import { OneOfMulOrganization } from "@/components/auth/OrganizationDialog";
import { signToken } from "@/lib/jwt";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserFromToken } from "@/lib/redux/authSlice";
import { AppDispatch } from "@/lib/redux/store";

interface HandleLoginSubmitProps {
  selectedOrg?: string;
  isMultiple: boolean;
  setOrganizations: (organizations: OneOfMulOrganization[]) => void;
  setOrganizationDialogOpen: (open: boolean) => void;
  setLoginFormValues: (values: LoginFormValues) => void;
}

export const useHandleLoginSubmit = ({
  selectedOrg,
  isMultiple,
  setOrganizations,
  setOrganizationDialogOpen,
  setLoginFormValues,
}: HandleLoginSubmitProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [login, { isLoading }] = useLoginMutation();
  const { setUserLoggedIn } = useCustomFields();
    const dispatch = useDispatch<AppDispatch>();
  
  const  {user, isAuthenticated}  = useSelector((state: any) => state.auth);
// debugger
  

  const getRedirectUrl = () => {
    const redirectTo =
      searchParams?.get("redirect") || searchParams?.get("returnUrl");

    if (redirectTo) {
      try {
        const decodedUrl = decodeURIComponent(redirectTo);
        if (decodedUrl.startsWith("/") && !decodedUrl.startsWith("//")) {
          return decodedUrl;
        }
      } catch (error) {
        console.warn("Invalid redirect URL:", redirectTo);
      }
    }

    if (user?.role === "candidate") {
      return isMultiple ? `/apply-jobs?o=${user.organizationInfo?.name}` : "/apply-jobs";
    } else if (
      user?.role === "admin" ||
      user?.role === "interviewer" ||
      user?.role === "hr"
    ) {
    
      return "/dashboard";
    }

    return "/";
  };

  const handleSubmit = useCallback(
    async (
      values: LoginFormValues,
      { setStatus }: { setStatus: (message: string) => void }
    ) => {
      debugger
      setLoginFormValues(values);
      try {
        const response = await login({
          ...values,
          email: values.email.toLowerCase().trim(),
          orgId: selectedOrg,
        }).unwrap();

        if (
          response.organizations &&
          response.organizations.length > 1 &&
          !selectedOrg
        ) {
          setOrganizations(response.organizations);
          setOrganizationDialogOpen(true);
          return;
        }
        let is2FAEnabled = response.twofa;

        const decryptedResponse = await verifyAndDecryptJWTToken(
          String(response.user)
        );

        // if (!decryptedResponse.success || !decryptedResponse.user) {
        //   setStatus(decryptedResponse.error || "Failed to process login.");
        //   toast({
        //     title: "Error",
        //     description: decryptedResponse.error || "Failed to process login.",
        //     variant: "destructive",
        //   });
        //   return;
        // }
       
        // try {
        //   const check2FA = await fetch(
        //     `/api/settings/twofa?orgId=${decryptedResponse.user.organizationId}`
        //   );
        //   const data = await check2FA.json();
        //   is2FAEnabled = data.twoFA.enable2FA;
        //   if (!check2FA.ok) {
        //     throw new Error("Failed to fetch 2FA info");
        //   }
        // } catch (error) {
        //   console.error(error);
        //   setStatus("Failed to fetch 2FA info");
        //   toast({
        //     title: "Error",
        //     description: "Failed to fetch 2FA info",
        //     variant: "destructive",
        //   });
        // }
        // const { is2FAEnabled } = await check2FA(String(response.user));

        if (is2FAEnabled) {
          const organizationId = response.organizationId;
          try {
            const otpResponse = await fetch("/api/auth/2fa/send-otp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: values.email.toLowerCase().trim(),
                organizationId
              }),
            });
            // const data = await otpResponse.json();
            if (!otpResponse.ok) {
              throw new Error("Failed to send OTP");
            }

            toast({
              title: "Check your email",
              description: "An OTP has been sent to your email address.",
              variant: "default",
            });
            router.push(
              `/auth/2fa/verify?email=${values.email.toLowerCase().trim()}&orgId=${organizationId}`
            );
          } catch (error) {
            console.error(error);
            setStatus("Failed to send OTP.");
            toast({
              title: "Error",
              description: "Failed to send OTP.",
              variant: "destructive",
            });
          }
          return;
        }

        // const userWithoutCustomFields: UserWithoutCF = {
        //   ...decryptedResponse.user,
        // };
        // if (userWithoutCustomFields.organizationInfo) {
        //   userWithoutCustomFields.organizationInfo = {
        //     ...userWithoutCustomFields.organizationInfo,
        //   };
        //   delete userWithoutCustomFields.organizationInfo.customFields;
        // }
        // const token = await signToken(userWithoutCustomFields);
        // Cookies.set("token", String(token), { expires: 30 });
        

        const redirectUrl = getRedirectUrl();
        console.log("REIRECTURL: ",redirectUrl)
        // new Promise(()=>{})
        // setTimeout(()=>{
        // },4000)
        console.log("user status: ",user, isAuthenticated)
        if(isAuthenticated){
          router.refresh();
          router.push(redirectUrl);
          window.location.href = redirectUrl;
  
          setUserLoggedIn(true);
  
          toast({
            title: "Success",
            description: "Login successful",
            variant: "default",
          });

        }

        dispatch(fetchUserFromToken())
      } catch (err: unknown) {
        console.log(err)
        const errorMessage =
          err &&
          typeof err === "object" &&
          "data" in err &&
          (err.data as { error: string }).error
            ? (err.data as { error: string }).error
            : "An unknown error occurred";
        setStatus(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [
      login,
      selectedOrg,
      isMultiple,
      setOrganizations,
      setOrganizationDialogOpen,
      setUserLoggedIn,
      router,
      toast,
      searchParams,
      // check2FA,
    ]
  );

  return { handleSubmit, isLoading };
};
