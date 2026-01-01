/* eslint-disable max-lines */
import React, { useCallback, useContext, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  EyeOff,
  User,
  CreditCard,
  Settings,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
  DraggableProvidedDragHandleProps,
} from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import logger from '@/lib/logger';
import { AddSpecificCustomFieldForm } from '../AddSpecificCustomFieldForm';
import { CustomField } from '../../Types/CustomField';
import { CustomFieldsContext } from '../../Context';

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
  text: 'Text Input',
  textarea: 'Text Area',
  number: 'Number Input',
  select: 'Select Dropdown',
  multiSelect: 'Multi-Select',
  radio: 'Radio Buttons',
  checkbox: 'Checkbox',
  date: 'Date Picker',
  time: 'Time Picker',
  datetime: 'Date & Time',
  password: 'Password',
  file: 'File Upload',
};

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
        <div className="mb-2 w-full">
          <Card
            className={`w-full !border border-l-4 !border-gray-200 border-l-blue-500 !bg-white backdrop-blur-sm transition-all duration-200 dark:!border-gray-700/50 dark:border-l-blue-400 dark:!bg-gray-900 ${
              isDragging
                ? 'scale-105 border-l-blue-600 !shadow-2xl ring-2 ring-blue-500 ring-offset-2 dark:border-l-blue-300 dark:ring-blue-400 dark:ring-offset-gray-900'
                : 'hover:-translate-y-0.5 hover:border-l-blue-600 hover:!bg-white hover:!shadow-xl dark:hover:border-l-blue-300 dark:hover:!bg-gray-800'
            } `}
          >
            <CardHeader className="pb-4 pt-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <div
                    {...dragHandleProps}
                    className="mt-0.5 cursor-grab touch-none select-none rounded-md p-2 transition-colors duration-150 hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-gray-700/50"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="rounded-xl p-3 shadow-sm"
                          style={{
                            backgroundColor:
                              'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
                          }}
                        >
                          <IconComponent
                            className="h-5 w-5"
                            style={{ color: 'var(--portal-primary, #6366f1)' }}
                          />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {field.label.split(' |||||(')[0]}
                          </CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {fieldTypeLabels[field.type] || field.type}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Field Properties */}
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <div
                            className={`h-2 w-2 rounded-full ${field.required ? 'bg-red-500' : 'bg-gray-300'}`}
                          />
                          <span className="text-gray-600 dark:text-gray-300">
                            {field.required ? 'Required' : 'Optional'}
                          </span>
                        </div>

                        {field.defaultValue &&
                          field.defaultValue !== '' &&
                          !(
                            Array.isArray(field.defaultValue) &&
                            field.defaultValue.length === 0
                          ) && (
                            <div className="flex items-center gap-2 text-sm">
                              <Settings className="h-3 w-3 text-blue-500" />
                              <span className="truncate text-gray-600 dark:text-gray-300">
                                Default:{' '}
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {Array.isArray(field.defaultValue)
                                    ? field.defaultValue
                                        .slice(0, 2)
                                        .join(', ') +
                                      (field.defaultValue.length > 2
                                        ? '...'
                                        : '')
                                    : field.defaultValue}
                                </span>
                              </span>
                            </div>
                          )}

                        {field.options && field.options.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <List className="h-3 w-3 text-indigo-500" />
                            <span className="text-gray-600 dark:text-gray-300">
                              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                                {field.options.length}
                              </span>{' '}
                              option
                              {field.options.length !== 1 ? 's' : ''}
                            </span>
                            <div className="ml-2 flex items-center gap-1">
                              {field.options.slice(0, 3).map((option) => (
                                <span
                                  key={option.toString()}
                                  className="rounded-md bg-gradient-to-r from-indigo-50 to-purple-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:from-indigo-900/30 dark:to-purple-900/30 dark:text-indigo-300"
                                >
                                  {option.length > 8
                                    ? `${option.substring(0, 8)}...`
                                    : option}
                                </span>
                              ))}
                              {field.options.length > 3 && (
                                <span className="rounded-md border border-gray-300 bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200">
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
                            <span className="text-gray-600 dark:text-gray-300">
                              Hidden from candidates
                            </span>
                          </div>
                        )}

                        {field.privateInt && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-purple-500" />
                            <span className="text-gray-600 dark:text-gray-300">
                              Hidden from interviewers
                            </span>
                          </div>
                        )}

                        {field.showOnCard && (
                          <div className="flex items-center gap-2 text-sm">
                            <CreditCard className="h-3 w-3 text-green-500" />
                            <span className="text-gray-600 dark:text-gray-300">
                              Shows on cards
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex items-center gap-1">
                  {field.jobId && (
                    <Badge
                      variant="outline"
                      className="border-purple-200 bg-purple-50 px-2 py-1 text-xs text-purple-700 dark:border-purple-700/50 dark:bg-black dark:text-purple-300"
                    >
                      Job Specific
                    </Badge>
                  )}
                  {field.candidateId && (
                    <Badge
                      variant="outline"
                      className="border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 dark:border-green-700/50 dark:bg-black dark:text-green-300"
                    >
                      Candidate Specific
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCustomField()}
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent size="sm" aria-describedby="delete-field-description">
            <DialogHeader>
              <DialogTitle>Delete Personalized Field</DialogTitle>
              <DialogDescription id="delete-field-description">
                Are you sure you want to delete the field &quot;
                {field.label.split(' |||||(')[0]}
                &quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
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
  },
);

CustomFieldItem.displayName = 'CustomFieldItem';

function SpecificCustomFieldList({
  jobId,
  candidateId,
  jobTitle,
  candidateName,
}: {
  jobId?: string;
  candidateId?: string;
  jobTitle?: string;
  candidateName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField>();
  const [orderedFields, setOrderedFields] = useState<CustomField[]>([]);
  const [formOpen, setFormOpen] = useState<boolean>(false);

  // Custom function to handle draggable styling
  const getDraggableStyle = (
    isDragging: boolean,
    draggableStyle: React.CSSProperties,
  ) => {
    if (!isDragging) {
      return draggableStyle;
    }

    return {
      ...draggableStyle,
      position: 'fixed' as const,
      top: draggableStyle?.top,
      left: draggableStyle?.left,
      zIndex: 9999,
      outline: 'none',
    };
  };

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const handleAddField = () => {
    setFormOpen(true);
  };

  const {
    selectedFormId,
    handleDeleteCustomField,
    setCustomFields,
    customFields,
    handleAddCustomField,
    handleEditCustomField,
  } = useContext(CustomFieldsContext);

  React.useEffect(() => {
    if (selectedFormId?.fields) {
      const filteredFields = selectedFormId.fields.filter(
        (field) =>
          (field.candidateId && field.candidateId === candidateId) ||
          (field.jobId && field.jobId === jobId),
      );
      setOrderedFields(filteredFields);
    } else {
      setOrderedFields([]);
    }
  }, [selectedFormId?.fields, candidateId, jobId]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    if (selectedFormId) {
      const allFields = customFields[selectedFormId.formId].fields;
      const matchingFields = allFields.filter(
        (field) =>
          (candidateId && field.candidateId === candidateId) ||
          (jobId && field.jobId === jobId),
      );
      const otherFields = allFields.filter(
        (field) =>
          !(
            (candidateId && field.candidateId === candidateId) ||
            (jobId && field.jobId === jobId)
          ),
      );
      if (
        JSON.stringify(matchingFields.map((f) => f.id)) !==
        JSON.stringify(orderedFields.map((f) => f.id))
      ) {
        logger.warn(
          'orderedFields does not match the expected fields for candidateId/jobId',
          { matchingFields, orderedFields },
        );
        return;
      }
      // Combine reordered fields with other fields
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

  const handleSave = (newField: CustomField) => {
    if (selectedFormId) {
      customFields[selectedFormId.formId].fields.forEach((field) => {
        if (
          field.label === newField.label &&
          !field.jobId &&
          !field.candidateId &&
          field.id !== newField.id
        ) {
          newField.label += ' |||||(i)';
        }
      });
    }

    if (
      !isEditMode &&
      selectedFormId?.fields.some(
        (field) =>
          field.label === newField.label &&
          field.id === newField.id &&
          ((field.jobId && field.jobId === jobId) ||
            (field.candidateId && field.candidateId === candidateId)),
      )
    ) {
      return;
    }

    if (isEditMode) {
      handleEditCustomField(
        newField as CustomField,
        selectedFormId?.formId || null,
      );
    } else {
      handleAddCustomField(newField, selectedFormId?.formId || '');
    }
    setIsOpen(false);
    setFormOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="primary"
          onClick={handleAddField}
          className="flex items-center gap-2"
        >
          Add a new field
        </Button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="custom-fields">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="mt-2 w-full space-y-2"
              style={{
                minHeight: '100px',
                position: 'relative',
              }}
            >
              {orderedFields.length === 0 ? (
                <div className="w-full justify-center border-none py-10 text-center text-gray-500 dark:text-gray-400">
                  No personalized fields
                </div>
              ) : (
                orderedFields.map((field, index) => (
                  <Draggable
                    key={field.id}
                    draggableId={field.id}
                    index={index}
                  >
                    {(
                      draggableProvided: DraggableProvided,
                      snapshot: DraggableStateSnapshot,
                    ) => {
                      const child = (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className="w-full"
                          style={getDraggableStyle(
                            snapshot.isDragging,
                            draggableProvided.draggableProps.style,
                          )}
                        >
                          <CustomFieldItem
                            field={field}
                            dragHandleProps={draggableProvided.dragHandleProps}
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
                                  selectedFormId.formId,
                                );
                              }
                            }}
                          />
                        </div>
                      );

                      if (
                        snapshot.isDragging &&
                        typeof window !== 'undefined'
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

      {formOpen && (
        <AddSpecificCustomFieldForm
          isOpen
          handleClose={() => {
            handleClose();
            setFormOpen(false);
          }}
          isEditMode={false}
          onSave={handleSave}
          jobId={jobId}
          candidateId={candidateId}
          jobTitle={jobTitle}
          candidateName={candidateName}
          existingFields={selectedFormId?.fields}
        />
      )}

      {isEditMode && (
        <AddSpecificCustomFieldForm
          isOpen={isOpen}
          handleClose={() => {
            handleClose();
            setIsEditMode(false);
          }}
          initialValues={selectedField}
          isEditMode={isEditMode}
          onSave={handleSave}
          jobId={jobId}
          candidateId={candidateId}
          jobTitle={jobTitle}
          candidateName={candidateName}
          existingFields={selectedFormId?.fields}
        />
      )}
    </div>
  );
}

export default React.memo(SpecificCustomFieldList);
