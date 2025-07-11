"use client";
import { useState, useCallback } from "react";
import {
  MoreVertical,
  Edit,
  Trash2,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface LaneOptionsMenuProps {
  laneId: string;
  onEdit: (id: string) => void;
  onSort: (field: string, direction: "asc" | "desc") => void;
  handleDeleteLane: () => void;
  setLaneToDelete: (laneId: string) => void;
  setLaneToEdit: (laneId: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface MenuItemProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

interface SortField {
  label: string;
  value: string;
}

const MenuItem = ({ icon, label, onClick, className = "" }: MenuItemProps) => (
  <button
    className={cn(
      "flex items-center justify-between w-full px-2 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100",
      className
    )}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const SORT_FIELDS: SortField[] = [
  { label: "Date Created", value: "createdAt" },
  { label: "Assignment Date", value: "assignmentDate" },
  { label: "Experience", value: "experience" },
  { label: "Overall AI Score", value: "aiScore" },
  { label: "Current CTC", value: "ctc" },
  { label: "Expected CTC", value: "expectedCtc" },
  { label: "Notice Period", value: "noticePeriod" },
  { label: "Last Modified Date", value: "lastModified" },
  { label: "Alphabatical ", value: "name" },
];

export function LaneOptionsMenu({
  laneId,
  handleDeleteLane,
  setLaneToDelete,
  setLaneToEdit,
  onEdit,
  onSort,
  isOpen,
  setIsOpen,
}: LaneOptionsMenuProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedSortField, setSelectedSortField] =
    useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSortApply = useCallback(() => {
    onSort(selectedSortField, sortDirection);
    //setShowSortMenu(false);
    //setIsOpen(false);
  }, [selectedSortField, sortDirection, onSort, setIsOpen]);

  const handleSortFieldSelect = useCallback((field: string) => {
    setSelectedSortField(field);
  }, []);

  const handleSortDirection = useCallback((direction: "asc" | "desc") => {
    setSortDirection(direction);
  }, []);

  const menuItems = [
    {
      icon: <Edit className="mr-2 h-4 w-4" />,
      label: "Edit",
      onClick: () => {
        onEdit(laneId);
        setLaneToEdit(laneId);
        setIsOpen(false);
      },
    },
    {
      icon: <ArrowUpDown className="mr-2 h-4 w-4" />,
      label: "Sort",
      onClick: () => {
        setShowSortMenu(!showSortMenu);
      },
    },
    {
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      label: "Delete",
      onClick: () => {
        handleDeleteLane();
        setLaneToDelete(laneId);
        setIsOpen(false);
      },
    },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "p-1.5 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors overflow-x-visible",
          isOpen ? "bg-gray-200" : ""
        )}
      >
        <Button
          onClick={() => setShowSortMenu(false)}
          variant="ghost"
          size="icon"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 overflow-visible ">
        {
          <>
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
          </>
        }
        {showSortMenu && (
          <div className="w-64 animate-fade-in-right absolute top-0  bg-white border border-gray-200 rounded-lg shadow-lg p-4 overflow-x-scroll sort-menu pb-0">
            <div className="flex items-center justify-between ">
              <span className="font-thin text-muted-foreground ml-2">
                Sort Candidates by
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={() => setShowSortMenu(false)}
                aria-label="Back to main menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {SORT_FIELDS.map((field) => (
                <button
                  key={field.value}
                  className={cn(
                    "flex items-center px-2 py-1 rounded hover:bg-gray-100 text-left transition-colors justify-between",
                    selectedSortField === field.value
                      ? "bg-gray-100 font-semibold"
                      : ""
                  )}
                  onClick={() => {
                    handleSortFieldSelect(field.value);
                    handleSortApply();
                  }}
                  aria-pressed={selectedSortField === field.value}
                >
                  <span>{field.label}</span>
                  {/* {selectedSortField === field.value && (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )} */}
                  {sortDirection === "asc" &&
                    field.value === selectedSortField && (
                      <Button
                        className="w-8 h-8 rounded-full"
                        variant={"outline"}
                        size="sm"
                        onClick={() => handleSortDirection("desc")}
                        aria-pressed={sortDirection === "asc"}
                      >
                        <SortAsc />
                      </Button>
                    )}
                  {sortDirection === "desc" &&
                    field.value === selectedSortField && (
                      <Button
                        className="w-8 h-8 rounded-full"
                        variant={"outline"}
                        size="sm"
                        onClick={() => handleSortDirection("asc")}
                        aria-pressed={sortDirection === "desc"}
                      >
                        <SortDesc />
                      </Button>
                    )}
                </button>
              ))}
            </div>
            <div className="mb-4">
              {/* <div className="text-xs text-muted-foreground mb-2">by</div> */}
            </div>
            {/* <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-2">Order</div>
              <div className="flex gap-2">
                <Button
                  variant={sortDirection === "asc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSortDirection("asc")}
                  aria-pressed={sortDirection === "asc"}
                >
                  Ascending
                </Button>
                <Button
                  variant={sortDirection === "desc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSortDirection("desc")}
                  aria-pressed={sortDirection === "desc"}
                >
                  Descending
                </Button>
              </div>
            </div> */}
            {/* <div className="flex justify-end">
              <Button size="sm" onClick={handleSortApply}>
                Apply
              </Button>
            </div> */}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
