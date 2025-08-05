import {
  useUpdateCandidateHistoryMutation,
  useUpdateCandidateMutation,
} from "@/lib/features/candidate/candidateApi";
import {
  useSubmitCandidateChecklistMutation,
  useGetJobLaneConfigQuery,
} from "@/lib/features/checklist/checklistApi";
import { Candidate, CandidateStatus } from "@/types/candidate";
import React, { useState, useEffect, useContext, useMemo } from "react";
import Cookies from "js-cookie";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Rating } from "@mui/material";
import { Button } from "@/components/ui/button";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { sentStatusMailHandler } from "@/lib/utils";
import { useSendStatusMailMutation } from "@/lib/features/org/orgApi";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, ClipboardCheck, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Formik, Form } from "formik";
import { IChecklistField } from "@/lib/models/JobLaneConfig";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea as UITextarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChipInput } from "@/components/ui/chip-input";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { DatePicker } from "@/components/ui/date-picker";
import TimePicker from "@/components/ui/time-picker";
import dayjs from "dayjs";
import { useSelector } from "react-redux";

interface ChecklistInfo {
  candidateId: string;
  currentLane: string;
  targetLane: string;
  checklist?: {
    id: string;
    name: string;
    description?: string;
    fields: IChecklistField[];
    isMandatory: boolean;
  };
  isMandatory?: boolean;
  checklistType?: "incoming" | "outgoing";
}

interface ChecklistRemarksDialogProps {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
  checklistInfo?: string; // JSON stringified ChecklistInfo
  onChecklistSuccess?: (candidateId: string) => void;
  onChecklistCancel?: (candidateId: string) => void;
}

