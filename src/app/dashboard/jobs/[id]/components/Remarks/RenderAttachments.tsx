import { Label } from '@/components/ui/label';
import { ImageGallery } from '@/components/ui/image-gallery';
import { PDFViewer } from '@/components/ui/pdf-viewer';
import { Candidate } from '@/types/candidate';
import { RenderOtherFileType } from './RenderOtherFileType';

export function RenderAttachments({
  labelClass,
  localCandidate,
}: {
  labelClass: string;
  localCandidate: Candidate;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-2 contents">
        <Label className={labelClass}>Attachments</Label>

        <div className="flex gap-2 flex-wrap">
          <ImageGallery
            images={localCandidate.attachments.filter((file) => {
              const fileExtension = file.name.split('.').pop()?.toLowerCase();
              return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
                fileExtension || '',
              );
            })}
            // maxPreview={3}
          />
        </div>

        {/* Filter and render PDF files */}
        {localCandidate.attachments
          .filter((file) => {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            return fileExtension === 'pdf';
          })
          .map((file) => (
            <PDFViewer key={file.name} files={[file]} />
          ))}

        {/* Render UI for other file types */}
        {localCandidate.attachments
          .filter((file) => {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            return !['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(
              fileExtension || '',
            );
          })
          .map((file, i) => (
            <RenderOtherFileType key={i} file={file} />
          ))}
      </div>
    </div>
  );
}
