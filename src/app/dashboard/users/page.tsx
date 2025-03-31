"use client";

import { useRouter } from "next/navigation";
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
  User,
} from "@/lib/features/users/usersApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

import { useToast } from "@/hooks/use-toast";
import LoaderSkeletonUsers from "./components/loader-skeleton-users";
import { EditIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import * as Yup from "yup"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Formik, Form, ErrorMessage, Field } from "formik"
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function UsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: users, isLoading, error, refetch } = useGetUsersQuery();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [isOpen, setIsOpen] = useState(false);
  interface SelectedUser{
    id?: string;
    name: string;
    email: string;
    role: string;
    isDeleted?: boolean; // Added isDeleted field
  }
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  useEffect(() => {
    refetch();
  }, []);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);
  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id).unwrap();
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error: unknown) {
      toast({
        title:
          "Error" + (error instanceof Error ? error.message : "Unknown error"),
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };
   
  const handleUpdate = async (values:SelectedUser) => {
    try {
      await updateUser({ id: selectedUser?.id, ...values }).unwrap();
      toast({ title: "Success", description: "User updated successfully" });
      setIsOpen(false);
      refetch();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to update user" + (error instanceof Error ? error.message : ""),
        variant: "destructive",
      });
    }
  }

  const handleEditClick = (user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    isDeleted?: boolean; // Added isDeleted field
  }) => {
    setSelectedUser({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isDeleted: user.isDeleted, // Set isDeleted value
    });
    setIsOpen(true);
  };
  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .trim()
      .strict(true)
      .min(2, "Full Name must be at least 2 characters long")
      .max(20, "Full Name cannot exceed 20 characters")
      .matches(/^(?!\s+$).*/, "Full Name cannot be only spaces")
      .required("Full Name is required"),
    email: Yup.string()
      .required("Email is required")
      .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid Email"),
    role: Yup.string()
      .oneOf(["hr", "interviewer", "admin"], "Invalid role")
      .required("Role is required"),
  });

  if (isLoading) {
    return <LoaderSkeletonUsers />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">Error loading users</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="w-[100%] py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
            <p className="text-muted-foreground text-lg">No users found</p>
            <Button onClick={() => router.push("/auth/signup")}>
              Create First User
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-[100%] py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users</CardTitle>
          <Button onClick={() => router.push("/auth/signup")}>
            Create User
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user:User) => (
                <TableRow key={user._id}>
                  <TableCell>
                    {user.name}
                    {user.isDeleted && (
                      <Badge className="ml-2 bg-red-500 hover:bg-red-600">Deleted</Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="flex flex-row justify-between items-center">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUserIdToDelete(user._id); 
                        setShowDeleteDialog(true);
                      }}
                      disabled={isDeleting || user.isDeleted}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => handleEditClick(user)}
                      disabled={isUpdating}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the user? You can always reactivate the user from edit form.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if(userIdToDelete){
                  handleDelete(userIdToDelete);
                  setUserIdToDelete(null); 
                }
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedUser && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              validationSchema={validationSchema}
              onSubmit={handleUpdate}
            >
              {({ handleChange, handleBlur, handleSubmit, values, setFieldValue }) => (
                <Form className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Field as={Input} name="name" onChange={handleChange} onBlur={handleBlur} value={values.name} />
                    <ErrorMessage name="name" component="div" className="text-red-500 text-sm" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Field as={Input} name="email" onChange={handleChange} onBlur={handleBlur} value={values.email} />
                    <ErrorMessage name="email" component="div" className="text-red-500 text-sm" />
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
                    <ErrorMessage name="role" component="div" className="text-red-500 text-sm" />
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
                      <p className="ml-2">
                        Deactivate user
                      </p>
                    </Label>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={isUpdating} onClick={() => handleSubmit()}>
                      Update
                    </Button>
                  </DialogFooter>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
