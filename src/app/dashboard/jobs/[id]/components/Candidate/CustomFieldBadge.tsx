import { Badge } from '@/components/ui/badge';
import { FileData } from '@/Custom_Fields/hooks/useCustomForm';
import { Dayjs } from 'dayjs';
import AttachmentsPopover from '../Remarks/attachments-popover';

function CustomFieldBadge({
  kii,
  value,
}: {
  kii: string;
  value: string | number | boolean | string[] | Dayjs | File[] | FileData[];
}) {
  return (
    <Badge
      variant="secondary"
      className="flex h-auto min-h-6 max-w-full flex-col items-start gap-1 break-words p-2"
    >
      {/* <span className="font-medium text-xs shrink-0 w-4/5 break-words hyphens-auto">
          {key}:
        </span>
        <span className="font-bold text-xs  break-words hyphens-auto overflow-wrap-anywhere leading-tight">
          {String(value)}
        </span> */}
      <p className="text-[11px] font-thin text-gray-500">
        {kii.split(' |||||(')[0]}
      </p>
      {typeof value === 'string' && (
        <p className="overflow-wrap-anywhere hyphens-auto break-words text-xs font-bold leading-tight">
          {value}
        </p>
      )}
      {Array.isArray(value) && value.length > 0 && (
        <AttachmentsPopover
          attachments={value.map((file, index) => {
            if (typeof file === 'string') {
              return {
                id: '',
                name: '',
                url: '',
                type: '',
                size: 0,
              };
            }
            return {
              id: `${kii}-${index}-${file.name}`,
              name: file.name,
              url: (file as FileData).base64 || '#',
              type: file.type || 'unknown',
              size: file.size || 0,
            };
          })}
          onMoreClick={() => null}
        />
      )}
      {/* Renders nothing if neither condition above matches */}
    </Badge>
  );
}

export default CustomFieldBadge;
