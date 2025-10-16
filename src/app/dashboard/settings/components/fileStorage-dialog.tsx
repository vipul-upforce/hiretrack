"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import {
  useGetFSConfigsQuery,
  useUpdateFSConfigsMutation,
} from "@/lib/features/settings/settingsApi";
import Cookies from "js-cookie";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTestConnection } from "@/hooks/use-test-connection";
import * as jose from "jose";
import CryptoJS from "crypto-js";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { useDispatch, useSelector } from "react-redux";
import { updateUser as updateUserInState } from "@/lib/redux/authSlice";

interface User {
  id: string;
  name: string;
  email: string;
  fileStorage?: string;
  organizationId?: string;
}

const storageOptions = [
  { key: "local", label: "Local Storage" },
  { key: "cloudinary", label: "Cloudinary" },
  { key: "s3", label: "AWS S3" },
];

export default function FileStorageOptions({
  onClose,
}: {
  onClose: () => void;
}) {
  // const [user, setuser] = useState<User | null>(null);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const { testConnection, isConnectionSuccessful, isTesting } =
    useTestConnection();

  const { data, isLoading, refetch } = useGetFSConfigsQuery(undefined);
  const [updateStorageConfigs, { isLoading: isUpdating }] =
    useUpdateFSConfigsMutation();

  const signToken = async (payload: unknown) => {
    const JWT_SECRET =
      // process.env.JWT_SECRET ||
      // process.env.NEXT_PUBLIC_JWT_SECRET ||
      "hgerguhurhg_egosh_eohe_egjhagbqyuqwertyuiop";
    // console.log(JWT_SECRET, "JWT_SECRET-4");
    try {
      // Parse the payload as JSON
      const parsedPayload = payload;
      const encryptedPayload = CryptoJS.AES.encrypt(
        JSON.stringify(parsedPayload),
        JWT_SECRET
      ).toString();
      // Create a secret key for signing
      const secretKey = new TextEncoder().encode(JWT_SECRET);
      // Sign the JWT
      const jwt = await new jose.SignJWT({ user: encryptedPayload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secretKey);

      return jwt;
    } catch {}
  };

  // useEffect(() => {
  //   (async () => {
  //     const token = Cookies.get("token");
  //     if (token) {
  //       const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
  //       if (decryptedResponse.success && decryptedResponse.user) {
  //         setuser(decryptedResponse.user);
  //       }
  //     }
  //   })();
  // }, []);

  const initialValues = {
    storageType: data?.fileStorage?.storageType || "local",
    cloudinaryCloudName: data?.fileStorage?.cloudinaryCloudName || "",
    cloudinaryApiKey: data?.fileStorage?.cloudinaryApiKey || "",
    cloudinaryApiSecret: data?.fileStorage?.cloudinaryApiSecret || "",
    awsRegion: data?.fileStorage?.awsRegion || "",
    awsAccessKeyId: data?.fileStorage?.awsAccessKeyId || "",
    awsSecretAccessKey: data?.fileStorage?.awsSecretAccessKey || "",
    awsBucketName: data?.fileStorage?.awsBucketName || "",
  };

  const validationSchema = Yup.object({
    storageType: Yup.string()
      .oneOf(
        storageOptions.map((option) => option.key),
        "Invalid storage type"
      )
      .required("Storage type is required"),

    cloudinaryCloudName: Yup.string()
      .trim()
      .when("storageType", {
        is: "cloudinary",
        then: (schema) => schema.required("Cloud name is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    cloudinaryApiKey: Yup.string()
      .trim()
      .when("storageType", {
        is: "cloudinary",
        then: (schema) => schema.required("API Key is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    cloudinaryApiSecret: Yup.string()
      .trim()
      .when("storageType", {
        is: "cloudinary",
        then: (schema) => schema.required("API Secret is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    awsRegion: Yup.string()
      .trim()
      .when("storageType", {
        is: "s3",
        then: (schema) => schema.required("AWS Region is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    awsAccessKeyId: Yup.string()
      .trim()
      .when("storageType", {
        is: "s3",
        then: (schema) => schema.required("AWS Access Key ID is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    awsSecretAccessKey: Yup.string()
      .trim()
      .when("storageType", {
        is: "s3",
        then: (schema) => schema.required("AWS Secret Access Key is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

    awsBucketName: Yup.string()
      .trim()
      .when("storageType", {
        is: "s3",
        then: (schema) => schema.required("AWS Bucket Name is required"),
        otherwise: (schema) => schema.notRequired(),
      }),
  });

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      await updateStorageConfigs(values).unwrap();
      toast({
        title: "Success",
        description: "Storage settings updated successfully",
      });
      const updatedUser = { ...user, fileStorage: values.storageType };
      const token = await signToken(updatedUser);
      // Cookies.set("token", String(token), {
      //   expires: 30,
      //   // maxAge: 30 * 24 * 60 * 60,
      // });

      refetch();

      if (user && values.storageType) {
        // Update the Redux state with the new user data
        dispatch(
          updateUserInState({
            ...values,
            fileStorage: values.storageType,
          })
        );
      }
      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update storage settings",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async (values: typeof initialValues) => {
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
      // SMTP credentials (if needed)
      user: "",
      pass: "",
    });
  };

  if (isLoading) return <div className="px-6 py-4">Loading...</div>;

  return (
    <>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, handleChange, isSubmitting, setFieldValue }) => (
          <Form className="flex flex-col h-full">
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fileStorage">Select Storage Option</Label>
                <Select
                  value={values.storageType}
                  onValueChange={(value) => setFieldValue("storageType", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select storage option" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageOptions.map(({ key, label }) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorMessage
                  name="storageType"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              {values.storageType === "cloudinary" && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cloudinaryCloudName">Cloud Name</Label>
                    <Input
                      id="cloudinaryCloudName"
                      name="cloudinaryCloudName"
                      value={values.cloudinaryCloudName}
                      onChange={(e) =>
                        setFieldValue(
                          "cloudinaryCloudName",
                          e.target.value.trim()
                        )
                      }
                    />
                    <ErrorMessage
                      name="cloudinaryCloudName"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cloudinaryApiKey">Cloudinary API Key</Label>
                    <div className="relative">
                      <Input
                        id="cloudinaryApiKey"
                        name="cloudinaryApiKey"
                        type={showKey ? "text" : "password"}
                        value={values.cloudinaryApiKey}
                        onChange={(e) =>
                          setFieldValue(
                            "cloudinaryApiKey",
                            e.target.value.trim()
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {!showKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <ErrorMessage
                      name="cloudinaryApiKey"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cloudinaryApiSecret">
                      Cloudinary API Secret
                    </Label>
                    <div className="relative">
                      <Input
                        id="cloudinaryApiSecret"
                        name="cloudinaryApiSecret"
                        type={showSecret ? "text" : "password"}
                        value={values.cloudinaryApiSecret}
                        onChange={(e) =>
                          setFieldValue(
                            "cloudinaryApiSecret",
                            e.target.value.trim()
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {!showSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <ErrorMessage
                      name="cloudinaryApiSecret"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestConnection(values)}
                      disabled={isTesting}
                    >
                      {isTesting ? "Testing..." : "Test Credentials"}
                    </Button>
                  </div>
                </div>
              )}

              {values.storageType === "s3" && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="awsRegion">AWS Region</Label>
                    <Input
                      id="awsRegion"
                      name="awsRegion"
                      value={values.awsRegion}
                      onChange={(e) =>
                        setFieldValue("awsRegion", e.target.value.trim())
                      }
                    />
                    <ErrorMessage
                      name="awsRegion"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awsAccessKeyId">AWS Access Key ID</Label>
                    <div className="relative">
                      <Input
                        id="awsAccessKeyId"
                        name="awsAccessKeyId"
                        type={showKey ? "text" : "password"}
                        value={values.awsAccessKeyId}
                        onChange={(e) =>
                          setFieldValue("awsAccessKeyId", e.target.value.trim())
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {!showKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <ErrorMessage
                      name="awsAccessKeyId"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awsSecretAccessKey">
                      AWS Secret Access Key
                    </Label>
                    <div className="relative">
                      <Input
                        id="awsSecretAccessKey"
                        name="awsSecretAccessKey"
                        type={showSecret ? "text" : "password"}
                        value={values.awsSecretAccessKey}
                        onChange={(e) =>
                          setFieldValue(
                            "awsSecretAccessKey",
                            e.target.value.trim()
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {!showSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <ErrorMessage
                      name="awsSecretAccessKey"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awsBucketName">AWS Bucket Name</Label>
                    <Input
                      id="awsBucketName"
                      name="awsBucketName"
                      value={values.awsBucketName}
                      onChange={(e) =>
                        setFieldValue("awsBucketName", e.target.value.trim())
                      }
                    />
                    <ErrorMessage
                      name="awsBucketName"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestConnection(values)}
                      disabled={isTesting}
                    >
                      {isTesting ? "Testing..." : "Test Credentials"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border/10 px-6 py-4 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isUpdating}
              >
                Cancel
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={
                          values.storageType !== "local" &&
                          (isSubmitting ||
                            isUpdating ||
                            !isConnectionSuccessful)
                        }
                        title={
                          !isConnectionSuccessful
                            ? "Test the connection before saving."
                            : ""
                        }
                      >
                        {isSubmitting || isUpdating ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Test Connection To Make It Enable</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
