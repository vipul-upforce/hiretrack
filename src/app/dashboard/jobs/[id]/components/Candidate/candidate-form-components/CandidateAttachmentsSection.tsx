import { useField, useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/ui/file-upload'; // Assuming desktop version used on desktop
import { MobileFileUpload } from '@/components/ui/file-upload-mobile'; // Assuming mobile used on mobile
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAppSelector } from '@/lib/redux/hooks';
// import { useMediaQuery } from "@/hooks/use-media-query"; // Assuming we might need this, or just use hidden classes

export function CandidateAttachmentsSection() {
  const { setFieldValue } = useFormikContext();
  const [attachmentsField] = useField('attachments');
  const { user } = useAppSelector((state) => state.auth || {});
  const { sanitizeFiles } = useSanitizeFiles();

  // We can determine layout via CSS classes (hidden lg:block etc)
  // duplicating the components slightly or making one component handle both if possible.
  // FileUpload and MobileFileUpload have different props structure.

  const handleFileSelect = (files: File[]) => {
    const sanitizedFiles = sanitizeFiles(files);
    const currentFiles = attachmentsField.value || [];

    const newFiles = sanitizedFiles
      .filter((file) => {
        if (!user && file.size > 3 * 1024 * 1024) {
          toast({
            title: `File "${file.name}" exceeds 3MB. Please upload a smaller file.`,
            variant: 'destructive',
          });
          return false;
        }
        if (
          user &&
          (user.role === 'candidate' || user.role === '') &&
          file.size > 3 * 1024 * 1024
        ) {
          toast({
            title: `File "${file.name}" exceeds 3MB. Please upload a smaller file.`,
            variant: 'destructive',
          });
          return false;
        }
        if (
          user &&
          ['hr', 'admin', 'interviewer'].includes(user.role) &&
          file.size > 50 * 1024 * 1024
        ) {
          toast({
            title: `File "${file.name}" exceeds 50MB. Please upload a smaller file.`,
            variant: 'destructive',
          });
          return false;
        }
        return true;
      })
      .map((file) => {
        let newFileName = file.name;

        const fileExists = currentFiles.some(
          (att: File) => att.name === file.name,
        );

        if (fileExists) {
          const fileExtension = file.name.split('.').pop();
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          newFileName = `${baseName}_${uuidv4()}.${fileExtension}`;
        }

        return new File([file], newFileName, { type: file.type });
      });

    const updatedFileSelection = [...currentFiles, ...newFiles];
    if (
      user &&
      updatedFileSelection.length > 2 &&
      (user.role === 'candidate' || user.role === '')
    ) {
      toast({
        title: 'Maximum 2 files are allowed',
        variant: 'destructive',
      });
      return;
    }
    setFieldValue('attachments', updatedFileSelection);
  };

  const handleSetter = (files: File[]) => {
    const sanitizedFiles = sanitizeFiles(files);
    setFieldValue('attachments', sanitizedFiles);
  };

  return (
    <div className="space-y-4">
      <div className="hidden border-b border-gray-200 pb-2 dark:border-gray-700 lg:block">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          <div className="h-2 w-2 rounded-full bg-cyan-500" />
          Additional Documents
        </h3>
      </div>

      {/* Mobile Label */}
      <Label className="font-semibold lg:hidden">Additional Attachments</Label>

      {/* Mobile Upload */}
      <div className="lg:hidden">
        <MobileFileUpload
          accept={{}}
          maxFiles={
            (user && (user.role === 'candidate' || user.role === '')) || !user
              ? 2
              : 30
          }
          onFileSelect={handleFileSelect}
          files={attachmentsField.value}
          setter={handleSetter}
          buttonText="Add Attachments"
        />
      </div>

      {/* Desktop Upload */}
      <div className="hidden lg:block">
        <FileUpload
          accept={{}}
          maxFiles={
            (user && (user.role === 'candidate' || user.role === '')) || !user
              ? 2
              : 30
          }
          isEdit
          onFileSelect={handleFileSelect}
          files={attachmentsField.value}
          setter={handleSetter}
        />
      </div>
    </div>
  );
}
