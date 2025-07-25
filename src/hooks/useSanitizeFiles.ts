import { wierdFileNamePattern } from "@/lib/constants";
import { useCallback } from "react";

export const useSanitizeFiles = () => {
  const sanitizeFiles = useCallback((files: any[]): any[] => {
    return files.map((file) => {
      // Handle standard File objects
      if (file instanceof File) {
        const sanitizedBaseName = file.name
          .replace(wierdFileNamePattern, "")
          .replace("/ /", "_");
        return new File([file], sanitizedBaseName, {
          type: file.type,
          lastModified: file.lastModified,
        });
      }

      // Handle custom file objects with URL - while renaming
      if (file && typeof file === "object" && "name" in file) {
        const sanitizedBaseName = file.name
          .replace(wierdFileNamePattern, "")
          .replace("/ /", "_");
        return {
          ...file,
          name: sanitizedBaseName,
        };
      }

      // Fallback: return unchanged if neither type matches
      return file;
    });
  }, []);

  return { sanitizeFiles };
};
