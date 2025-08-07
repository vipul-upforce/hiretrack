"use client";
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
import { Textarea } from "@/components/ui/textarea";
import { ChipInput } from "@/components/ui/chip-input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import React, { useState, useEffect, useContext } from "react";
import {
  Plus,
  Trash2,
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  Copy,
  Save,
  X,
  Download,
  BookOpen,
  Type,
  FileText,
  Hash,
  ChevronDown,
  List,
  Circle,
  CheckSquare,
  Calendar,
  Clock,
  CalendarClock,
  Lock,
  Upload,
  Check,
  Edit,
  Users,
  Eye,
  History,
  Timer
} from "lucide-react";
import {
  useGetJobLaneConfigQuery,
  useUpdateLaneConfigMutation,
  useGetChecklistTemplatesQuery,
  useCreateChecklistTemplateMutation
} from "@/lib/features/checklist/checklistApi";
import { IChecklistField, IChecklist, UserRole } from "@/lib/models/JobLaneConfig";
import { IChecklistTemplate } from "@/lib/models/ChecklistTemplate";
// import { CustomFieldsContext } from "@/Custom_Fields/Context";
// import { RenderField } from "@/Custom_Fields/RenderField";

interface LaneChecklistConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  laneId: string;
  laneName: string;
  initialTab?: "incoming" | "outgoing";
}

const FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "email", label: "Email Input" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number Input" },
  { value: "select", label: "Select Dropdown" },
  { value: "multiSelect", label: "Multi-Select Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date Picker" },
  { value: "time", label: "Time Picker" },
  { value: "datetime", label: "Date & Time Picker" },
  { value: "password", label: "Password" },
  { value: "file", label: "File Upload" },
];

const fieldTypeIcons: Record<string, React.ElementType> = {
  text: Type,
  textarea: FileText,
  number: Hash,
  email: Type,
  select: ChevronDown,
  multiSelect: List,
  radio: Circle,
  checkbox: CheckSquare,
  date: Calendar,
  time: Timer,
  datetime: CalendarClock,
  password: Lock,
  file: Upload,
};

