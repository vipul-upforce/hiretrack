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
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTestConnection } from "@/hooks/use-test-connection";

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
  const user = JSON.parse(Cookies.get("user") || "{}");
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  const { testConnection, isConnectionSuccessful, isTesting } = useTestConnection();

  const { data, isLoading, refetch } = useGetFSConfigsQuery(undefined);
  const [updateStorageConfigs, { isLoading: isUpdating }] =
    useUpdateFSConfigsMutation();

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
      Cookies.set("user", JSON.stringify(updatedUser), { expires: 7 });
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

  const handleTestConnection = async (values: typeof initialValues) => {
    await testConnection(values.storageType as 'cloudinary' | 's3' | 'smtp', {
      // Cloudinary credentials
      cloud_name: values.cloudinaryCloudName,
      api_key: values.cloudinaryApiKey,
      api_secret: values.cloudinaryApiSecret,
      // AWS credentials
      accessKeyId: values.awsAccessKeyId,
      secretAccessKey: values.awsSecretAccessKey,
      region: values.awsRegion,
      bucketName:values.awsBucketName,
      // SMTP credentials (if needed)
      user: "",
      pass: "",
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, handleChange, isSubmitting, setFieldValue }) => (
        <Form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileStorage">Select Storage Option</Label>
            <select
              id="storageType"
              name="storageType"
              value={values.storageType}
              onChange={handleChange}
              className="border rounded-md p-2 w-full"
            >
              {storageOptions.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <ErrorMessage
              name="fileStorage"
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
                    setFieldValue("cloudinaryCloudName", e.target.value.trim())
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
                      setFieldValue("cloudinaryApiKey", e.target.value.trim())
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
                      setFieldValue("awsSecretAccessKey", e.target.value.trim())
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

          <div className="w-full flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      type="submit"
                      disabled={
                        (values.storageType !=="local") && (isSubmitting || isUpdating || !isConnectionSuccessful)
                      }
                      title={
                        !isConnectionSuccessful
                          ? "Test the connection before saving."
                          : ""
                      }
                    >
                      {isSubmitting || isUpdating
                        ? "Saving..."
                        : "Save Settings"}
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
  );
}
