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
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "hr":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "admin":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
      case "system":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <TableRow key={user._id}>
      <TableCell>
        {user.isDeleted && (
          <div className="flex items-center gap-2">
            <span className="line-through text-muted-foreground italic">
              {user.name}
            </span>
            <Badge variant="destructive">Deleted</Badge>
          </div>
        )}

        {!user.isDeleted && <span>{user.name}</span>}
      </TableCell>

      <TableCell>
        <span className="px-2.5 py-1 bg-primary-foreground rounded-lg">
          {user.email}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={`capitalize px-2.5 py-1 rounded-md  ${getRoleBadgeColor(user.role)}`}
        >
          {user.role}
        </span>
      </TableCell>
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
              {isDeleting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
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
              disabled={isUpdating || user.role === "interviewer" || user.isDeleted}
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
        {user.role !== "system" && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onEditClick(user)}
            disabled={isUpdating}
            className="bg-white dark:bg-black border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <EditIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </Button>
        )}
        {user.role === "system" && (
          <span className="text-sm text-muted-foreground py-2">
            No actions available
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}
