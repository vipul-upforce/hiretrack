'use client';

import {
  useGetUsersQuery,
  useDeleteUserMutation,
  User,
} from '@/lib/features/users/usersApi';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { UserPlus, Home, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import withAuthGuard from '@/components/withAuthGuard';
import { EmailNotificationSettingsDialog } from '@/components/dialogs/EmailNotificationSettingsDialog';
import LoaderSkeletonUsers from './components/loader-skeleton-users';
import { ResetPasswordDialog } from './components/passworResetDialog';
import ConfirmationDialog from '../jobs/[id]/components/Dialogs/ConfirmationDialog';
import { EditUserDialog } from './components/Edit-user-dialog';
import { UserTableRow } from './components/User-Table-Row';
import { CreateUserDialog } from './components/CreateUserDialog';

function UsersPage() {
  const { toast } = useToast();
  const { data: users = [], isLoading, error, refetch } = useGetUsersQuery();
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteUser] = useDeleteUserMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
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
  const [selectedEmailSettingsUser, setSelectedEmailSettingsUser] = useState<{
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);
  useEffect(() => {
    refetch();
  }, []);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingUserId(id);
    try {
      await deleteUser(id).unwrap();
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    } catch (errorMessage: unknown) {
      toast({
        description: `${typeof errorMessage === 'object' &&
          errorMessage !== null &&
          'data' in errorMessage &&
          typeof errorMessage.data === 'object' &&
          errorMessage.data &&
          'error' in errorMessage.data
          ? (errorMessage.data as { error: string }).error
          : 'Unknown error'
          }`,
        title: 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
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

  const handleEmailSettingsClick = (user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }) => {
    setSelectedEmailSettingsUser(user);
    setIsEmailSettingsOpen(true);
  };

  if (isLoading) {
    return <LoaderSkeletonUsers />;
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-red-500">Error loading users</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <>
        <div className="w-[100%] py-6">
          <Card>
            <CardContent className="flex h-96 flex-col items-center justify-center space-y-4">
              <p className="text-lg text-muted-foreground">No users found</p>
              <Button onClick={() => setIsCreateUserOpen(true)}>
                Create First User
              </Button>
            </CardContent>
          </Card>
        </div>
        <CreateUserDialog
          isOpen={isCreateUserOpen}
          onOpenChange={setIsCreateUserOpen}
          onSuccess={refetch}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header section with improved design and breadcrumbs */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            {/* Left Section - Breadcrumbs */}
            <div className="flex items-center text-sm text-muted-foreground">
              <Link
                href="/dashboard"
                className="flex items-center transition-colors hover:text-foreground"
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
              <ChevronRight className="mx-2 h-4 w-4" />
              <Link
                href="/dashboard/settings"
                className="transition-colors hover:text-foreground"
              >
                Settings
              </Link>
              <ChevronRight className="mx-2 h-4 w-4" />
              <span className="font-semibold text-foreground">
                User Management
              </span>
            </div>

            {/* Right Section - Create User Button */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <Button
                variant="primary"
                onClick={() => setIsCreateUserOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Users</CardTitle>
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
                {users
                  ?.slice()
                  .sort((a, b) => {
                    if (a.role === 'system') return -1;
                    if (b.role === 'system') return 1;
                    return 0;
                  })
                  .map((user: User) => (
                    <UserTableRow
                      key={user._id}
                      user={user}
                      isDeleting={deletingUserId === user._id}
                      isUpdating={false}
                      onDeleteClick={() => {
                        setUserIdToDelete(user._id);
                        setShowDeleteDialog(true);
                      }}
                      onEditClick={handleEditClick}
                      onPasswordClick={handlePasswordClick}
                      onEmailSettingsClick={handleEmailSettingsClick}
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
        {selectedEmailSettingsUser && (
          <EmailNotificationSettingsDialog
            isOpen={isEmailSettingsOpen}
            onOpenChange={(open) => {
              setIsEmailSettingsOpen(open);
              if (!open) setSelectedEmailSettingsUser(null);
            }}
            userId={selectedEmailSettingsUser._id}
            userName={selectedEmailSettingsUser.name}
          />
        )}

        <CreateUserDialog
          isOpen={isCreateUserOpen}
          onOpenChange={setIsCreateUserOpen}
          onSuccess={refetch}
        />
      </div>
    </div>
  );
}

export default withAuthGuard(UsersPage, {
  requiredRoles: ['admin'],
  fallbackPath: '/dashboard',
  checkAllowance: false,
  allowAuthenticated: true,
});
