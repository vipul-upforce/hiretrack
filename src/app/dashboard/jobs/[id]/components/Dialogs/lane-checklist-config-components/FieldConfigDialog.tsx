import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChipInput } from "@/components/ui/chip-input";
import { Check, Users, History, Eye } from "lucide-react";
import { IChecklistField, UserRole } from "@/lib/models/JobLaneConfig";
import { FIELD_TYPES, fieldTypeIcons } from "./constants";

interface FieldConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: IChecklistField) => void;
  field: IChecklistField | null;
  isEditMode: boolean;
}

export const FieldConfigDialog: React.FC<FieldConfigDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  field,
  isEditMode,
}) => {
  const [fieldData, setFieldData] = useState<IChecklistField>({
    id: "",
    label: "",
    type: "text",
    required: false,
    order: 0,
    visibleOnForm: ["admin", "hr", "interviewer"] as UserRole[],
    visibleInHistory: ["admin", "hr", "interviewer"] as UserRole[],
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && field) {
        setFieldData(field);
      } else {
        setFieldData({
          id: "",
          label: "",
          type: "text",
          required: false,
          order: 0,
          visibleOnForm: ["admin", "hr", "interviewer"] as UserRole[],
          visibleInHistory: ["admin", "hr", "interviewer"] as UserRole[],
        });
      }
    }
  }, [isOpen, isEditMode, field]);

  const handleSave = () => {
    if (!fieldData.label.trim()) return;
    onSave(fieldData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        size="2xl"
        className="p-0 flex flex-col overflow-hidden"
        aria-describedby="field-config-dialog-description"
      >
        <DialogHeader className="px-6 py-4">
          <DialogTitle>{isEditMode ? "Edit Field" : "Add Field"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6 py-4 pb-0">
          <div className="space-y-8 pb-6">
            {/* Field Label */}
            <div>
              <Label
                htmlFor="label"
                className="text-lg font-medium flex items-center gap-1 pb-3"
              >
                Field Label<span className="text-red-500">*</span>
              </Label>
              <Input
                id="label"
                value={fieldData.label}
                onChange={(e) =>
                  setFieldData({ ...fieldData, label: e.target.value })
                }
                className="text-lg py-3 px-4"
                placeholder="Enter field label..."
              />
            </div>

            {/* Field Type */}
            <div>
              <Label htmlFor="fieldType" className="text-lg font-medium">
                Field Type
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                {FIELD_TYPES.map((type) => {
                  const IconComponent = fieldTypeIcons[type.value];
                  const isSelected = fieldData.type === type.value;
                  return (
                    <div
                      key={type.value}
                      className={`relative p-4 rounded-lg cursor-pointer border-2 transition-all duration-200 ${
                        isSelected
                          ? "shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: "var(--portal-primary, #6366f1)",
                              backgroundColor:
                                "rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)",
                            }
                          : {}
                      }
                      onClick={() =>
                        setFieldData({ ...fieldData, type: type.value as any })
                      }
                    >
                      {isSelected && (
                        <div
                          className="absolute -top-2 -right-2 text-white rounded-full p-1"
                          style={{
                            backgroundColor: "var(--portal-primary, #6366f1)",
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="flex flex-col items-center text-center gap-2">
                        <IconComponent
                          className={`h-6 w-6 ${
                            isSelected
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            isSelected
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {type.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Field Options */}
            {(fieldData.type === "select" ||
              fieldData.type === "multiSelect" ||
              fieldData.type === "radio" ||
              fieldData.type === "checkbox") && (
              <div>
                <Label
                  htmlFor="options"
                  className="text-lg font-medium block pb-3"
                >
                  Options<span className="text-red-500">*</span>{" "}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    (Hit Enter to Add)
                  </span>
                </Label>
                <ChipInput
                  value={fieldData.options || []}
                  onChange={(newOptions) =>
                    setFieldData({
                      ...fieldData,
                      options: newOptions
                        .map((option) => option.trim())
                        .filter((option) => option !== ""),
                    })
                  }
                  placeholder="Type an option and press Enter..."
                  suggestions={[]}
                />
              </div>
            )}

            {/* Placeholder */}
            {["text", "number", "email", "textarea"].includes(
              fieldData.type
            ) && (
              <div>
                <Label
                  htmlFor="placeholder"
                  className="text-lg font-medium block pb-3"
                >
                  Placeholder
                </Label>
                <Input
                  id="placeholder"
                  value={fieldData.placeholder || ""}
                  onChange={(e) =>
                    setFieldData({ ...fieldData, placeholder: e.target.value })
                  }
                  className="text-lg py-3 px-4"
                  placeholder="Enter placeholder text..."
                />
              </div>
            )}

            {/* Field Options */}
            <div>
              <Label className="text-lg font-medium mb-4 block">
                Field Options
              </Label>
              <div className="grid grid-cols-1 gap-4">
                <div
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    fieldData.required
                      ? "bg-white dark:bg-black"
                      : "bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() =>
                    setFieldData({
                      ...fieldData,
                      required: !fieldData.required,
                    })
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          fieldData.required
                            ? ""
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                        style={
                          fieldData.required
                            ? {
                                backgroundColor:
                                  "var(--portal-primary, #6366f1)",
                                borderColor: "var(--portal-primary, #6366f1)",
                              }
                            : {}
                        }
                      >
                        {fieldData.required && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          Required Field
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Users must fill this field
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Role-based Visibility Controls */}
            <div>
              <Label className="text-lg font-medium mb-4 block">
                Field Visibility
              </Label>
              <div className="grid grid-cols-1 gap-6">
                {/* Visible on Form */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Label className="text-sm font-medium">
                      Visible on Form to:
                    </Label>
                  </div>
                  {fieldData.visibleOnForm && (
                    <div className="grid grid-cols-3 gap-3">
                      {(["admin", "hr", "interviewer"] as UserRole[]).map(
                        (role) => (
                          <div
                            key={role}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              fieldData.visibleOnForm.includes(role)
                                ? "bg-white dark:bg-black"
                                : "bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                            onClick={() => {
                              const isSelected =
                                fieldData.visibleOnForm.includes(role);
                              const newVisibleOnForm = isSelected
                                ? fieldData.visibleOnForm.filter(
                                    (r) => r !== role
                                  )
                                : [...fieldData.visibleOnForm, role];
                              setFieldData({
                                ...fieldData,
                                visibleOnForm: newVisibleOnForm,
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    fieldData.visibleOnForm.includes(role)
                                      ? ""
                                      : "border-gray-300 dark:border-gray-600"
                                  }`}
                                  style={
                                    fieldData.visibleOnForm.includes(role)
                                      ? {
                                          backgroundColor:
                                            "var(--portal-primary, #3b82f6)",
                                          borderColor:
                                            "var(--portal-primary, #3b82f6)",
                                        }
                                      : {}
                                  }
                                >
                                  {fieldData.visibleOnForm.includes(role) && (
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-sm capitalize text-gray-700 dark:text-gray-300">
                                    {role}
                                  </div>
                                </div>
                              </div>
                              <Users className="h-3 w-3 text-gray-400" />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Visible in History */}
                {fieldData.visibleInHistory && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <History className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <Label className="text-sm font-medium">
                        Visible in History to:
                      </Label>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(["admin", "hr", "interviewer"] as UserRole[]).map(
                        (role) => (
                          <div
                            key={role}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              fieldData.visibleInHistory.includes(role)
                                ? "bg-white dark:bg-black"
                                : "bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                            onClick={() => {
                              const isSelected =
                                fieldData.visibleInHistory.includes(role);
                              const newVisibleInHistory = isSelected
                                ? fieldData.visibleInHistory.filter(
                                    (r) => r !== role
                                  )
                                : [...fieldData.visibleInHistory, role];
                              setFieldData({
                                ...fieldData,
                                visibleInHistory: newVisibleInHistory,
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    fieldData.visibleInHistory.includes(role)
                                      ? ""
                                      : "border-gray-300 dark:border-gray-600"
                                  }`}
                                  style={
                                    fieldData.visibleInHistory.includes(role)
                                      ? {
                                          backgroundColor:
                                            "var(--portal-primary, #8b5cf6)",
                                          borderColor:
                                            "var(--portal-primary, #8b5cf6)",
                                        }
                                      : {}
                                  }
                                >
                                  {fieldData.visibleInHistory.includes(
                                    role
                                  ) && (
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-sm capitalize text-gray-700 dark:text-gray-300">
                                    {role}
                                  </div>
                                </div>
                              </div>
                              <Users className="h-3 w-3 text-gray-400" />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-background border-t border-gray-200 dark:border-gray-600 px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !fieldData.label.trim() ||
                ((fieldData.type === "select" ||
                  fieldData.type === "multiSelect" ||
                  fieldData.type === "radio" ||
                  fieldData.type === "checkbox") &&
                  fieldData.options?.length == 0)
              }
              variant="primary"
              size="lg"
            >
              {isEditMode ? "Update Field" : "Create Field"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

