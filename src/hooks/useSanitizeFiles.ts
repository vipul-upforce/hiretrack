// useSanitizeFiles.ts
import { wierdFileNamePattern } from "@/lib/constants";
// import path from "path";
import { useCallback } from "react";

export const useSanitizeFiles = () => {
  const sanitizeFiles = useCallback((files: File[]): File[] => {
    return files.map((file) => {
      // const parsed = path.parse(file.name);
      const parsed = file;
      const sanitizedBaseName = parsed.name.replace(wierdFileNamePattern, "");
      // const newName = sanitizedBaseName + parsed.ext;
      const newName = sanitizedBaseName;

      return new File([file], newName, {
        type: file.type,
        lastModified: file.lastModified,
      });
    });
  }, []);

  return { sanitizeFiles };
};
