"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import { DropResult } from "@hello-pangea/dnd";
import {
  Plus,
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  Save,
} from "lucide-react";
import {
  useGetJobLaneConfigQuery,
  useUpdateLaneConfigMutation,
  useGetChecklistTemplatesQuery,
  useCreateChecklistTemplateMutation,
} from "@/lib/features/checklist/checklistApi";
import {
  IChecklistField,
  IChecklist,
} from "@/lib/models/JobLaneConfig";
import { useSelector } from "react-redux";

// Import new sub-components
import { FieldConfigDialog } from "./lane-checklist-config-components/FieldConfigDialog";
import { ChecklistFieldList } from "./lane-checklist-config-components/ChecklistFieldList";
import { ChecklistEmptyState } from "./lane-checklist-config-components/ChecklistEmptyState";
import { ChecklistHeader } from "./lane-checklist-config-components/ChecklistHeader";
import { ChecklistBasicInfo } from "./lane-checklist-config-components/ChecklistBasicInfo";
import { SaveTemplateDialog } from "./lane-checklist-config-components/SaveTemplateDialog";
import { TemplateSelector } from "./lane-checklist-config-components/TemplateSelector";

interface LaneChecklistConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  laneId: string;
  laneName: string;
  initialTab?: "incoming" | "outgoing";
}

export const LaneChecklistConfigDialog = ({
  isOpen,
  onOpenChange,
  jobId,
  laneId,
  laneName,
  initialTab = "incoming",
}: LaneChecklistConfigDialogProps) => {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">(
    initialTab
  );
  const [incomingChecklist, setIncomingChecklist] = useState<
    IChecklist | undefined
  >();
  const [outgoingChecklist, setOutgoingChecklist] = useState<
    IChecklist | undefined
  >();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<IChecklistField | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: laneConfig, refetch } = useGetJobLaneConfigQuery(jobId);
  const { data: templates } = useGetChecklistTemplatesQuery({ active: true });
  const [updateLaneConfig] = useUpdateLaneConfigMutation();
  const [createTemplate] = useCreateChecklistTemplateMutation();

  // Template-related state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const { user } = useSelector((state: any) => state.auth || {});

  // Load existing configuration
  useEffect(() => {
    if (laneConfig && isOpen) {
      const existingLaneConfig = laneConfig.laneConfigs.find(
        (lc) => lc.laneId === laneId
      );
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
        fields: currentChecklist.fields.map((field) =>
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

  const removeField = (fieldId: string) => {
    const currentChecklist = getCurrentChecklist();
    if (!currentChecklist) return;

    setCurrentChecklist({
      ...currentChecklist,
      fields: currentChecklist.fields
        .filter((field) => field.id !== fieldId)
        .map((field, index) => ({ ...field, order: index })),
    });
  };

  const handleDragEnd = (result: DropResult) => {
    const currentChecklist = getCurrentChecklist();
    if (!currentChecklist || !result.destination) return;

    const newFields = [...currentChecklist.fields];
    const [reorderedItem] = newFields.splice(result.source.index, 1);
    newFields.splice(result.destination.index, 0, reorderedItem);

    setCurrentChecklist({
      ...currentChecklist,
      fields: newFields,
    });
  };

  const loadFromTemplate = (templateId: string) => {
    const template = templates?.find((t) => t._id.toString() === templateId.toString());
    if (!template) return;

    const checklistFromTemplate: IChecklist = {
      id: `checklist_${Date.now()}`,
      name: template.name,
      description: template.description || "",
      fields: template.fields.map((field) => ({
        ...field,
        id: `field_${Date.now()}_${field.id}`,
      })),
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
      const cleanFields = currentChecklist.fields.map((field) => {
        const { _id, ...cleanField } = field as any;
        return {
          ...cleanField,
          visibleInHistory: cleanField.visibleInHistory || [],
          visibleOnForm: cleanField.visibleOnForm || [],
        };
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
        description:
          typeof error === "object" &&
          "data" in error &&
          (error as any).data &&
          typeof (error as any).data == "object" &&
          "error" in (error as any).data
            ? ((error as any).data.error as string)
            : "Failed to save template",
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
  const filteredTemplates =
    templates?.filter((t) => t.type === activeTab) || [];

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

  let currentChecklist = getCurrentChecklist();
  useEffect(() => {
    currentChecklist = getCurrentChecklist();
  }, [incomingChecklist, outgoingChecklist]);

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
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "incoming"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowRight className="h-4 w-4" />
                Incoming Checklist
                {incomingChecklist && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab("outgoing")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "outgoing"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Outgoing Checklist
                {outgoingChecklist && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </button>
            </div>
          </div>

          <div className="px-6 space-y-6">
            {/* Template Selection */}
            {currentChecklist && currentChecklist.fields.length > 0 && <TemplateSelector
              filteredTemplates={filteredTemplates}
              onLoadFromTemplate={loadFromTemplate}
              currentChecklist={currentChecklist}
            />}

            {/* Checklist Configuration */}
            {!currentChecklist ? (
              <ChecklistEmptyState
                activeTab={activeTab}
                filteredTemplates={filteredTemplates}
                onLoadFromTemplate={loadFromTemplate}
                onCreateNew={createNewChecklist}
              />
            ) : (
              <Card>
                <ChecklistHeader
                  onSaveAsTemplate={openSaveTemplateDialog}
                  onRemoveChecklist={() => setCurrentChecklist(undefined)}
                />
                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <ChecklistBasicInfo
                    checklist={currentChecklist}
                    onChange={(updates) =>
                      setCurrentChecklist({ ...currentChecklist!, ...updates })
                    }
                  />

                  <Separator />

                  {/* Fields */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium">Checklist Fields</h4>
                      <Button size="sm" onClick={addField} variant="primary">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </div>

                    <ChecklistFieldList
                      fields={currentChecklist.fields}
                      onEditField={editField}
                      onRemoveField={removeField}
                      onDragEnd={handleDragEnd}
                      userRole={user.role}
                    />

                    {currentChecklist.fields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No fields added yet. Click "Add Field" to get started.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-background px-6 py-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            variant="primary"
          >
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
      <SaveTemplateDialog
        isOpen={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        templateName={templateName}
        setTemplateName={setTemplateName}
        templateDescription={templateDescription}
        setTemplateDescription={setTemplateDescription}
        onSave={saveAsTemplate}
        activeTab={activeTab}
      />
    </Dialog>
  );
};
