'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@radix-ui/react-label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useUpdateUserMutation } from '@/lib/features/users/usersApi';
import { useDispatch } from 'react-redux';
import { updateUser as updateUserInState } from '@/lib/redux/authSlice';
import { useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { userFormVaidationSchema } from '../schemas/userFormValidation.schema';

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
  const dispatch = useDispatch();
  const { user } = useAppSelector((state) => state.auth || {});
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (values: SelectedUser) => {
    setIsLoading(true);
    try {
      await updateUser({
        id: selectedUser?.id,
        ...values,
        email: values.email.toLowerCase().trim(),
        name: values.name.trim(),
      }).unwrap();

      // Check if the updated user's email matches the current user's email in state
      if (user && user.email === values.email.toLowerCase().trim()) {
        // Update the Redux state with the new user data
        dispatch(
          updateUserInState({
            ...values,
            email: values.email.toLowerCase().trim(),
            name: values.name.trim(),
          }),
        );
      }

      toast({ title: 'Success', description: 'User updated successfully' });
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: ` ${
          typeof error === 'object' &&
          error !== null &&
          'data' in error &&
          typeof error.data === 'object' &&
          error.data &&
          'error' in error.data
            ? (error.data as { error: string }).error
            : 'Unknown error'
        }`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 pr-12">
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
            <Form className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
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
                  className="text-sm text-red-500"
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
                  className="text-sm text-red-500"
                />
              </div>
              {values.role !== 'system' && (
                <div>
                  <Label>Role</Label>
                  <Select
                    value={values.role}
                    onValueChange={(value) => setFieldValue('role', value)}
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
                    className="text-sm text-red-500"
                  />
                </div>
              )}

              {values.role !== 'system' && (
                <div>
                  <Label className="flex flex-row items-center">
                    <Checkbox
                      id="isDeleted"
                      checked={values.isDeleted}
                      onCheckedChange={(checked) => {
                        setFieldValue('isDeleted', checked);
                      }}
                    />
                    <p className="ml-2">Deactivate user</p>
                  </Label>
                </div>
              )}

              <div className="sticky bottom-0 z-10 flex justify-end border-t bg-background pt-4">
                <Button
                  type="submit"
                  disabled={isUpdating || isLoading}
                  onClick={() => handleSubmit()}
                  variant="primary"
                >
                  {isUpdating && isLoading ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
