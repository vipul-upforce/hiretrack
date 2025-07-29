import React, { useCallback, useContext, useState } from "react";
import { CustomFieldsContext } from "../../Context";
import { CustomField } from "../../Types/CustomField";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  Trash, 
  GripVertical, 
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
  Eye,
  EyeOff,
  User,
  Users,
  Star,
  CreditCard,
  Settings
} from "lucide-react";
import CustomFieldForm from "../Form/CustomFieldForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
  DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { createPortal } from "react-dom";

const fieldTypeIcons: Record<string, React.ElementType> = {
  text: Type,
  textarea: FileText,
  number: Hash,
  select: ChevronDown,
  multiSelect: List,
  radio: Circle,
  checkbox: CheckSquare,
  date: Calendar,
  time: Clock,
  datetime: CalendarClock,
  password: Lock,
  file: Upload,
};

const fieldTypeLabels: Record<string, string> = {
  text: "Text Input",
  textarea: "Text Area",
  number: "Number Input",
  select: "Select Dropdown",
  multiSelect: "Multi-Select",
  radio: "Radio Buttons",
  checkbox: "Checkbox",
  date: "Date Picker",
  time: "Time Picker",
  datetime: "Date & Time",
  password: "Password",
  file: "File Upload",
};

function CustomFieldList() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField>();
  const [orderedFields, setOrderedFields] = useState<CustomField[]>([]);

  // Custom function to handle draggable styling
  const getDraggableStyle = (isDragging: boolean, draggableStyle: any) => {
    if (!isDragging) {
      return draggableStyle;
    }

    return {
      ...draggableStyle,
      position: "fixed" as const,
      top: draggableStyle?.top,
      left: draggableStyle?.left,
      zIndex: 9999,
      outline: "none",
    };
  };

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const {
    selectedFormId,
    handleDeleteCustomField,
    setCustomFields,
    customFields,
  } = useContext(CustomFieldsContext);

  React.useEffect(() => {
    if (selectedFormId?.fields) {
      const filteredFields = selectedFormId.fields.filter(
        (field) => !field.candidateId && !field.jobId
      );
      setOrderedFields(filteredFields);
    } else {
      setOrderedFields([]);
    }
  }, [selectedFormId?.fields]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    if (selectedFormId) {
      const allFields = selectedFormId.fields;
      const otherFields = allFields.filter(
        (field) => field.candidateId || field.jobId
      );
      const reorderedFields = [...items, ...otherFields];

      const orderedItems = {
        ...customFields,
        [selectedFormId.formId]: {
          ...selectedFormId,
          fields: reorderedFields,
        },
      };
      setCustomFields(orderedItems);
    }
    setOrderedFields(items);
  };

  return (
    <div className="relative w-full">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="custom-fields">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="w-full space-y-2 mt-2"
              style={{
                minHeight: "100px",
                position: "relative",
              }}
            >
              {orderedFields.length === 0 ? (
                <div className="w-full text-center justify-center border-none py-10 text-gray-500 dark:text-gray-400">
                  No personalized form fields
                </div>
              ) : (
                orderedFields.map((field, index) => (
                  <Draggable
                    key={field.id}
                    draggableId={field.id}
                    index={index}
                  >
                    {(
                      provided: DraggableProvided,
                      snapshot: DraggableStateSnapshot
                    ) => {
                      const child = (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="w-full"
                          style={getDraggableStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )}
                        >
                          <CustomFieldItem
                            field={field}
                            dragHandleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                            handleEditCustomField={() => {
                              setSelectedField(field);
                              setIsEditMode(true);
                              handleOpen();
                            }}
                            handleDeleteCustomField={() => {
                              if (selectedFormId?.formId) {
                                handleDeleteCustomField(
                                  field.id,
                                  selectedFormId.formId
                                );
                              }
                            }}
                          />
                        </div>
                      );

                      if (
                        snapshot.isDragging &&
                        typeof window !== "undefined"
                      ) {
                        return createPortal(child, document.body);
                      }

                      return child;
                    }}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <CustomFieldForm
        isOpen={isOpen}
        isEditMode={isEditMode}
        handleClose={() => {
          handleClose();
          setIsEditMode(false);
        }}
        initialValue={selectedField}
        existingFields={selectedFormId?.fields}
      />
    </div>
  );
}

export default React.memo(CustomFieldList);

interface CustomFieldItemProps {
  field: CustomField;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  isDragging: boolean;
  handleEditCustomField: () => void;
  handleDeleteCustomField: () => void;
}

export const CustomFieldItem = React.memo(
  ({
    field,
    dragHandleProps,
    isDragging,
    handleEditCustomField,
    handleDeleteCustomField,
  }: CustomFieldItemProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const IconComponent = fieldTypeIcons[field.type] || Type;

    return (
      <>
        <div className="w-full">
          <Card
            className={`
              w-full transition-all duration-200 border-l-4 border-l-blue-500 dark:border-l-blue-400 !bg-white dark:!bg-gray-900 !border !border-gray-200 dark:!border-gray-700/50 backdrop-blur-sm
              ${
                isDragging
                  ? "!shadow-2xl ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 dark:ring-offset-gray-900 scale-105 border-l-blue-600 dark:border-l-blue-300"
                  : "hover:!shadow-xl hover:border-l-blue-600 dark:hover:border-l-blue-300 hover:-translate-y-0.5 hover:!bg-gray-50 dark:hover:!bg-gray-800"
              }
            `}
          >
            <CardHeader className="pb-4 pt-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    {...dragHandleProps}
                    className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-grab active:cursor-grabbing touch-none select-none mt-0.5 transition-colors duration-150"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl shadow-sm">
                          <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {field.label.split(" |||||(")[0]}
                          </CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {fieldTypeLabels[field.type] || field.type}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Field Properties */}
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <div className={`w-2 h-2 rounded-full ${field.required ? 'bg-red-500' : 'bg-gray-300'}`} />
                          <span className="text-gray-600 dark:text-gray-300">
                            {field.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        
                        {field.defaultValue && 
                         field.defaultValue !== '' && 
                         !(Array.isArray(field.defaultValue) && field.defaultValue.length === 0) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Settings className="h-3 w-3 text-blue-500" />
                            <span className="text-gray-600 dark:text-gray-300 truncate">
                              Default: <span className="font-medium text-blue-600 dark:text-blue-400">
                                {Array.isArray(field.defaultValue) ? 
                                  field.defaultValue.slice(0, 2).join(', ') + (field.defaultValue.length > 2 ? '...' : '') : 
                                  field.defaultValue
                                }
                              </span>
                            </span>
                          </div>
                        )}
                        
                        {field.options && field.options.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <List className="h-3 w-3 text-indigo-500" />
                            <span className="text-gray-600 dark:text-gray-300">
                              <span className="font-medium text-indigo-600 dark:text-indigo-400">{field.options.length}</span> option{field.options.length !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-1 ml-2">
                              {field.options.slice(0, 3).map((option, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-md font-medium">
                                  {option.length > 8 ? option.substring(0, 8) + '...' : option}
                                </span>
                              ))}
                              {field.options.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs rounded-md font-medium">
                                  +{field.options.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {field.private && (
                          <div className="flex items-center gap-2 text-sm">
                            <EyeOff className="h-3 w-3 text-orange-500" />
                            <span className="text-gray-600 dark:text-gray-300">Hidden from candidates</span>
                          </div>
                        )}
                        
                        {field.privateInt && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-purple-500" />
                            <span className="text-gray-600 dark:text-gray-300">Hidden from interviewers</span>
                          </div>
                        )}
                        
                        {field.showOnCard && (
                          <div className="flex items-center gap-2 text-sm">
                            <CreditCard className="h-3 w-3 text-green-500" />
                            <span className="text-gray-600 dark:text-gray-300">Shows on cards</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-4">
                  {field.jobId && (
                    <Badge variant="outline" className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/50">
                      Job Specific
                    </Badge>
                  )}
                  {field.candidateId && (
                    <Badge variant="outline" className="text-xs px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700/50">
                      Candidate Specific
                    </Badge>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCustomField()}
                    className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent aria-describedby="delete-field-description" className="bg-white dark:bg-black border dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-gray-100">Delete Meta Field</DialogTitle>
              <DialogDescription id="delete-field-description" className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete the field &quot;
                {field.label.split(" |||||(")[0]}
                &quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="border-t dark:border-gray-700 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteCustomField();
                  setShowDeleteDialog(false);
                }}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

CustomFieldItem.displayName = "CustomFieldItem";
