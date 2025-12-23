import { Button } from '@/components/ui/button';
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import { FileUpload, PortalSettings } from '../types';

interface FileUploadCardProps {
  title: string;
  description: string;
  file: FileUpload | null;
  type: keyof PortalSettings;
  accept?: string;
  maxSize?: string;
  removeFile?: (key: keyof PortalSettings) => void;
  handleFileUpload?: (uploadedFile: File, key: keyof PortalSettings) => void;
}

export function FileUploadCard({
  title,
  description,
  file,
  type,
  accept = 'image/*',
  maxSize,
  removeFile,
  handleFileUpload,
}: FileUploadCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {file ? (
          <div className="group relative">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              {file.type?.startsWith('image/') ? (
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">{file.name}</p>
                </div>
              )}
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => removeFile?.(type)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="block">
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const thisFile = e.target.files?.[0];
                if (thisFile) handleFileUpload?.(thisFile, type);
              }}
            />
            <div className="cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-muted-foreground/50">
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload {maxSize && `(max ${maxSize})`}
              </p>
            </div>
          </label>
        )}
      </CardContent>
    </Card>
  );
}
