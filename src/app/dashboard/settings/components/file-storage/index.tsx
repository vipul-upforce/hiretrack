"use client";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@/hooks/use-toast";
import {
  useGetFSConfigsQuery,
  useUpdateFSConfigsMutation,
} from "@/lib/features/settings/settingsApi";
import { updateUser as updateUserInState } from "@/lib/redux/authSlice";
import { useTestConnection } from "@/hooks/use-test-connection";
import { generateOrgJwtSecret } from "@/lib/jwtSecretGenerator";
import * as jose from "jose";
import CryptoJS from "crypto-js";

import FileStorageLoadingSkeleton from "./loading-skeleton";
import FileStorageForm from "./file-storage-form";
import { FileStorageValues } from "./schema";

interface User {
  id: string;
  name: string;
  email: string;
  fileStorage?: string;
  organizationId?: string;
}

export default function FileStorageOptions({
  onClose,
}: {
  onClose: () => void;
}) {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );

  const { data, isLoading, refetch } = useGetFSConfigsQuery(undefined);
  const [updateStorageConfigs, { isLoading: isUpdating }] =
    useUpdateFSConfigsMutation();

  // Connection Testing
  const { testConnection, isConnectionSuccessful, isTesting } =
    useTestConnection();

  const signToken = async (payload: unknown, orgId: string) => {
    const JWT_SECRET = generateOrgJwtSecret(orgId);
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
        .setExpirationTime("7d")
        .sign(secretKey);

      return jwt;
    } catch (error) {
      console.error("Token signing failed", error);
    }
  };

  const initialValues: FileStorageValues = {
    storageType: data?.fileStorage?.storageType || "local",
    cloudinaryCloudName: data?.fileStorage?.cloudinaryCloudName || "",
    cloudinaryApiKey: data?.fileStorage?.cloudinaryApiKey || "",
    cloudinaryApiSecret: data?.fileStorage?.cloudinaryApiSecret || "",
    awsRegion: data?.fileStorage?.awsRegion || "",
    awsAccessKeyId: data?.fileStorage?.awsAccessKeyId || "",
    awsSecretAccessKey: data?.fileStorage?.awsSecretAccessKey || "",
    awsBucketName: data?.fileStorage?.awsBucketName || "",
  };

  const handleTestConnection = async (values: FileStorageValues) => {
    await testConnection(values.storageType as "cloudinary" | "s3" | "smtp", {
      // Cloudinary credentials
      cloud_name: values.cloudinaryCloudName,
      api_key: values.cloudinaryApiKey,
      api_secret: values.cloudinaryApiSecret,
      // AWS credentials
      accessKeyId: values.awsAccessKeyId,
      secretAccessKey: values.awsSecretAccessKey,
      region: values.awsRegion,
      bucketName: values.awsBucketName,
      // SMTP (Placeholder)
      user: "",
      pass: "",
    });
  };

  const handleSubmit = async (values: FileStorageValues) => {
    try {
      await updateStorageConfigs(values).unwrap();

      toast({
        title: "Success",
        description: "Storage settings updated successfully",
      });

      // Update Redux state and sign token
      if (user && user.organizationId) {
        const updatedUser = { ...user, fileStorage: values.storageType };
        await signToken(updatedUser, user.organizationId);

        dispatch(
          updateUserInState({
            ...values,
            fileStorage: values.storageType,
          })
        );
      }

      refetch();
      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update storage settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <FileStorageLoadingSkeleton />;
  }

  return (
    <FileStorageForm
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onTestConnection={handleTestConnection}
      onClose={onClose}
      isSubmitting={false}
      isUpdating={isUpdating}
      isTesting={isTesting}
      isConnectionSuccessful={isConnectionSuccessful}
    />
  );
}
