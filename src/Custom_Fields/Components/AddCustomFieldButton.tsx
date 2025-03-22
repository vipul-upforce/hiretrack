"use client"
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CustomFieldDialog from "./Common/CustomFieldDialog";
import React, { useContext, useEffect, useState, useCallback } from "react";
import Stepper from "./Stepper";
import { CustomFieldsContext } from "../Context";
function AddCustomFields() {
  const { setStepName } = useContext(CustomFieldsContext);
  const [isOpen, setIsOpen] = useState(false);
  const onClick = () => {
    setIsOpen(true);
  };

  const handleClose = useCallback(() => {
    setStepName("FormList");
    setIsOpen(false);
  }, [setStepName]);

  useEffect(() => {
    return () => {
      handleClose();
    };
  }, [handleClose]);

  return (
    <div>
      <Button onClick={onClick}>
        <Plus /> Add Meta Field
      </Button>
      <CustomFieldDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Meta Field"
      >
        <Stepper />
      </CustomFieldDialog>
    </div>
  );
}

export default React.memo(AddCustomFields);
