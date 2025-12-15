import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GripVertical, Edit, Trash2, Type,
} from 'lucide-react';
import { IChecklistField, UserRole } from '@/lib/models/JobLaneConfig';
import { FIELD_TYPES, fieldTypeIcons } from './constants';

interface ChecklistFieldListProps {
  fields: IChecklistField[];
  onEditField: (field: IChecklistField) => void;
  onRemoveField: (fieldId: string) => void;
  onDragEnd: (result: DropResult) => void;
  userRole: string;
}

export const ChecklistFieldList: React.FC<ChecklistFieldListProps> = ({
  fields,
  onEditField,
  onRemoveField,
  onDragEnd,
  userRole,
}) => {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPortalContainer(document.body);
    }
  }, []);

  // Filter fields based on user role visibility
  const visibleFields = fields.filter((field) => {
    if (userRole !== 'admin') {
      return field.visibleOnForm.includes(userRole as UserRole);
    }
    return true;
  });

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="checklist-fields">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3"
          >
            {visibleFields.map((field, index) => {
              const IconComponent = fieldTypeIcons[field.type] || Type;
              return (
                <Draggable
                  key={field.id}
                  draggableId={field.id}
                  index={index}
                >
                  {(provided, snapshot) => {
                    const draggingComponent = (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                        }}
                      >
                        <Card
                          className={`p-4 hover:shadow-md transition-shadow ${
                            snapshot.isDragging
                              ? 'shadow-2xl bg-white dark:bg-black border-2 border-primary opacity-95 scale-105'
                              : 'shadow-sm hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                {...provided.dragHandleProps}
                                className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {field.label}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <span>
                                    {
                                      FIELD_TYPES.find(
                                        (t) => t.value === field.type,
                                      )?.label
                                    }
                                  </span>
                                  {field.required && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-1.5 py-0.5"
                                    >
                                      Required
                                    </Badge>
                                  )}
                                  {field.options
                                    && field.options.length > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs px-1.5 py-0.5"
                                      >
                                        {field.options.length}
                                        {' '}
                                        options
                                      </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onEditField(field)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => onRemoveField(field.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    );
                    if (snapshot.isDragging && portalContainer) {
                      return createPortal(draggingComponent, portalContainer);
                    }
                    return draggingComponent;
                  }}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
