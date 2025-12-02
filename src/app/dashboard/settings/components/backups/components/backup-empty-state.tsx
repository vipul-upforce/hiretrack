import { Database } from "lucide-react";

export function BackupEmptyState() {
  return (
    <div className="text-center py-8">
      <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-500">No backups found.</p>
      <p className="text-sm text-gray-400 mt-1">
        Create your first backup using the button above.
      </p>
    </div>
  );
}
