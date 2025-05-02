"use client";

import { FileIcon } from "lucide-react";
import { useEffect, useState } from "react";

type BackupFile = {
  name: string;
  url: string;
};

export default function BackupsDialog() {
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBackups = async () => {
      try {
        const res = await fetch("/api/backups");
        const data = await res.json();
        setFiles(data.files || []);
        // debugger;
      } catch (err) {
        console.error("Failed to load backups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBackups();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Available Backups</h1>

      {loading ? (
        <p>Loading...</p>
      ) : files.length === 0 ? (
        <p>No backups found.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center space-x-2 w-full">
                <FileIcon className="h-4 w-4" />
                <div className="flex flex-col w-full">
                  <span className="text-sm w-full text-wrap break-all">
                    {file.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={file.url}
                  download={file.name}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}
