import { ErrorMessage, useFormikContext } from "formik";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAIL_PROVIDERS } from "../constants";
import { SMTPFormValues } from "../types";

export const ProviderSelect = () => {
  const { values, setFieldValue } = useFormikContext<SMTPFormValues>();

  return (
    <div className="space-y-2">
      <Label htmlFor="mailProvider">Mail Provider</Label>
      <Select
        value={values.mailProvider}
        onValueChange={(value) => setFieldValue("mailProvider", value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select mail provider" />
        </SelectTrigger>
        <SelectContent>
          {MAIL_PROVIDERS.filter((p) => p.key !== "").map((provider) => (
            <SelectItem key={provider.key} value={provider.key}>
              {provider.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ErrorMessage
        name="mailProvider"
        component="div"
        className="text-red-500 text-sm"
      />
    </div>
  );
};
