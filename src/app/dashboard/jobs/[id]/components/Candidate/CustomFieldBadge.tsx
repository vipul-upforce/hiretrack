import { Badge } from "@/components/ui/badge";
import { FileData } from "@/Custom_Fields/hooks/useCustomForm";
import { Dayjs } from "dayjs";
import AttachmentsPopover from "../Remarks/attachments-popover";

const CustomFieldBadge = ({
  kii,
  value,
}: {
  kii: string;
  value: string | number | boolean | string[] | Dayjs | File[] | FileData[];
}) => (
  // console.log(value,"valuesss o badge");

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
    <p className="text-[11px] font-thin text-gray-500">
      {kii.split(" |||||(")[0]}
    </p>
    {typeof value === "string" ? (
      <p className="font-bold text-xs break-words hyphens-auto overflow-wrap-anywhere leading-tight">
        {value}
      </p>
    ) : Array.isArray(value) && value.length > 0 ? (
      <AttachmentsPopover
        attachments={value.map((file, index) => {
          if (typeof file === "string") {
            return {
              id: "",
              name: "",
              url: "",
              type: "",
              size: 0,
            };
          }
          return {
            id: `${kii}-${index}-${file.name}`,
            name: file.name,
            url: (file as FileData).base64 || "#",
            type: file.type || "unknown",
            size: file.size || 0,
          };
        })}
        onMoreClick={() => null}
      />
    ) : (
      ""
    )}
  </Badge>
);

export default CustomFieldBadge;
