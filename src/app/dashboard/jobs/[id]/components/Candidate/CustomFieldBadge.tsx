import { Badge } from "@/components/ui/badge";
import { FileData } from "@/Custom_Fields/hooks/useCustomForm";
import { Dayjs } from "dayjs";

const CustomFieldBadge = ({
  kii,
  value,
}: {
  kii: string;
  value: string | number | boolean | string[] | Dayjs | File[] | FileData[];
}) => (
  <Badge
    variant="secondary"
    className={`max-w-full flex break-words items-start gap-1 p-2 h-auto min-h-6 flex-col`}
  >
    {/* <span className="font-medium text-xs shrink-0 w-4/5 break-words hyphens-auto">
          {key}:
        </span>
        <span className="font-bold text-xs  break-words hyphens-auto overflow-wrap-anywhere leading-tight">
          {String(value)}
        </span> */}
    <p className="text-[11px] font-thin text-gray-500">{kii}</p>
    <p>{String(value)}</p>
  </Badge>
);

export default CustomFieldBadge;
