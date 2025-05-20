"use client";

import { useRouter } from "next/navigation";
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  User,
} from "@/lib/features/users/usersApi";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import LoaderSkeletonUsers from "./components/loader-skeleton-users";
import { useEffect, useState } from "react";
import withAuthGuard from "@/components/withAuthGuard";
import { ResetPasswordDialog } from "./components/passworResetDialog";
import ConfirmationDialog from "../jobs/[id]/components/ConfirmationDialog";
import { EditUserDialog } from "./components/Edit-user-dialog";
import { UserTableRow } from "./components/User-Table-Row";

function UsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: users, isLoading, error, refetch } = useGetUsersQuery();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  interface SelectedUser {
    id?: string;
    name: string;
    email: string;
    role: string;
    isDeleted?: boolean; // Added isDeleted field
  }
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [selectedPasswordUser, setSelectedPasswordUser] = useState<{
    candidateId: string;
    name: string;
  } | null>(null);
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

  const handlePasswordClick = (candidateId: string, name: string) => {
    setSelectedPasswordUser({
      candidateId,
      name,
    });
    setIsPasswordOpen(true);
  };

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
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user: User) => (
                <UserTableRow
                  key={user._id}
                  user={user}
                  isDeleting={isDeleting}
                  isUpdating={isDeleting}
                  onDeleteClick={() => {
                    setUserIdToDelete(user._id);
                    setShowDeleteDialog(true);
                  }}
                  onEditClick={handleEditClick}
                  onPasswordClick={handlePasswordClick}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        setIsOpen={setShowDeleteDialog}
        title="Delete User"
        message="Are you sure you want to delete the user? You can always
              reactivate the user from edit form."
        onConfirm={() => {
          if (userIdToDelete) {
            handleDelete(userIdToDelete);
            setUserIdToDelete(null);
          }
          setShowDeleteDialog(false);
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {selectedUser && (
        <EditUserDialog
          isOpen={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setSelectedUser(null);
          }}
          selectedUser={selectedUser}
          onSuccess={refetch}
        />
      )}
      {selectedPasswordUser && (
        <ResetPasswordDialog
          isOpen={isPasswordOpen}
          onOpenChange={(open) => {
            setIsPasswordOpen(open);
            if (!open) setSelectedPasswordUser(null);
          }}
          candidateId={selectedPasswordUser.candidateId}
          name={selectedPasswordUser.name}
        />
      )}
    </div>
  );
}

export default withAuthGuard(UsersPage, {
  requiredRoles: ["admin"],
  fallbackPath: "/dashboard",
  checkAllowance: false,
  allowAuthenticated: true,
});
