"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Formik, Form, ErrorMessage, Field } from "formik";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useUpdateUserMutation } from "@/lib/features/users/usersApi";
import { userFormVaidationSchema } from "../schemas/userFormValidation.schema";

interface SelectedUser {
  id?: string;
  name: string;
  email: string;
  role: string;
  isDeleted?: boolean;
}

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: SelectedUser | null;
  onSuccess: () => void;
}

export function EditUserDialog({
  isOpen,
  onOpenChange,
  selectedUser,
  onSuccess,
}: EditUserDialogProps) {
  const { toast } = useToast();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const handleUpdate = async (values: SelectedUser) => {
    try {
      await updateUser({
        id: selectedUser?.id,
        ...values,
        email: values.email.toLowerCase().trim(),
        name: values.name.trim(),
      }).unwrap();
      toast({ title: "Success", description: "User updated successfully" });
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          "Error: " +
          (typeof error === "object" &&
          error !== null &&
          "data" in error &&
          typeof error.data === "object" &&
          error.data &&
          "error" in error.data
            ? (error.data as { error: string }).error
            : "Unknown error"),
        variant: "destructive",
      });
    }
  };

  if (!selectedUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={{
            name: selectedUser.name,
            email: selectedUser.email,
            role: selectedUser.role,
            isDeleted: selectedUser.isDeleted || false,
          }}
          validationSchema={userFormVaidationSchema}
          onSubmit={handleUpdate}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            setFieldValue,
          }) => (
            <Form className="space-y-4">
              <div>
                <Label>Name</Label>
                <Field
                  as={Input}
                  name="name"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.name}
                />
                <ErrorMessage
                  name="name"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Field
                  as={Input}
                  name="email"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.email}
                />
                <ErrorMessage
                  name="email"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={values.role}
                  onValueChange={(value) => setFieldValue("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="interviewer">Interviewer</SelectItem>
                  </SelectContent>
                </Select>
                <ErrorMessage
                  name="role"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              <div>
                <Label className="flex flex-row items-center">
                  <Checkbox
                    id="isDeleted"
                    checked={values.isDeleted}
                    onCheckedChange={(checked) => {
                      setFieldValue("isDeleted", checked);
                    }}
                  />
                  <p className="ml-2">Deactivate user</p>
                </Label>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isUpdating}
                  onClick={() => handleSubmit()}
                >
                  Update
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
