import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableStateSnapshot,
  DraggableProvided,
} from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit, Trash2, Type } from 'lucide-react';
import { IChecklistField, UserRole } from '@/lib/models/JobLaneConfig';
import { FIELD_TYPES, fieldTypeIcons } from './constants';

interface ChecklistFieldListProps {
  fields: IChecklistField[];
  onEditField: (field: IChecklistField) => void;
  onRemoveField: (fieldId: string) => void;
  onDragEnd: (result: DropResult) => void;
  userRole: string;
}

export function ChecklistFieldList({
  fields,
  onEditField,
  onRemoveField,
  onDragEnd,
  userRole,
}: ChecklistFieldListProps) {
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
        {(provided: DroppableProvided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3"
          >
            {visibleFields.map((field, index) => {
              const IconComponent = fieldTypeIcons[field.type] || Type;
              return (
                <Draggable key={field.id} draggableId={field.id} index={index}>
                  {(
                    draggableProvided: DraggableProvided,
                    snapshot: DraggableStateSnapshot,
                  ) => {
                    const draggingComponent = (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        style={{
                          ...draggableProvided.draggableProps.style,
                        }}
                      >
                        <Card
                          className={`p-4 transition-shadow hover:shadow-md ${
                            snapshot.isDragging
                              ? 'scale-105 border-2 border-primary bg-white opacity-95 shadow-2xl dark:bg-black'
                              : 'shadow-sm hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground active:cursor-grabbing"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                                <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {field.label}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
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
                                      className="px-1.5 py-0.5 text-xs"
                                    >
                                      Required
                                    </Badge>
                                  )}
                                  {field.options &&
                                    field.options.length > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="px-1.5 py-0.5 text-xs"
                                      >
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
}
