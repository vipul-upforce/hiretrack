import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { FormikHelpers } from "formik";
import { useEffect, useState } from "react";
import { PortalConfigValues, PortalHeader } from "./portalConfig-dialog";

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesUploaded: (files: {
    headerHtml?: string;
    footerHtml?: string;
  }) => void;
  onSkip: () => void;
  setFieldValue?: FormikHelpers<any>["setFieldValue"];
  values?: PortalConfigValues;
  handleSubmit?: (e?: React.FormEvent<HTMLFormElement>) => void;
}

export default function FileUploadDialog({
  isOpen,
  onClose,
  onFilesUploaded,
  onSkip,
  setFieldValue,
  values,
}: FileUploadDialogProps) {
  const initialHeaderFile = values?.existingHeaderFile || [];
  const initialFooterFile = values?.existingFooterFile || [];
  const [headerFiles, setHeaderFiles] = useState<File[] | PortalHeader[] >(
    initialHeaderFile instanceof File ? [initialHeaderFile] : []
  );
  const [footerFiles, setFooterFiles] = useState<File[]  | PortalHeader[]>(
    initialFooterFile instanceof File ? [initialFooterFile] : []
  );

  useEffect(() => {
    setHeaderFiles([values?.existingHeaderFile] as File[]);
    setFooterFiles([values?.existingFooterFile] as File[]);
  }, []);

  const readFileContent = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      console.log('file :>> ', file);
      reader.readAsText(file);
    });
    const readFileContentFromUrl = async (url: string): Promise<string> => {
      const response = await fetch(url);
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(blob);
      });
    };
    

    const handleContinue = async () => {
      let headerContent: string | undefined;
      let footerContent: string | undefined;
    
      const headerFile = headerFiles[0];
      const footerFile = footerFiles[0];
    
      if (headerFile) {
        if ('url' in headerFile) {
          headerContent = await readFileContentFromUrl(headerFile.url.toString());
        } else {
          headerContent = await readFileContent(headerFile);
        }
      }
    
      if (footerFile) {
        if ('url' in footerFile) {
          footerContent = await readFileContentFromUrl(footerFile.url.toString());
        } else {
          footerContent = await readFileContent(footerFile);
        }
      }
    
      onFilesUploaded({
        headerHtml: headerContent || values?.headerFile || "",
        footerHtml: footerContent || values?.footerFile || "",
      });
    };
    
    
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload HTML Files</DialogTitle>
        </DialogHeader>

        <FileUpload
          accept={{ "html/*": [".html"] }}
          maxFiles={1}
          files={headerFiles as File[]}
          onFileSelect={async (files) => {
            const txt = await readFileContent(files[0]);
            setHeaderFiles([files[0]]);
            setFieldValue?.("headerFile", txt);
            setFieldValue?.("existingHeaderFile", null);
          }}
          setter={async (files: File[]) => {
            setHeaderFiles(files);
            const txt = await readFileContent(files[0]);
            setFieldValue?.("headerFile", txt);
            setFieldValue?.("existingHeaderFile", null);
          }}
        />

        <FileUpload
          accept={{ "html/*": [".html"] }}
          maxFiles={1}
          onFileSelect={async (files) => {
            const txt = await readFileContent(files[0]);
            setFooterFiles([files[0]]);
            setFieldValue?.("footerFile", txt);
            setFieldValue?.("existingFooterFile", null);
          }}
          files={footerFiles as File[]}
          setter={async (files: File[]) => {
            setFooterFiles(files);
            const txt = await readFileContent(files[0]);
            setFieldValue?.("footerFile", txt);
            setFieldValue?.("existingFooterFile", null);
          }}
        />

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onSkip}>
            Skip & Use Defaults
          </Button>
          <Button onClick={handleContinue}>Continue to Editor</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
