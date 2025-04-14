import React, { useContext, useState, useCallback } from "react";
import { CustomFieldsContext } from "../../Context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "lucide-react";
import AddFormID from "./AddFormID";
import { CustomField } from "../../Types/CustomField";
import { Badge } from "@/components/ui/badge";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";
// import { IconButton } from "@mui/material";
interface CardProps {
  formId: string;
  formName: string;
  fields?: CustomField[];
}

function FormIDCard({ formId, formName, fields }: CardProps) {
  const {
    handleDeleteFormId,
    setStepName,
    selecteFormIdTarget,
    deleteFormIDAllCustomFields,
  } = useContext(CustomFieldsContext);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // const handleEdit = useCallback(
  //   (event: React.MouseEvent<HTMLButtonElement>) => {
  //     event.stopPropagation();
  //     setIsOpen(true);
  //   },
  //   [setIsOpen]
  // );

  const handleDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      // handleDeleteFormId(formId);
      deleteFormIDAllCustomFields(formId);
    },
    [formId, handleDeleteFormId]
  );

  const hadleClick = useCallback(() => {
    selecteFormIdTarget(formId);
    setStepName("formCustomFieldList");
  }, [formId, selecteFormIdTarget, setStepName]);

  return (
    <>
      <Card onClick={hadleClick} className="cursor-pointer">
        <CardHeader>
          <CardTitle className="capitalize">
            {formName}{" "}
            {/* <IconButton onClick={handleEdit} style={{backgroundColor:"whitesmoke", height:"30px", width:"30px"}}>
              <EditIcon className="w-2 h-2" style={{height:"13px"}}/>
            </IconButton> */}
          </CardTitle>
          <div className="flex flex-wrap">
            {fields && fields.length > 0 ? (
              fields.map((field) => (
                <Badge key={field.id} className="capitalize p-2 mr-2">
                  {field.label}
                </Badge>
              ))
            ) : (
              <Badge className="capitalize p-2 mr-2">No fields</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex justify-end gap-2">
          <Button
            className="z-100"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
      <AddFormID isOpen={isOpen} setIsOpen={setIsOpen} formId={formId} />
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Meta Field</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the form &quot;{formName}&quot;?
              This action cannot be undone.
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
              onClick={(event) => {
                handleDelete(event);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default React.memo(FormIDCard);
