import { wierdFileNamePattern } from '@/lib/constants';
import { useCallback } from 'react';

type CustomFile = {
  name: string;
  [key: string]: unknown;
};

type FileInput = File | CustomFile;

export const useSanitizeFiles = () => {
  const sanitizeFiles = useCallback(
    <T extends FileInput>(files: T[]): T[] =>
      files.map((file) => {
        // Handle standard File objects
        if (file instanceof File) {
          const sanitizedBaseName = file.name
            .replace(wierdFileNamePattern, '')
            .replace('/ /', '_');

          return new File([file], sanitizedBaseName, {
            type: file.type,
            lastModified: file.lastModified,
          }) as unknown as T;
        }

        // Handle custom file objects with URL - while renaming
        if (file && typeof file === 'object' && 'name' in file) {
          const sanitizedBaseName = file.name
            .replace(wierdFileNamePattern, '')
            .replace('/ /', '_');
          return {
            ...file,
            name: sanitizedBaseName,
          } as T;
        }

        // Fallback
        return file;
      }),
    [],
  );

  return { sanitizeFiles };
};
