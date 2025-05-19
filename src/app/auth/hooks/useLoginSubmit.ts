"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLoginMutation } from "@/lib/features/auth/authApi";
import { useCustomFields } from "@/Custom_Fields/hooks/use-customFields";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import * as jose from "jose";
import CryptoJS from "crypto-js";
import { LoginFormValues, UserWithoutCF } from "@/types/login";
import { useCallback } from "react";
import { OneOfMulOrganization } from "@/components/auth/OrganizationDialog";

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
  const { toast } = useToast();
  const [login, { isLoading }] = useLoginMutation();
  const { setUserLoggedIn } = useCustomFields();

  const signToken = async (payload: unknown) => {
    const JWT_SECRET = "your_jwt_secret_key";
    try {
      const parsedPayload = payload;
      const encryptedPayload = CryptoJS.AES.encrypt(
        JSON.stringify(parsedPayload),
        JWT_SECRET
      ).toString();
      const secretKey = new TextEncoder().encode(JWT_SECRET);
      const jwt = await new jose.SignJWT({ user: encryptedPayload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secretKey);
      return jwt;
    } catch {
      throw new Error("Failed to sign token");
    }
  };

  const handleSubmit = useCallback(
    async (
      values: LoginFormValues,
      { setStatus }: { setStatus: (message: string) => void }
    ) => {
      //   debugger;
      setLoginFormValues(values);
      try {
        const response = await login({
          ...values,
          orgId: selectedOrg,
        }).unwrap();
        // debugger;
        if (
          response.organizations &&
          response.organizations.length > 1 &&
          !selectedOrg
        ) {
          setOrganizations(response.organizations);
          setOrganizationDialogOpen(true);
          return;
        }
        const decryptedResponse = await verifyAndDecryptJWTToken(
          String(response.user)
        );
        if (decryptedResponse.success && decryptedResponse.user) {
          const userWithoutCustomFields: UserWithoutCF = {
            ...decryptedResponse.user,
          };
          if (userWithoutCustomFields.organizationInfo) {
            userWithoutCustomFields.organizationInfo = {
              ...userWithoutCustomFields.organizationInfo,
            };
            delete userWithoutCustomFields.organizationInfo.customFields;
          }
          const token = await signToken(userWithoutCustomFields);
          Cookies.set("token", String(token), { expires: 30 });
          setUserLoggedIn(true);
        }
        toast({
          title: "Success",
          description: "Login successful",
          variant: "default",
        });
        if (decryptedResponse.user.role === "candidate") {
          const url = isMultiple
            ? `/apply-jobs?o=${decryptedResponse.user.organizationInfo?.name}`
            : "/apply-jobs";
          router.push(url);
        } else if (
          decryptedResponse.user.role === "admin" ||
          decryptedResponse.user.role === "interviewer" ||
          decryptedResponse.user.role === "hr"
        ) {
          router.push("/dashboard");
        }
      } catch (err: unknown) {
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
    ]
  );

  return { handleSubmit, isLoading };
};