// Simple field renderer that works directly without context manipulation
const ChecklistFieldRenderer: React.FC<{
  field: IChecklistField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  touched?: boolean;
}> = ({ field, value, onChange, error, touched }) => {
  const fieldId = `checklist-field-${field.id}`;

  const renderField = () => {
    const showError = touched && error;
    const errorClass = showError ? "border-red-500 focus:border-red-500" : "";

    switch (field.type) {
      case "text":
      case "email":
        return (
          <Input
            id={fieldId}
            type={field.type}
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={errorClass}
          />
        );

      case "number":
        return (
          <Input
            id={fieldId}
            type="number"
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className={errorClass}
          />
        );

      case "textarea":
        return (
          <UITextarea
            id={fieldId}
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={errorClass}
          />
        );

      case "checkbox":
        if (field.options && field.options.length > 0) {
          // Multiple checkboxes
          const selectedValues = Array.isArray(value) ? value : [];
          return (
            <div className="space-y-2">
              {field.options.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${fieldId}-${idx}`}
                    checked={selectedValues.includes(option)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...selectedValues, option]);
                      } else {
                        onChange(selectedValues.filter((v) => v !== option));
                      }
                    }}
                  />
                  <Label htmlFor={`${fieldId}-${idx}`}>{option}</Label>
                </div>
              ))}
            </div>
          );
        } else {
          // Single checkbox
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={fieldId}
                checked={Boolean(value)}
                onCheckedChange={onChange}
              />
              <Label htmlFor={fieldId}>{field.label}</Label>
            </div>
          );
        }

      case "radio":
        return (
          <RadioGroup value={value || ""} onValueChange={onChange}>
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${fieldId}-${idx}`} />
                <Label htmlFor={`${fieldId}-${idx}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "select":
        return (
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue
                placeholder={field.placeholder || "Select an option"}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiSelect":
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <ChipInput
            value={selectedValues}
            onChange={onChange}
            placeholder={field.placeholder || "Select options"}
            suggestions={field.options || []}
          />
        );

      case "date":
        return (
          <DatePicker
            value={value ? new Date(value) : undefined}
            onChange={(date) => {
              // DatePicker may return different object types, handle multiple cases
              let isoString = "";
              if (date) {
                if (date instanceof Date) {
                  isoString = date.toISOString();
                } else if (typeof date.toISOString === "function") {
                  // Handle other date-like objects with toISOString method
                  isoString = date.toISOString();
                } else if (typeof date === "string") {
                  // Handle string dates
                  try {
                    isoString = new Date(date).toISOString();
                  } catch {
                    isoString = "";
                  }
                } else if (date && typeof date === "object") {
                  // Handle other date-like objects
                  try {
                    isoString = new Date(date).toISOString();
                  } catch {
                    isoString = "";
                  }
                }
              }
              onChange(isoString || "");
            }}
            showTimePicker={false}
            format="MM/DD/YYYY"
            placeholder="Select date"
            showNowButton={false}
          />
        );

      case "time":
        return (
          <TimePicker
            name={fieldId}
            value={value || ""}
            onChange={(time) => onChange(time)}
            onBlur={() => {}}
          />
        );

      case "datetime":
        return (
          <DateTimePicker
            value={value ? dayjs(value) : null}
            onChange={(date) => {
              // DateTimePicker may return Dayjs or Date object, handle both
              let isoString = "";
              if (date) {
                if (date instanceof Date) {
                  isoString = date.toISOString();
                } else if (typeof date.toISOString === "function") {
                  // Dayjs object has toISOString method
                  isoString = date.toISOString();
                }
              }
              onChange(isoString);
            }}
          />
        );

      case "password":
        return (
          <Input
            id={fieldId}
            type="password"
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={errorClass}
          />
        );

      case "file":
        const fileValue = Array.isArray(value) ? value : [];
        return (
          <FileDropZone
            value={fileValue}
            onFilesChange={async (files: File[]) => {
              try {
                const fileData = await Promise.all(
                  files.map(async (file) => {
                    // Check file size (50MB limit)
                    if (file.size > 50 * 1024 * 1024) {
                      toast({
                        title: "File too large",
                        description: `${file.name} exceeds 50MB limit`,
                        variant: "destructive",
                      });
                      return null;
                    }

                    const base64 = await new Promise<string>(
                      (resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                      }
                    );

                    return {
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      base64: base64,
                    };
                  })
                );

                const validFiles = fileData.filter(Boolean);
                onChange(validFiles);
              } catch (error) {
                toast({
                  title: "Upload failed",
                  description: "Failed to process files",
                  variant: "destructive",
                });
              }
            }}
            existingFiles={fileValue.map((file: any) => ({
              name: file.name,
              type: file.type,
              size: file.size,
              url: file.base64,
              preview: file.base64,
            }))}
            maxSize={50 * 1024 * 1024} // 50MB
          />
        );

      default:
        return (
          <Input
            id={fieldId}
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderField()}
      {touched && error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};

// Simple form that renders checklist fields directly
const ChecklistForm: React.FC<{
  checklist: {
    id: string;
    name: string;
    description?: string;
    fields: IChecklistField[];
    isMandatory: boolean;
  };
  responses: Record<string, any>;
  onResponseChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
}> = ({
  checklist,
  responses,
  onResponseChange,
  errors = {},
  touched = {},
}) => {
  return (
    <div className="space-y-4">
      {checklist.fields.map((field) => (
        <ChecklistFieldRenderer
          key={field.id}
          field={field}
          value={responses[field.id]?.value}
          onChange={(value) => onResponseChange(field.id, value)}
          error={errors[field.id]}
          touched={touched[field.id]}
        />
      ))}
    </div>
  );
};

const ChecklistRemarksDialog = ({
  candidate,
  isOpen,
  onOpenChange,
  setOpenRemarksFor,
  refetch,
  checklistInfo,
  onChecklistSuccess,
  onChecklistCancel,
}: ChecklistRemarksDialogProps) => {
  const [newRemark, setNewRemark] = useState("");
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [remarkRatingHistory, setRemarkRatingHistory] = useState<number | null>(
    null
  );
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);
  const [checklistResponses, setChecklistResponses] = useState<
    Record<string, any>
  >({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [sendStatusMail] = useSendStatusMailMutation();
  const [submitChecklist] = useSubmitCandidateChecklistMutation();

  const { user } = useSelector((state: any) => state.auth || {});
  // const customFieldsContext = useContext(CustomFieldsContext);
  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(
    typeof candidate.jobId === "string" ? candidate.jobId : candidate.jobId._id,
    { skip: !candidate.jobId }
  );

  // Parse checklist info
  const parsedChecklistInfo: ChecklistInfo | null = useMemo(() => {
    if (!checklistInfo) return null;
    try {
      return JSON.parse(checklistInfo);
    } catch (e) {
      console.error(
        "ChecklistRemarksDialog: Failed to parse checklistInfo:",
        checklistInfo,
        e
      );
      return null;
    }
  }, [checklistInfo]);

  const hasChecklist = parsedChecklistInfo?.checklist;
  const isChecklistMandatory = parsedChecklistInfo?.isMandatory ?? false;

  // Initialize checklist responses
  useEffect(() => {
    if (hasChecklist) {
      const initialResponses: Record<string, any> = {};
      parsedChecklistInfo.checklist!.fields.forEach((field) => {
        initialResponses[field.id] = {
          value: field.type === "checkbox" ? false : "",
          fieldLabel: field.label,
          fieldType: field.type,
        };
      });
      setChecklistResponses(initialResponses);
      setFieldErrors({}); // Clear any previous errors when initializing
      setFieldTouched({}); // Clear touched state when initializing
    }
  }, [hasChecklist, parsedChecklistInfo]);

  // Real-time validation - clear errors as soon as fields become valid
  useEffect(() => {
    if (!hasChecklist || !parsedChecklistInfo?.checklist) return;

    const currentErrors = { ...fieldErrors };
    let hasChanges = false;

    for (const field of parsedChecklistInfo.checklist.fields) {
      if (field.required && currentErrors[field.id] && fieldTouched[field.id]) {
        const response = checklistResponses[field.id];

        // Check if this field is now valid
        let isValid = false;
        if (
          response &&
          response.value !== undefined &&
          response.value !== null
        ) {
          switch (field.type) {
            case "date":
            case "datetime":
              // Date/datetime fields store ISO strings, check if it's a valid date string
              if (
                response.value &&
                response.value !== "" &&
                response.value !== null
              ) {
                try {
                  // Handle both string and Date object values
                  const dateObj =
                    response.value instanceof Date
                      ? response.value
                      : new Date(response.value);
                  isValid = !isNaN(dateObj.getTime()) && dateObj.getTime() > 0;
                } catch (error) {
                  isValid = false;
                }
              }
              break;
            case "time":
              // Time fields store time strings
              isValid =
                response.value &&
                response.value !== "" &&
                response.value.trim() !== "";
              break;
            case "text":
            case "email":
            case "textarea":
            case "password":
              isValid = response.value.trim() !== "";
              break;
            case "number":
              isValid = response.value !== "" && !isNaN(Number(response.value));
              break;
            case "multiSelect":
            case "checkbox":
              isValid =
                Array.isArray(response.value) && response.value.length > 0;
              break;
            case "file":
              isValid =
                Array.isArray(response.value) && response.value.length > 0;
              break;
            default:
              isValid = !!response.value;
          }
        }

        if (isValid) {
          delete currentErrors[field.id];
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setFieldErrors(currentErrors);
    }
  }, [
    checklistResponses,
    fieldErrors,
    fieldTouched,
    hasChecklist,
    parsedChecklistInfo,
  ]);

  const handleChecklistFieldChange = (fieldId: string, value: any) => {
    // Mark field as touched when user interacts with it
    setFieldTouched((prev) => ({ ...prev, [fieldId]: true }));

    setChecklistResponses((prev) => ({
      ...prev,
      [fieldId]: {
        value,
        fieldLabel:
          parsedChecklistInfo?.checklist?.fields.find((f) => f.id === fieldId)
            ?.label || fieldId,
        fieldType:
          parsedChecklistInfo?.checklist?.fields.find((f) => f.id === fieldId)
            ?.type || "text",
      },
    }));

    // Clear field error when user provides any value (more aggressive clearing)
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  };

  const validateChecklist = () => {
    if (!hasChecklist) return true;

    const checklist = parsedChecklistInfo!.checklist!;
    const errors: Record<string, string> = {};
    let hasErrors = false;

    for (const field of checklist.fields) {
      if (field.required) {
        const response = checklistResponses[field.id];
        let isEmpty = false;

        if (
          !response ||
          response.value === undefined ||
          response.value === null
        ) {
          isEmpty = true;
        } else {
          // Check emptiness based on field type
          switch (field.type) {
            case "text":
            case "email":
            case "textarea":
            case "password":
              isEmpty = !response.value || response.value.trim() === "";
              break;
            case "number":
              isEmpty = response.value === "" || isNaN(Number(response.value));
              break;
            case "date":
            case "datetime":
              // Date/datetime fields store ISO strings, check if it's a valid date
              if (
                !response.value ||
                response.value === "" ||
                response.value === null
              ) {
                isEmpty = true;
              } else {
                try {
                  // Handle both string and Date object values
                  const dateObj =
                    response.value instanceof Date
                      ? response.value
                      : new Date(response.value);
                  isEmpty = isNaN(dateObj.getTime()) || dateObj.getTime() <= 0;
                } catch (error) {
                  isEmpty = true;
                }
              }
              break;
            case "time":
              // Time fields store time strings
              isEmpty =
                !response.value ||
                response.value === "" ||
                response.value.trim() === "";
              break;
            case "select":
            case "radio":
              isEmpty = !response.value || response.value === "";
              break;
            case "multiSelect":
            case "checkbox":
              isEmpty =
                !Array.isArray(response.value) || response.value.length === 0;
              break;
            case "file":
              isEmpty =
                !Array.isArray(response.value) || response.value.length === 0;
              break;
            default:
              isEmpty = !response.value;
          }
        }

        if (isEmpty) {
          errors[field.id] = `${field.label} is required`;
          hasErrors = true;
        }
      }
    }

    // Mark all required fields as touched when validation runs
    if (hasErrors) {
      const touchedState: Record<string, boolean> = {};
      for (const field of checklist.fields) {
        if (field.required) {
          touchedState[field.id] = true;
        }
      }
      setFieldTouched((prev) => ({ ...prev, ...touchedState }));
    }

    setFieldErrors(errors);
    return !hasErrors;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate checklist if mandatory
    if (isChecklistMandatory && !validateChecklist()) {
      return;
    }

    // const token = Cookies.get("auth_token");
    // if (!token) {
    //   toast({
    //     title: "Error",
    //     description: "Authentication required",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
    if (!user) {
      toast({
        title: "Error",
        description: "Invalid authentication",
        variant: "destructive",
      });
      return;
    }

    // const user = decryptedResponse.user;
    setIsSubmitting(true);

    try {
      // Submit checklist if present
      if (hasChecklist && parsedChecklistInfo) {
        const checklist = parsedChecklistInfo.checklist!;
        const laneConfig = jobLaneConfig?.laneConfigs.find(
          (lc) =>
            lc.laneId ===
            (parsedChecklistInfo.checklistType === "incoming"
              ? parsedChecklistInfo.targetLane
              : parsedChecklistInfo.currentLane)
        );

        await submitChecklist({
          candidateId: candidate._id,
          data: {
            checklistId: checklist.id,
            checklistName: checklist.name,
            checklistType: parsedChecklistInfo.checklistType!,
            laneId:
              parsedChecklistInfo.checklistType === "incoming"
                ? parsedChecklistInfo.targetLane
                : parsedChecklistInfo.currentLane,
            laneName: laneConfig?.laneName || "",
            responses: checklistResponses,
            remark: newRemark.trim()
              ? {
                  description: newRemark.trim(),
                  isPrivate: isSubRemarkPrivate,
                  rating: remarkRating || undefined,
                }
              : undefined,
          },
        }).unwrap();

        // Update candidate status to target lane after successful checklist submission
        const updatedCandidate = await updateCandidate({
          _id: candidate._id,
          status: parsedChecklistInfo.targetLane as CandidateStatus,
        }).unwrap();

        // Send status change email notification
        await sentStatusMailHandler(
          {
            ...updatedCandidate,
            prev_status: parsedChecklistInfo.currentLane,
          },
          sendStatusMail
        );
      } else if (newRemark.trim()) {
        // Only submit remark if no checklist
        const newRemarkObj = {
          description: String(newRemark).trim(),
          date: new Date().toISOString(),
          rating: remarkRating ? Number(remarkRating) : undefined,
          userId: {
            _id: user.id,
            name: user.name,
            email: user.email,
          },
        };

        const newRemarkHistoryObj = {
          description: String(newRemark).trim(),
          isPrivate: isSubRemarkPrivate,
          date: new Date().toISOString(),
          rating: remarkRatingHistory ? Number(remarkRatingHistory) : undefined,
          userId: {
            _id: user.id,
            name: user.name,
            email: user.email,
          },
        };

        const updateData = {
          _id: candidate._id,
          name: candidate.name,
          remarks: [...(candidate.remarks || []), newRemarkObj],
        };

        const newHistoryEntry = {
          dateTime: new Date().toISOString(),
          currentInterviewer: null,
          previousInterviewer: null,
          remark: newRemarkHistoryObj,
          assignmentBy: user.id,
          title: null,
          note: {
            description: "",
            date: "",
            rating: 0,
            userId: null,
          },
          attachments: [],
        };

        await updateCandidateHistory({
          candidateId: candidate._id,
          jobId: candidate.jobId,
          newEntry: newHistoryEntry,
        }).unwrap();

        const updatedCandidate = await updateCandidate(updateData).unwrap();
        await sentStatusMailHandler(updatedCandidate, sendStatusMail);
      }

      onOpenChange(false);
      setNewRemark("");
      setRemarkRating(null);
      setRemarkRatingHistory(null);
      setOpenRemarksFor("");
      setChecklistResponses({});

      await new Promise((resolve) => setTimeout(resolve, 100));
      await refetch();

      toast({
        title: "Success",
        description: hasChecklist
          ? "Checklist submitted successfully"
          : "Remark added successfully",
      });

      // Call success callback if it's a checklist completion
      if (hasChecklist && onChecklistSuccess) {
        onChecklistSuccess(candidate._id);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Call cancel callback if it's a checklist cancellation
    if (hasChecklist && onChecklistCancel) {
      onChecklistCancel(candidate._id);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        size="2xl"
        className="p-0 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            {hasChecklist && <ClipboardCheck className="h-5 w-5" />}
            {hasChecklist
              ? `${parsedChecklistInfo?.checklist?.name || "Checklist"} - ${candidate.name}`
              : `Add Remarks for ${candidate.name}`}
          </DialogTitle>
          <DialogDescription>
            {hasChecklist
              ? parsedChecklistInfo?.checklist?.description ||
                "Please complete the checklist before proceeding."
              : "Add your observations and feedback for this candidate."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-6 overflow-y-auto">
          <div className="space-y-6 pb-6">
            {/* Checklist Section */}
            {hasChecklist && parsedChecklistInfo?.checklist && (
              <>
                {isChecklistMandatory && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This checklist is mandatory and must be completed before
                      moving the candidate.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">
                    {parsedChecklistInfo.checklistType === "incoming"
                      ? "Incoming"
                      : "Outgoing"}{" "}
                    Checklist
                  </h3>

                  <ChecklistForm
                    checklist={parsedChecklistInfo.checklist}
                    responses={checklistResponses}
                    onResponseChange={handleChecklistFieldChange}
                    errors={fieldErrors}
                    touched={fieldTouched}
                  />
                </div>

                <Separator />
              </>
            )}

            {/* Remarks Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Remarks (Optional)</h3>
              <Textarea
                placeholder="Add a remark..."
                className="min-h-[100px]"
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Label htmlFor="rating">Rating:</Label>
                  <Rating
                    name="half-rating"
                    onChange={(e, value) => {
                      setRemarkRating(value);
                      setRemarkRatingHistory(value);
                    }}
                    value={remarkRating}
                    precision={0.5}
                    sx={{
                      "& .MuiRating-iconEmpty": {
                        color: "rgba(255, 255, 255, 0.3)",
                      },
                      "& .MuiRating-iconFilled": {
                        color: "#fbbf24",
                      },
                      "& .MuiRating-iconHover": {
                        color: "#f59e0b",
                      },
                    }}
                  />
                </div>
                <div className="flex flex-row items-center justify-evenly">
                  <div className="flex items-center space-x-2">
                    {isSubRemarkPrivate ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                    <Label htmlFor="privacy-toggle" className="text-sm">
                      {isSubRemarkPrivate ? "Private" : "Public"}
                    </Label>
                  </div>
                  <Switch
                    id="privacy-toggle-submit"
                    checked={isSubRemarkPrivate}
                    onCheckedChange={() =>
                      setIsSubRemarkPrivate(!isSubRemarkPrivate)
                    }
                    className="w-8 h-4 drop-shadow-lg border border-1 border-solid ml-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-background px-6 py-4 sticky bottom-0 z-10">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {isChecklistMandatory ? "Cancel" : "Skip"}
          </Button>
          <Button onClick={handleSubmit} variant="info" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistRemarksDialog;
