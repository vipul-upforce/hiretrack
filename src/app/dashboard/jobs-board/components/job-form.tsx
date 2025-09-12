"use client";

import { useFormikContext } from "formik";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChipInput } from "@/components/ui/chip-input";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { JobFormValues } from "../schemas/job-schema";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
// import { DatePicker } from "@/components/ui/date-picker";
import { LinkIcon } from "lucide-react";
import RichTextEditor from "@/components/ui/rte/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { useSanitizeFiles } from "@/hooks/useSanitizeFiles";
import useRoles from "@/hooks/useRoles";
// import { Checkbox } from "@mui/material";
// import { Checkbox } from "@mui/material";

// export const skillSuggestions = [
//   "JavaScript",
//   "TypeScript",
//   "React",
//   "Node.js",
//   "Python",
//   "Java",
//   "SQL",
//   "AWS",
//   "Docker",
//   "Kubernetes",
//   "DevOps",
//   "Agile",
//   "Scrum",
// ];

interface JobFormProps {
  job?: {
    attachments: {
      files: Array<{
        id: string;
        name: string;
        url: string;
        type: "pdf";
        size: number;
      }>;
      images: Array<{
        id: string;
        name: string;
        url: string;
        type: "image";
        size: number;
      }>;
    };
  };
  onRemoveExistingFile?: (fileId: string) => void;
  onRemoveExistingImage?: (imageId: string) => void;
}

export function JobForm(props: JobFormProps) {
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldTouched,
  } = useFormikContext<JobFormValues>();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState("");
  const { sanitizeFiles } = useSanitizeFiles();
  const role = useRoles();

  const handleAddLink = () => {
    try {
      new URL(newLink); // Validate URL
      // setFieldValue("links", [...values.links, newLink]);
      // setNewLink("");
      // setIsLinkDialogOpen(false);
      const updatedLinks = [...values.links, newLink];
      setFieldValue("links", updatedLinks);
      setNewLink("");
      setIsLinkDialogOpen(false);
      console.log("Link added:", newLink);
      console.log("Updated links:", updatedLinks);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://example.com)",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 pt-0">
      <div className="space-y-2">
        <Label htmlFor="title" className="font-semibold">
          Job Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          value={values.title}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g., Senior Frontend Developer"
        />
        {touched.title && errors.title && (
          <p className="text-sm text-red-500">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-semibold">
          Description <span className="text-red-500">*</span>
        </Label>
        <RichTextEditor
          id="description"
          name="description"
          placeholder="Enter job description..."
          className="min-h-[100px] p-3"
          maxLength={10000}
          value={values?.description || ""}
          onChange={(val) => setFieldValue("description", val)}
          onBlur={() => setFieldTouched("description", true)} // ✅ fixed
        />
        {errors.description && touched.description && (
          <p className="text-sm text-red-500">{String(errors.description)}</p>
        )}
      </div>

      <div className="space-y-2" id="skills">
        <Label className="font-semibold">
          Required Skills (Hit Enter to add){" "}
          <span className="text-red-500">*</span>
        </Label>
        <ChipInput
          value={values.skills}
          onChange={(newSkills) => {
            setFieldValue("skills", newSkills);
            // setFieldTouched("skills", true);
          }}
          placeholder="Add skills..."
          onSuggestionClick={(suggestion) => {
            if (!values.skills.includes(suggestion)) {
              const newSkills = [...values.skills, suggestion];
              setFieldValue("skills", newSkills);
              setFieldTouched("skills", true);
            }
          }}
        />

        {errors.skills && touched.skills && (
          <p className="text-sm text-red-500">{String(errors.skills)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience" className="font-semibold">
          Experience (years) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="experience"
          name="experience"
          type="number"
          step="0.01"
          value={values.experience}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseFloat(e.target.value);
            setFieldValue("experience", value && !isNaN(value) ? value : "");
          }}
          onBlur={handleBlur}
          placeholder="e.g., 5"
          min="0"
        />
        {touched.experience && errors.experience && (
          <p className="text-sm text-red-500">{errors.experience}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="font-semibold">Salary</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Input
              id="salary.inText"
              name="salary.inText"
              type="text"
              value={values.salary?.inText || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter salary or salary range"
              min="0"
            />
          </div>
          {/* <div className="space-y-2">
            <Input
              id="salary.min"
              name="salary.min"
              type="number"
              value={values.salary?.min || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Minimum Salary in LPA"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Input
              id="salary.max"
              name="salary.max"
              type="number"
              value={values.salary?.max || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Maximum salary in LPA"
              min="0"
            />
          </div> */}
          <div className=" flex items-center gap-2">
            <Checkbox
              id="salary.isPrivate"
              checked={values.salary?.isPrivate === true}
              onCheckedChange={(checked) => {
                setFieldValue("salary.isPrivate", checked);
              }}
              onBlur={handleBlur}
            />
            <Label className="m-0 p-0 mt-0" htmlFor="salary.isPrivate">
              Keep Salary Private
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Job Links</Label>
        <div className="space-y-2">
          {values.links.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <span className="text-sm">{link}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newLinks = [...values.links];
                  newLinks.splice(index, 1);
                  setFieldValue("links", newLinks);
                }}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsLinkDialogOpen(true);
              setFieldTouched("links", true);
            }}
          >
            Add Link
          </Button>
          {touched.links && errors.links && (
            <p className="text-sm text-red-500">{String(errors.links)}</p>
          )}
        </div>
      </div>

      <Dialog
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          setIsLinkDialogOpen(open);
          setNewLink("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="link" className="font-semibold">
                URL
              </Label>
              <Input
                id="link"
                placeholder="https://example.com"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddLink}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <Label className="font-semibold">Attachments</Label>
        <FileUpload
          onFileSelect={(newFiles) => {
            const sanitizedFiles = sanitizeFiles(newFiles);
            setFieldValue("files", [
              ...(values.files || []),
              ...sanitizedFiles.filter(
                (file) =>
                  !(values.files || []).some(
                    (existingFile) => existingFile.name === file.name
                  )
              ),
            ]);
          }}
          accept={{}} // Empty object means accept all file types
          maxFiles={30}
          files={values.files || []}
          setter={(files: File[]) => {
            const sanitizedFiles = sanitizeFiles(files);
            setFieldValue("files", sanitizedFiles);
          }}
          // existingFiles={job?.attachments.files} // Remove from UI
        />
      </div>

      {/* <div className="space-y-2">
        <Label>Images</Label>
        <FileUpload
          onFileSelect={(newImages) =>
            setFieldValue("images", [
              ...(values.images || []),
              ...newImages.filter(
                (file) =>
                  !(values.images || []).some(
                    (existingImage) => existingImage.name === file.name
                  )
              ),
            ])
          }
          accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
          maxFiles={5}
          files={values.images || []}
          setter={(files : File[])=>{
            setFieldValue("images", files)
          }}
          // existingFiles={job?.attachments.images}
        />
      </div> */}

      {role === "admin" && (
        <div className="space-y-2">
          <div className=" flex items-center gap-2">
            <Checkbox
              id="promptForStatusChangeReason"
              checked={values.promptForStatusChangeReason === true}
              onCheckedChange={(checked) => {
                setFieldValue("promptForStatusChangeReason", checked);
              }}
              onBlur={handleBlur}
            />
            <Label className="m-0 p-0" htmlFor="promptForStatusChangeReason">
              Prompt for reason when changing candidate status
            </Label>
          </div>
        </div>
      )}
    </div>
  );
}
