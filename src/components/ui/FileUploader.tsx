'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';

interface FileUploaderProps {
  onSubmit: (files: File[]) => void;
}

export function FileUploader({ onSubmit }: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
    },
  });

  const handleSubmit = () => {
    onSubmit(files);
    setFiles([]);
  };

  return (
    <div className="mb-6">
      <div
        {...getRootProps()}
        className={`cursor-pointer border-2 border-dashed p-8 text-center ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here...</p>
        ) : (
          <p>Drag and drop CV files or ZIP, or click to select files</p>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Selected Files:</h3>
          <ul className="list-disc pl-5">
            {files.map((file, index) => (
              /* eslint-disable-next-line react/no-array-index-key */
              <li key={index}>{file.name}</li>
            ))}
          </ul>
          <Button onClick={handleSubmit} variant="info" className="mt-4">
            Process Files
          </Button>
        </div>
      )}
    </div>
  );
}
