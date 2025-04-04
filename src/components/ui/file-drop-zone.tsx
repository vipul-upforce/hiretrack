"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { cn } from "@/lib/utils"
import { Cloud, Pencil } from "lucide-react"
import { FilePreviewDialog } from "./file-preview-dialog"
import { RenameFileDialog } from "./rename-file-dialog"

interface FileData {
  base64: string;
  name: string;
  type: string;
  size: number;
}

interface FileDropZoneProps {
  value: File[] | FileData[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  existingFiles?: Array<{
    name: string;
    type: string;
    size: number;
    preview: string;
  }>;
}

export const FileDropZone = ({
  value,
  onFilesChange,
  maxFiles = 30,
  maxSize = 30 * 1024 * 1024,
  existingFiles = []
}: FileDropZoneProps) => {
  const [previews, setPreviews] = React.useState<{ [key: string]: string }>({})
  const [previewFile, setPreviewFile] = React.useState<File | null>(null)
  const [files, setFiles] = React.useState<File[]>(value as File[])
  const [renameFile, setRenameFile] = React.useState<File | null>(null)

  // Initialize previews with existing files
  React.useEffect(() => {
    if (existingFiles?.length > 0) {
      const existingPreviews = existingFiles.reduce((acc, file) => ({
        ...acc,
        [file.name]: file.preview
      }), {});
      
      setPreviews(prev => ({
        ...prev,
        ...existingPreviews
      }));
    }
  }, [existingFiles]);

  const generatePreviews = React.useCallback(async (newFiles: File[]) => {
    const newPreviews: { [key: string]: string } = {}

    for (const file of newFiles) {
      try {
        const base64 = await fileToBase64(file)
        newPreviews[file.name] = base64
      } catch {
        // toast({
        //   title: `Error generating preview for ${file.name}:`,
        //   description: error instanceof Error ? error.message : 'Unknown error',
        //   variant: 'destructive'
        // })
      }
    }

    setPreviews(prev => ({
      ...prev,
      ...newPreviews
    }))
  }, [])

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  React.useEffect(() => {
    if (files?.length > 0) {
      generatePreviews(files)
    }

    return () => {
      Object.values(previews).forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview)
        }
      })
    }
  }, [files, generatePreviews])

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles)
      setFiles(newFiles)
      onFilesChange(newFiles)
    },
    [files, onFilesChange, maxFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: maxFiles - files?.length,
    maxSize,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt']
    }
  })

  const openPreview = (file: File) => {
    const preview = previews[file.name]
    if (preview) {
      setPreviewFile(file)
    }
  }

 const handleRename = async (newName: string) => {
   if (!renameFile) return;
   
   const fileIndex = files.findIndex(f => f === renameFile);
   if (fileIndex === -1) return;

   // Create a blob from the file content
   const response = await fetch(previews[renameFile.name]);
   const blob = await response.blob();
   
   const newFile = new File([blob], newName, { 
     type: renameFile.type,
     lastModified: renameFile.lastModified 
   });
   
   const updatedFiles = [...files];
   updatedFiles[fileIndex] = newFile;
   
   // Update previews with new filename
   const newPreviews = { ...previews };
   newPreviews[newName] = newPreviews[renameFile.name];
   delete newPreviews[renameFile.name];
   setPreviews(newPreviews);
   
   setFiles(updatedFiles);
   onFilesChange(updatedFiles);
 }

  return (
    <div className="space-y-4 p-0">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/10" : "border-muted"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Cloud className="h-10 w-10 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p>
                Drag & drop files here, or click to select files
                <br />
                <span className="text-xs">
                  (Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each)
                </span>
                <br />
                <span className="text-xs text-muted-foreground">
                  Accepted files: Images (PNG, JPG, GIF), PDF, ZIP, Documents (DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT)
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <FilePreviewDialog
        file={previewFile}
        preview={previewFile ? previews[previewFile.name] : null}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {files?.length > 0 && (
        <div className="grid gap-2">
          {files?.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors group"
            >
              <div 
                className="cursor-pointer transition-transform group-hover:scale-105" 
                onClick={() => openPreview(file)}
              >
                {/* <PreviewComponent file={file} /> */}
              </div>
              <div 
                className="flex-1 w-auto text-sm truncate cursor-pointer"
                onClick={() => openPreview(file)}
              >
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(file.size / 1024)}KB - {file.type || 'Unknown type'}
                </p>
              </div>
              <button
                type="button"
                className="p-2 hover:bg-muted rounded-md"
                onClick={() => setRenameFile(file)}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <RenameFileDialog
        isOpen={!!renameFile}
        onClose={() => setRenameFile(null)}
        fileName={renameFile?.name || ''}
        onRename={handleRename}
      />
    </div>
  )
} 