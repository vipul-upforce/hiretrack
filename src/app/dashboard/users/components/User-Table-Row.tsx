import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EditIcon, ShieldQuestion, Trash2, Mail } from "lucide-react";
import { User } from "@/lib/features/users/usersApi";
import { format } from "date-fns";

interface UserTableRowProps {
  user: User;
  isDeleting: boolean;
  isUpdating: boolean;
  onDeleteClick: (id: string) => void;
  onEditClick: (user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    isDeleted?: boolean;
  }) => void;
  onPasswordClick: (candidateId: string, name: string) => void;
  onEmailSettingsClick: (user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }) => void;
}

export function UserTableRow({
  user,
  isDeleting,
  isUpdating,
  onDeleteClick,
  onEditClick,
  onPasswordClick,
  onEmailSettingsClick,
}: UserTableRowProps) {
  return (
    <TableRow key={user._id}>
      <TableCell>
        {user.name}
        {user.isDeleted && (
          <Badge className="ml-2 bg-red-500 hover:bg-red-600">Deleted</Badge>
        )}
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell className="capitalize">{user.role}</TableCell>
      <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
      <TableCell className="flex flex-row justify-between items-center gap-2">
        {user.role !== "system" && (
          <div className="flex flex-row items-center gap-2">
            <Button
              variant="destructive"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(user._id);
              }}
              disabled={isDeleting || user.isDeleted}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPasswordClick(user._id, user.name)}
              disabled={isUpdating}
              className="bg-white dark:bg-black border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ShieldQuestion className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </Button>
            {/* Email Settings Button - Show for all roles but disable for interviewers */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (user.role !== "interviewer") {
                  onEmailSettingsClick({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                  });
                }
              }}
              disabled={isUpdating || user.role === "interviewer"}
              className={`bg-white dark:bg-black border-gray-200 dark:border-gray-600 ${
                user.role === "interviewer"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title={
                user.role === "interviewer"
                  ? "Email notifications are always enabled for interviewers"
                  : "Email Notification Settings"
              }
            >
              <Mail
                className={`h-4 w-4 ${
                  user.role === "interviewer"
                    ? "text-gray-400 dark:text-gray-500"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              />
            </Button>
          </div>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onEditClick(user)}
          disabled={isUpdating}
          className="bg-white dark:bg-black border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <EditIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