export const LaneChecklistConfigDialog = ({
  isOpen,
  onOpenChange,
  jobId,
  laneId,
  laneName,
  initialTab = "incoming",
}: LaneChecklistConfigDialogProps) => {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">(initialTab);
  const [incomingChecklist, setIncomingChecklist] = useState<IChecklist | undefined>();
  const [outgoingChecklist, setOutgoingChecklist] = useState<IChecklist | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<IChecklistField | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: laneConfig, refetch } = useGetJobLaneConfigQuery(jobId);
  const { data: templates } = useGetChecklistTemplatesQuery({ active: true });
  const [updateLaneConfig] = useUpdateLaneConfigMutation();
  const [createTemplate] = useCreateChecklistTemplateMutation();

  // Template-related state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Load existing configuration
  useEffect(() => {
    if (laneConfig && isOpen) {
      const existingLaneConfig = laneConfig.laneConfigs.find(lc => lc.laneId === laneId);
      if (existingLaneConfig) {
        setIncomingChecklist(existingLaneConfig.incomingChecklist);
        setOutgoingChecklist(existingLaneConfig.outgoingChecklist);
      } else {
        setIncomingChecklist(undefined);
        setOutgoingChecklist(undefined);
      }
    }
  }, [laneConfig, laneId, isOpen]);

  // Update active tab when dialog opens with initialTab
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Also update when initialTab changes while dialog is open
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const getCurrentChecklist = () => {
    return activeTab === "incoming" ? incomingChecklist : outgoingChecklist;
  };

  const setCurrentChecklist = (checklist: IChecklist | undefined) => {
    if (activeTab === "incoming") {
      setIncomingChecklist(checklist);
    } else {
      setOutgoingChecklist(checklist);
    }
  };

  const createNewChecklist = () => {
    const newChecklist: IChecklist = {
      id: `checklist_${Date.now()}`,
      name: `${laneName} ${activeTab} checklist`,
      description: "",
      fields: [],
      isMandatory: false,
      createdBy: null as any, // Will be set by API
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCurrentChecklist(newChecklist);
  };

  const addField = () => {
    setEditingField(null);
    setIsEditMode(false);
    setIsFieldDialogOpen(true);
  };

  const editField = (field: IChecklistField) => {
    setEditingField(field);
    setIsEditMode(true);
    setIsFieldDialogOpen(true);
  };

  const saveField = (fieldData: IChecklistField) => {
    const currentChecklist = getCurrentChecklist();
    if (!currentChecklist) return;

    if (isEditMode && editingField) {
      // Update existing field
      setCurrentChecklist({
        ...currentChecklist,
        fields: currentChecklist.fields.map(field =>
          field.id === editingField.id ? fieldData : field
        ),
      });
    } else {
      // Add new field
      const newField: IChecklistField = {
        ...fieldData,
        id: `field_${Date.now()}`,
        order: currentChecklist.fields.length,
      };
      setCurrentChecklist({
        ...currentChecklist,
        fields: [...currentChecklist.fields, newField],
      });
    }

    setIsFieldDialogOpen(false);
    setEditingField(null);
    setIsEditMode(false);
  };

  const updateField = (fieldId: string, updates: Partial<IChecklistField>) => {
    const currentChecklist = getCurrentChecklist();
    if (!currentChecklist) return;

    setCurrentChecklist({
      ...currentChecklist,
      fields: currentChecklist.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    });
  };

  const removeField = (fieldId: string) => {
    const currentChecklist = getCurrentChecklist();
    if (!currentChecklist) return;

    setCurrentChecklist({
      ...currentChecklist,
      fields: currentChecklist.fields.filter(field => field.id !== fieldId)
        .map((field, index) => ({ ...field, order: index })),
    });
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const currentChecklist = getCurrentChecklist();
    if (!currentChecklist) return;

    const fieldIndex = currentChecklist.fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;

    const newFields = [...currentChecklist.fields];
    const targetIndex = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;

    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    [newFields[fieldIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[fieldIndex]];

    // Update order
    newFields.forEach((field, index) => {
      field.order = index;
    });

    setCurrentChecklist({
      ...currentChecklist,
      fields: newFields,
    });
  };

  const loadFromTemplate = (templateId: string) => {
    const template = templates?.find(t => t._id === templateId);
    if (!template) return;

    const checklistFromTemplate: IChecklist = {
      id: `checklist_${Date.now()}`,
      name: template.name,
      description: template.description || "",
      fields: template.fields.map(field => ({ ...field, id: `field_${Date.now()}_${field.id}` })),
      isMandatory: false,
      createdBy: null as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setCurrentChecklist(checklistFromTemplate);
    toast({
      title: "Template Loaded",
      description: `Loaded template: ${template.name}`,
    });
  };

  const saveAsTemplate = async () => {
    const currentChecklist = getCurrentChecklist();
    if (!currentChecklist || !templateName.trim()) return;

    try {
      // Clean the fields by removing MongoDB-specific properties
      const cleanFields = currentChecklist.fields.map(field => {
        const { _id, ...cleanField } = field as any;
        return cleanField;
      });

      await createTemplate({
        name: templateName,
        description: templateDescription,
        type: activeTab,
        fields: cleanFields,
      }).unwrap();

      toast({
        title: "Template Saved",
        description: `Template "${templateName}" saved successfully`,
      });

      setIsTemplateDialogOpen(false);
      setTemplateName("");
      setTemplateDescription("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const openSaveTemplateDialog = () => {
    const currentChecklist = getCurrentChecklist();
    if (!currentChecklist || currentChecklist.fields.length === 0) {
      toast({
        title: "No Content",
        description: "Please add some fields before saving as template",
        variant: "destructive",
      });
      return;
    }

    setTemplateName(currentChecklist.name);
    setTemplateDescription(currentChecklist.description || "");
    setIsTemplateDialogOpen(true);
  };

  // Get filtered templates for current tab
  const filteredTemplates = templates?.filter(t => t.type === activeTab) || [];

  const handleSave = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const laneConfigToUpdate = {
        laneId,
        laneName,
        incomingChecklist,
        outgoingChecklist,
      };

      await updateLaneConfig({
        jobId,
        laneId,
        laneConfig: laneConfigToUpdate,
      }).unwrap();

      toast({
        title: "Success",
        description: "Lane checklist configuration saved successfully",
      });

      onOpenChange(false);
      await refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save checklist configuration",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIncomingChecklist(undefined);
    setOutgoingChecklist(undefined);
    onOpenChange(false);
  };

  const currentChecklist = getCurrentChecklist();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 overflow-hidden flex flex-col !max-w-none !w-full !h-full !left-0 !top-0 !translate-x-0 !translate-y-0 min-w-0 lg:!max-w-[80vw] lg:!min-w-[950px] lg:!h-[90vh] lg:!left-[50%] lg:!top-[50%] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[70vw]">
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Configure Checklists - {laneName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Tab Navigation */}
          <div className="px-6 pb-4">
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("incoming")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "incoming"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <ArrowRight className="h-4 w-4" />
                Incoming Checklist
                {incomingChecklist && <Badge variant="secondary" className="ml-2">Active</Badge>}
              </button>
              <button
                onClick={() => setActiveTab("outgoing")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "outgoing"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Outgoing Checklist
                {outgoingChecklist && <Badge variant="secondary" className="ml-2">Active</Badge>}
              </button>
            </div>
          </div>

          <div className="px-6 space-y-6">
            {/* Template Selection */}
            {filteredTemplates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Load from Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Select onValueChange={loadFromTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTemplates.map(template => (
                          <SelectItem key={template._id as string} value={template._id as string}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Checklist Configuration */}
            {!currentChecklist ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No {activeTab} checklist configured
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Create a checklist that will be shown when candidates are moved {activeTab === "incoming" ? "into" : "out of"} this lane.
                    </p>

                    <div className="space-y-4">
                      {/* Template Selection - Only show when templates exist */}
                      {filteredTemplates.length > 0 && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Start from template</Label>
                            <Select onValueChange={loadFromTemplate}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a template..." />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredTemplates.map((template) => (
                                  <SelectItem key={template._id as string} value={template._id as string}>
                                    <div className="flex items-center space-x-2">
                                      <BookOpen className="h-4 w-4" />
                                      <span>{template.name}</span>
                                      {template.description && (
                                        <span className="text-xs text-muted-foreground">
                                          - {template.description}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center">
                            <div className="flex-1 border-t border-muted"></div>
                            <span className="px-2 text-xs text-muted-foreground">or</span>
                            <div className="flex-1 border-t border-muted"></div>
                          </div>
                        </>
                      )}

                      <Button onClick={createNewChecklist}>
                        <Plus className="h-4 w-4 mr-2" />
                        {filteredTemplates.length > 0 ? "Create New Checklist" : "Create Checklist"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Checklist Configuration</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openSaveTemplateDialog}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save as Template
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentChecklist(undefined)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove Checklist
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="checklist-name">Checklist Name</Label>
                      <Input
                        id="checklist-name"
                        value={currentChecklist.name}
                        onChange={(e) => setCurrentChecklist({
                          ...currentChecklist,
                          name: e.target.value
                        })}
                        placeholder="Enter checklist name..."
                      />
                    </div>
                    <div className="flex items-center space-x-2 mt-6">
                      <Switch
                        id="mandatory"
                        checked={currentChecklist.isMandatory}
                        onCheckedChange={(checked) => setCurrentChecklist({
                          ...currentChecklist,
                          isMandatory: checked
                        })}
                      />
                      <Label htmlFor="mandatory">Mandatory</Label>
                    </div>
                  </div>

                  {/* <div>
                    <Label htmlFor="checklist-description">Description</Label>
                    <Textarea
                      id="checklist-description"
                      value={currentChecklist.description || ""}
                      onChange={(e) => setCurrentChecklist({
                        ...currentChecklist,
                        description: e.target.value
                      })}
                      placeholder="Optional description..."
                      rows={2}
                    />
                  </div> */}

                  <Separator />

                  {/* Fields */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium">Checklist Fields</h4>
                      <Button size="sm" onClick={addField}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {[...currentChecklist.fields]
                        .sort((a, b) => a.order - b.order)
                        .map((field, index) => {
                          const IconComponent = fieldTypeIcons[field.type] || Type;
                          return (
                            <Card key={field.id} className="p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">{field.label}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                      <span>{FIELD_TYPES.find(t => t.value === field.type)?.label}</span>
                                      {field.required && (
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Required</Badge>
                                      )}
                                      {field.options && field.options.length > 0 && (
                                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                          {field.options.length} options
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => editField(field)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => moveField(field.id, "up")}
                                    disabled={index === 0}
                                    className="h-8 w-8 p-0"
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => moveField(field.id, "down")}
                                    disabled={index === currentChecklist.fields.length - 1}
                                    className="h-8 w-8 p-0"
                                  >
                                    ↓
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeField(field.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}

                      {currentChecklist.fields.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No fields added yet. Click "Add Field" to get started.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Field Configuration Dialog */}
      <FieldConfigDialog
        isOpen={isFieldDialogOpen}
        onClose={() => {
          setIsFieldDialogOpen(false);
          setEditingField(null);
          setIsEditMode(false);
        }}
        onSave={saveField}
        field={editingField}
        isEditMode={isEditMode}
      />

      {/* Save Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="px-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name" className="text-sm font-medium">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description" className="text-sm font-medium">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
                className="w-full resize-none"
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <BookOpen className="h-4 w-4 flex-shrink-0" />
              <span>This will be saved as an {activeTab} checklist template</span>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveAsTemplate}
              disabled={!templateName.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

// Field Configuration Dialog Component
interface FieldConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: IChecklistField) => void;
  field: IChecklistField | null;
  isEditMode: boolean;
}

const FieldConfigDialog: React.FC<FieldConfigDialogProps> = ({
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
    visibleOnForm: ['admin', 'hr', 'interviewer'] as UserRole[],
    visibleInHistory: ['admin', 'hr', 'interviewer'] as UserRole[],
  });

  React.useEffect(() => {
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
          visibleOnForm: ['admin', 'hr', 'interviewer'] as UserRole[],
          visibleInHistory: ['admin', 'hr', 'interviewer'] as UserRole[],
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
          <DialogTitle>
            {isEditMode ? "Edit Field" : "Add Field"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6 py-4 pb-0">
          <div className="space-y-8 pb-6">
            {/* Field Label */}
            <div>
              <Label htmlFor="label" className="text-lg font-medium flex items-center gap-1 pb-3">
                Field Label<span className="text-red-500">*</span>
              </Label>
              <Input
                id="label"
                value={fieldData.label}
                onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
                className="text-lg py-3 px-4"
                placeholder="Enter field label..."
              />
            </div>

            {/* Field Type */}
            <div>
              <Label htmlFor="fieldType" className="text-lg font-medium">Field Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                {FIELD_TYPES.map((type) => {
                  const IconComponent = fieldTypeIcons[type.value];
                  const isSelected = fieldData.type === type.value;
                  return (
                    <div
                      key={type.value}
                      className={`relative p-4 rounded-lg cursor-pointer transition-all duration-200 ${isSelected
                        ? 'bg-gray-100 dark:bg-gray-700 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      onClick={() => setFieldData({ ...fieldData, type: type.value as any })}
                    >
                      {isSelected && (
                        <div
                          className="absolute -top-2 -right-2 text-white rounded-full p-1"
                          style={{ backgroundColor: 'var(--portal-primary, #6366f1)' }}
                        >
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="flex flex-col items-center text-center gap-2">
                        <IconComponent
                          className={`h-6 w-6 ${isSelected
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                        />
                        <span
                          className={`text-sm font-medium ${isSelected
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-700 dark:text-gray-300'
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
            {(fieldData.type === "select" || fieldData.type === "multiSelect" || fieldData.type === "radio" || fieldData.type === "checkbox") && (
              <div>
                <Label htmlFor="options" className="text-lg font-medium block pb-3">
                  Options <span className="text-sm text-gray-500 dark:text-gray-400">(Hit Enter to Add)</span>
                </Label>
                <ChipInput
                  value={fieldData.options || []}
                  onChange={(newOptions) =>
                    setFieldData({
                      ...fieldData,
                      options: newOptions
                        .map((option) => option.trim())
                        .filter((option) => option !== "")
                    })
                  }
                  placeholder="Type an option and press Enter..."
                  suggestions={[]}
                />
              </div>
            )}

            {/* Placeholder */}
            {["text", "number", "email", "textarea"].includes(fieldData.type) && (
              <div>
                <Label htmlFor="placeholder" className="text-lg font-medium block pb-3">Placeholder</Label>
                <Input
                  id="placeholder"
                  value={fieldData.placeholder || ""}
                  onChange={(e) => setFieldData({ ...fieldData, placeholder: e.target.value })}
                  className="text-lg py-3 px-4"
                  placeholder="Enter placeholder text..."
                />
              </div>
            )}

            {/* Field Options */}
            <div>
              <Label className="text-lg font-medium mb-4 block">Field Options</Label>
              <div className="grid grid-cols-1 gap-4">
                <div
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${fieldData.required
                    ? 'bg-gray-50 dark:bg-gray-800'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  onClick={() => setFieldData({ ...fieldData, required: !fieldData.required })}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${fieldData.required
                          ? ''
                          : 'border-gray-300 dark:border-gray-600'
                          }`}
                        style={fieldData.required ? {
                          backgroundColor: 'var(--portal-primary, #6366f1)',
                          borderColor: 'var(--portal-primary, #6366f1)'
                        } : {}}
                      >
                        {fieldData.required && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <div
                          className="font-medium text-gray-700 dark:text-gray-300"
                        >
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
              <Label className="text-lg font-medium mb-4 block">Field Visibility</Label>
              <div className="grid grid-cols-1 gap-6">

                {/* Visible on Form */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Label className="text-sm font-medium">Visible on Form to:</Label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['admin', 'hr', 'interviewer'] as UserRole[]).map((role) => (
                      <div
                        key={role}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${fieldData.visibleOnForm.includes(role)
                          ? 'bg-gray-50 dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        onClick={() => {
                          const isSelected = fieldData.visibleOnForm.includes(role);
                          const newVisibleOnForm = isSelected
                            ? fieldData.visibleOnForm.filter(r => r !== role)
                            : [...fieldData.visibleOnForm, role];
                          setFieldData({ ...fieldData, visibleOnForm: newVisibleOnForm });
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center ${fieldData.visibleOnForm.includes(role)
                                ? ''
                                : 'border-gray-300 dark:border-gray-600'
                                }`}
                              style={fieldData.visibleOnForm.includes(role) ? {
                                backgroundColor: 'var(--portal-primary, #3b82f6)',
                                borderColor: 'var(--portal-primary, #3b82f6)'
                              } : {}}
                            >
                              {fieldData.visibleOnForm.includes(role) && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <div>
                              <div
                                className="font-medium text-sm capitalize text-gray-700 dark:text-gray-300"
                              >
                                {role}
                              </div>
                            </div>
                          </div>
                          <Users className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visible in History */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Label className="text-sm font-medium">Visible in History to:</Label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['admin', 'hr', 'interviewer'] as UserRole[]).map((role) => (
                      <div
                        key={role}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${fieldData.visibleInHistory.includes(role)
                          ? 'bg-gray-50 dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        onClick={() => {
                          const isSelected = fieldData.visibleInHistory.includes(role);
                          const newVisibleInHistory = isSelected
                            ? fieldData.visibleInHistory.filter(r => r !== role)
                            : [...fieldData.visibleInHistory, role];
                          setFieldData({ ...fieldData, visibleInHistory: newVisibleInHistory });
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center ${fieldData.visibleInHistory.includes(role)
                                ? ''
                                : 'border-gray-300 dark:border-gray-600'
                                }`}
                              style={fieldData.visibleInHistory.includes(role) ? {
                                backgroundColor: 'var(--portal-primary, #8b5cf6)',
                                borderColor: 'var(--portal-primary, #8b5cf6)'
                              } : {}}
                            >
                              {fieldData.visibleInHistory.includes(role) && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <div>
                              <div
                                className="font-medium text-sm capitalize text-gray-700 dark:text-gray-300"
                              >
                                {role}
                              </div>
                            </div>
                          </div>
                          <Users className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
              disabled={!fieldData.label.trim()}
              variant="success"
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