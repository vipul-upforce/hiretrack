export interface JobFormProps {
  job?: {
    attachments: {
      files: Array<{
        id: string;
        name: string;
        url: string;
        type: 'pdf';
        size: number;
      }>;
      images: Array<{
        id: string;
        name: string;
        url: string;
        type: 'image';
        size: number;
      }>;
    };
  };
  onRemoveExistingFile?: (fileId: string) => void;
  onRemoveExistingImage?: (imageId: string) => void;
}

