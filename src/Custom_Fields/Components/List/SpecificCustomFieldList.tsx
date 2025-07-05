import React, { useCallback, useContext, useState } from "react";
import { CustomFieldsContext } from "../../Context";
import { CustomField } from "../../Types/CustomField";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { CustomFieldItem } from "./CustomFieldList";
import { AddSpecificCustomFieldForm } from "../AddSpecificCustomFieldForm";
import CustomFieldForm from "../Form/CustomFieldForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

function SpecificCustomFieldList({
  jobId,
  candidateId,
}: {
  jobId?: string;
  candidateId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField>();
  const [orderedFields, setOrderedFields] = useState<CustomField[]>([]);
  const [formOpen, setFormOpen] = useState<boolean>(false);

  const handleAddField = () => {
    setFormOpen(true);
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
    handleAddCustomField,
    // postCustomFields,
  } = useContext(CustomFieldsContext);

  // Initialize orderedFields when selectedFormId changes
  React.useEffect(() => {
    if (selectedFormId?.fields) {
      setOrderedFields(selectedFormId.fields);
    }
  }, [selectedFormId?.fields]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    // debugger
    if (selectedFormId) {
      const orderedItems = {
        ...customFields,
        [selectedFormId.formId]: {
          ...selectedFormId,
          fields: items,
        },
      };
      setCustomFields(orderedItems);
    }
    setOrderedFields(items);
  };

  const handleSave = (newField: CustomField) => {
    handleAddCustomField(newField, selectedFormId?.formId || "");
    setIsOpen(false);
    // postCustomFields()
  };
  if (formOpen) {
    return (
      <AddSpecificCustomFieldForm
        handleClose={() => setFormOpen(false)}
        onSave={handleSave}
        jobId={jobId}
        candidateId={candidateId}
      />
    );
  }
  return (
    <div className="relative w-full">
      <div className="mb-4 flex justify-end">
        <Button onClick={handleAddField}>
          <Plus /> Add Meta Field
        </Button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="custom-fields">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="w-full"
            >
              {orderedFields.map((field, index) => {
                if (field.jobId !== jobId) return;
                if (field.candidateId !== candidateId) return;
                return (
                  <Draggable
                    key={field.id}
                    draggableId={field.id}
                    index={index}
                  >
                    {(
                      provided: DraggableProvided,
                      snapshot: DraggableStateSnapshot
                    ) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="mb-2 w-full"
                        style={{
                          ...provided.draggableProps.style,
                          left: 0,
                          right: 0,
                          width: "100%",
                        }}
                      >
                        <CustomFieldItem
                          field={field}
                          dragHandleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                          handleEditCustomField={() => {
                            setSelectedField(field);
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
                    )}
                  </Draggable>
                );
              })}
              {orderedFields.filter((field) => {
                if (field.jobId !== jobId || field.candidateId !== candidateId)
                  return false;
                else return true;
              }).length === 0 || !orderedFields ? (
                <div className="w-full flex items-center justify-center">
                  No Meta fields
                </div>
              ) : (
                ""
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <CustomFieldForm
        isOpen={isOpen}
        handleClose={handleClose}
        initialValue={selectedField}
      />
    </div>
  );
}

export default React.memo(SpecificCustomFieldList);
