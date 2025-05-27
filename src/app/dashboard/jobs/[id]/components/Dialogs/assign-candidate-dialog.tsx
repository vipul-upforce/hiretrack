"use client";

import { useEffect, useState } from "react";
import { Formik, Form, Field, FieldProps } from "formik";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useFetchInterviewersQuery } from "@/lib/features/user/userApi";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { FileUpload } from "@/components/ui/file-upload";
import { Textarea } from "@/components/ui/textarea";
import { Rating } from "@mui/material";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import ConfirmationDialog from "./ConfirmationDialog";
import { handleFileSelect, handleSetter } from "../../hooks/fileUploadUtils";
import {
  validationSchema,
  FormValues,
  User,
  AssignCandidateDialogProps,
} from "../../schemas/AssignCandidateSchema";
import { useAssignCandidate } from "../../hooks/useAssignCandidate";
import dayjs from "dayjs";

export function AssignCandidateDialog({
  candidate,
  isOpen,
  refetch,
  onOpenChange,
  onUpdate,
  setLocalCandidate,
  refetchAssignment,
  onSuccess,
}: AssignCandidateDialogProps) {
  const [user, setUser] = useState<User | null>(null);
  const { data: interviewers, refetch: refetchInterviewers } =
    useFetchInterviewersQuery();
  const {
    confirmUnassignOpen,
    setConfirmUnassignOpen,
    handleSubmit,
    handleUnassign,
    confirmUnassign,
  } = useAssignCandidate({
    candidate,
    refetch,
    onOpenChange,
    onUpdate,
    setLocalCandidate,
    refetchAssignment,
    onSuccess,
  });

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUser(decryptedResponse.user);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (isOpen) {
      refetchInterviewers();
    }
  }, [isOpen, refetchInterviewers]);

  const initialValues: FormValues = {
    interviewerId:
      typeof candidate.assignment?.interviewerId === "string"
        ? candidate.assignment.interviewerId
        : candidate.assignment?.interviewerId?._id || "",
    time: candidate.assignment?.time ? dayjs(candidate?.assignment?.time) : null,
    remark: "",
    rating: null,
    attachments: [],
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh] p-0 overflow-hidden flex flex-col justify-start">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex justify-between align-center">
            Assign Candidate
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={(values, formikHelpers) =>
            handleSubmit(values, formikHelpers, user, interviewers)
          }
          enableReinitialize
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => (
            <Form className="flex-1 flex flex-col h-full overflow-y-scroll">
              <div className="flex-1 overflow-y-auto px-6 py-4 pt-0 space-y-6">
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="interviewerId">Assign To</Label>
                    <Field name="interviewerId">
                      {({ field }: FieldProps) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) =>
                            setFieldValue("interviewerId", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select interviewer" />
                          </SelectTrigger>
                          <SelectContent>
                            {interviewers?.map((interviewer) => (
                              <SelectItem
                                key={interviewer._id}
                                value={interviewer._id}
                              >
                                {interviewer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </Field>
                    {errors.interviewerId && touched.interviewerId && (
                      <div className="text-red-500 text-sm">
                        {errors.interviewerId}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="time">Time</Label>
                    <Field name="time">
                      {({ field }: FieldProps) => (
                        <DateTimePicker
                          value={field.value}
                          onChange={(date) => setFieldValue("time", date)}
                        />
                      )}
                    </Field>
                    {typeof errors.time === "string" && touched.time && (
                      <div className="text-red-500 text-sm">{errors.time}</div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Field name="remark">
                      {({ field }: FieldProps) => (
                        <Textarea placeholder="Add a remark..." {...field} />
                      )}
                    </Field>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="rating">Rating:</Label>
                        <Field name="rating">
                          {({ field }: { field: { value: number } }) => (
                            <Rating
                              name="rating"
                              value={field.value}
                              onChange={(e, value) =>
                                setFieldValue("rating", value)
                              }
                              precision={0.5}
                            />
                          )}
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Attachments</Label>
                    <FileUpload
                      accept={{}}
                      maxFiles={30}
                      onFileSelect={(files) =>
                        handleFileSelect({
                          files,
                          existingAttachments: candidate.attachments,
                          currentFormAttachments: values.attachments,
                          setFieldValue,
                        })
                      }
                      files={(values.attachments || []).map(
                        (att) =>
                          new File([att.url], att.name, { type: att.type })
                      )}
                      setter={(uiFiles) =>
                        handleSetter({
                          uiFiles,
                          existingAttachments: candidate.attachments,
                          currentFormAttachments: values.attachments,
                          setFieldValue,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex relative bottom-0 justify-between w-full space-x-2 border-t bg-background px-6 py-4">
                <div>
                  {candidate.assignment && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUnassign}
                    >
                      Mark As Done
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Assigning..." : "Assign"}
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </Formik>

        <ConfirmationDialog
          isOpen={confirmUnassignOpen}
          setIsOpen={setConfirmUnassignOpen}
          title="Confirm Mark As Done"
          message="Are you sure you want to Mark As Done this interviewer?"
          onConfirm={() => confirmUnassign(user)}
          onCancel={() => setConfirmUnassignOpen(false)}
          className="sm:max-w-[300px]"
        />
      </DialogContent>
    </Dialog>
  );
}
