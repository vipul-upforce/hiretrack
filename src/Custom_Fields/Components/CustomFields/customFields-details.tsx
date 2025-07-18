import { PDFViewer } from "@/components/ui/pdf-viewer";
import { Label } from "@radix-ui/react-label";
import { Dayjs } from "dayjs";
import { ImageGallery } from "@/components/ui/image-gallery";
import { useCustomFields } from "@/Custom_Fields/hooks/use-customFields";
import useRoles from "@/hooks/useRoles";
// import useRoles from "@/hooks/useRoles";

interface FileData {
  base64: string;
  name: string;
  type: string;
  size: number;
}

interface FormValues {
  customFields: {
    [key: string]:
      | string
      | number
      | boolean
      | string[]
      | FileData[]
      | FileList
      | File[]
      | Dayjs;
  };
}

const CustomFieldsData = ({ customFields: cfWOFormatting }: FormValues) => {
  const { customFields: cfMetaData } = useCustomFields();
  const role = useRoles();

  // Collect private fields for interviewer and candidate
  const fieldsPrivateFromInterviewer: string[] = [];
  const fieldsPrivateFromCandidate: string[] = [];
  Object.values(cfMetaData).forEach((form) => {
    form.fields.forEach((field) => {
      if (field.privateInt) {
        fieldsPrivateFromInterviewer.push(field.label);
      }
      if (field.private) {
        fieldsPrivateFromCandidate.push(field.label);
      }
    });
  });

  const customFields = Object.fromEntries(
    Object.entries(cfWOFormatting).filter(([key, value]) => {
      if (
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return false;
      }

      if (
        role === "interviewer" &&
        fieldsPrivateFromInterviewer.includes(key)
      ) {
        return false;
      }
      if (role === "candidate" && fieldsPrivateFromCandidate.includes(key)) {
        return false;
      }

      return true;
    })
  );

  // If no valid custom fields remain, return null
  if (!customFields || Object.keys(customFields).length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      {/* {role !== "candidate" && (
        <>
          <hr className="mt-4" />
          <div className="font-bold text-lg">Meta Fields</div>
        </>
      )} */}
      {Object.entries(customFields).map(([key, value]) => {
        if (
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0)
        ) {
          return null;
        }

        return (
          <div key={key} className="space-y-1">
            <Label className="font-semibold capitalize">
              {key.split(" |||||(")[0]}
            </Label>
            <div className="text-sm text-gray-700">
              {Array.isArray(value) && value.length > 0 && (
                <>
                  {value.some(
                    (file): file is FileData | File =>
                      typeof file === "object" &&
                      file !== null &&
                      "type" in file &&
                      file.type?.endsWith("pdf")
                  ) && (
                    <PDFViewer
                      files={value
                        .filter(
                          (file): file is FileData =>
                            typeof file === "object" && "base64" in file
                        )
                        .filter((file) => file.type.endsWith("pdf"))
                        .map((file) => ({
                          name: file.name,
                          url: file.base64,
                          type: file.type,
                          size: file.size,
                        }))}
                    />
                  )}
                  {value.some(
                    (file): file is FileData | File =>
                      typeof file === "object" &&
                      file !== null &&
                      "type" in file &&
                      file.type?.startsWith("image")
                  ) && (
                    <ImageGallery
                      images={value
                        .filter(
                          (file): file is FileData =>
                            typeof file === "object" && "base64" in file
                        )
                        .filter((file) => file.type.startsWith("image"))
                        .map((file) => ({
                          id: file.name,
                          name: file.name,
                          url: file.base64,
                        }))}
                    />
                  )}
                  {value.some(
                    (file): file is FileData | File =>
                      typeof file === "object" &&
                      file !== null &&
                      "type" in file &&
                      !file.type?.endsWith("pdf") &&
                      !file.type?.startsWith("image")
                  ) && (
                    <div className="flex flex-col gap-3 mt-2">
                      {value
                        .filter(
                          (file): file is FileData =>
                            typeof file === "object" && "base64" in file
                        )
                        .filter(
                          (file) =>
                            !file.type.endsWith("pdf") &&
                            !file.type.startsWith("image")
                        )
                        .map((file) => (
                          <div
                            key={file.name}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-grey-100 rounded-md">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700">
                                  {file.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            </div>
                            <a
                              href={file.base64}
                              download={file.name}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                              Download
                            </a>
                          </div>
                        ))}
                    </div>
                  )}
                  {value.every(
                    (item): item is string => typeof item === "string"
                  ) && <span>{value.join(", ")}</span>}
                </>
              )}
              {(!Array.isArray(value) || value.length === 0) && String(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CustomFieldsData;
