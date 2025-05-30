"use client";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReactNode } from "react";

interface LaneOptionsMenuProps {
  laneId: string;
  onEdit: (id: string) => void;
  isOpen: boolean;
  handleDeleteLane: () => void;
  setLaneToDelete: (laneId: string) => void;
  setLaneToEdit: (laneId: string) => void;
  setIsOpen: (open: boolean) => void;
}
interface MenuItemProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

const MenuItem = ({ icon, label, onClick, className = "" }: MenuItemProps) => (
  <div
    className={`flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-gray-100 ${className}`}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </div>
);

export function LaneOptionsMenu({
  laneId,
  handleDeleteLane,
  setLaneToDelete,
  setLaneToEdit,
  onEdit,
  isOpen,
  setIsOpen,
}: LaneOptionsMenuProps) {
  const menuItems = [
    {
      icon: <Edit className="mr-2 h-4 w-4" />,
      label: "Edit",
      onClick: () => {
        onEdit(laneId);
        setLaneToEdit(laneId);
      },
    },
    {
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      label: "Delete",
      onClick: () => {
        handleDeleteLane();
        setLaneToDelete(laneId);
      },
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`opacity-1 transition duration-300 p-1.5 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 ${isOpen ? "opacity-100" : ""}`}
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {menuItems.map((item, index) => (
          <div key={item.label}>
            {index > 0 && <DropdownMenuSeparator />}
            <MenuItem
              icon={item.icon}
              label={item.label}
              onClick={item.onClick}
            />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
