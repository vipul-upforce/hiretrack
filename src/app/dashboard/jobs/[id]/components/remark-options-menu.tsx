"use client";
import { MoreVertical, Edit, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface RemarkOptionsMenuProps {
  remarkId: string;
  isPrivate: boolean;
  onTogglePrivacy: (id: string, isPrivate: boolean) => void;
  onEdit: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function RemarkOptionsMenu({
  remarkId,
  isPrivate,
  onTogglePrivacy,
  onEdit,
  isOpen,
  setIsOpen,
}: RemarkOptionsMenuProps) {
  const handlePrivacyToggle = (checked: boolean) => {
    return onTogglePrivacy(remarkId, checked);
  };

  const handleEdit = () => {
    return onEdit(remarkId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`opacity-0 group-hover:opacity-100 transition duration-300 p-1.5 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 ${isOpen ? "opacity-100" : ""}`}
      >
        <MoreVertical className="h-4 w-4" />
        <span className="sr-only">Open options</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center space-x-2">
            {isPrivate ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
            <Label htmlFor="privacy-toggle" className="text-sm">
              {isPrivate ? "Private" : "Public"}
            </Label>
          </div>
          <Switch
            id="privacy-toggle"
            checked={isPrivate}
            onCheckedChange={handlePrivacyToggle}
            className="w-8 h-4 drop-shadow-lg border border-1 border-solid"
          />
        </div>
        <DropdownMenuSeparator />
        <div
          className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-gray-100"
          onClick={handleEdit}
        >
          Edit
          <Edit className="mr-2 h-4 w-4" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
