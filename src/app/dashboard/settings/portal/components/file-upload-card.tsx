import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { FileUpload, PortalSettings } from "../types";

export const FileUploadCard = ({
  title,
  description,
  file,
  type,
  accept = "image/*",
  maxSize,
  removeFile,
  handleFileUpload
}: {
  title: string;
  description: string;
  file: FileUpload | null;
  type: keyof PortalSettings;
  accept?: string;
  maxSize?: string;
  removeFile?: (file: string) => void;
  handleFileUpload?: (file, type) => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {file ? (
        <div className="relative group">
          <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
            {file.type.startsWith("image/") ? (
              <Image
                src={file.url}
                alt={file.name}
                fill
                className="object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">{file.name}</p>
              </div>
            )}
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeFile(type)}
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
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, type);
            }}
          />
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to upload {maxSize && `(max ${maxSize})`}
            </p>
          </div>
        </label>
      )}
    </CardContent>
  </Card>
);
