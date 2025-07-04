"use client";

import CustomFieldDialog from "./Common/CustomFieldDialog";
import React, { useContext, useEffect, useState, useCallback } from "react";
import Stepper from "./Stepper";
import { CustomFieldsContext } from "../Context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="h-full">
      <Card
        className="hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer mr-4 h-full"
        onClick={onClick}
      >
        <CardHeader>
          <CardTitle>Add Meta Fields</CardTitle>
        </CardHeader>
        <CardContent>Update the meta fields for your organization</CardContent>
      </Card>
      <CustomFieldDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Global Fields"
      >
        <Stepper />
      </CustomFieldDialog>
    </div>
  );
}

export default React.memo(AddCustomFields);
