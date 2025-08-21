"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Users,
  Trash2,
  CheckCircle,
  ArrowDown,
} from "lucide-react";

interface MigrationDialogProps {
  isOpen: boolean;
  lanes: string[];
  onClose: () => void;
  onMigrate: (migrationLane: string) => void;
  laneToDelete: string | null;
}

export function MigrationDialog({
  isOpen,
  lanes,
  onClose,
  onMigrate,
  laneToDelete,
}: MigrationDialogProps) {
  const [selectedLane, setSelectedLane] = useState<string | null>(null);

  const handleMigrate = () => {
    if (selectedLane) {
      onMigrate(selectedLane);
    }
  };

  const availableLanes = lanes?.filter((lane) => lane !== laneToDelete) || [];

  if (!lanes || lanes.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-black ">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-gray-100">
            <Users className="h-5 w-5" />
            Migrate Candidates
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-300">
            The lane "{laneToDelete}" contains candidates that need to be moved
            before deletion. Choose a destination lane to migrate all
            candidates.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 px-4 mb-14">
          <div className="flex flex-col items-center gap-4">
            {/* Source Lane */}
            <div className="w-full max-w-md">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                From
              </div>
              <div className="relative">
                <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      {laneToDelete}
                    </span>
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Will be deleted
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-2 pt-4">
              <ArrowDown className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>

            {/* Target Lane */}
            <div className="w-full max-w-md">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                To
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableLanes.map((lane) => (
                  <button
                    key={lane}
                    onClick={() => setSelectedLane(lane)}
                    className={`w-full p-4 py-2 rounded-lg border-2 text-left transition-all duration-200 ${
                      selectedLane === lane
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-600 shadow-md"
                        : "border-gray-200 dark:border-gray-900 bg-white dark:bg-black hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-medium ${
                          selectedLane === lane
                            ? "text-green-700 dark:text-green-300"
                            : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {lane}
                      </span>
                      {selectedLane === lane && (
                        <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 fixed bottom-0 w-full bg-white dark:bg-black border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={!selectedLane}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Migrate & Delete Lane
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
