"use client";

import CustomFieldDialog from "./Common/CustomFieldDialog";
import React, { useContext, useEffect, useState, useCallback } from "react";
import Stepper from "./Stepper";
import { CustomFieldsContext } from "../Context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

function AddCustomFields() {
  const { setStepName } = useContext(CustomFieldsContext);
  const [isOpen, setIsOpen] = useState(false);
  const onClick = () => {
    setTimeout(() => {
      setIsOpen(true);
    }, 200);
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
    <div className="group">
      <Card
        className="h-full transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg bg-white dark:bg-black"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <FolderOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
                Personalized form fields
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Configure global metadata fields for your organization
          </p>
        </CardContent>
      </Card>

      <CustomFieldDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Personalized form fields"
      >
        <Stepper />
      </CustomFieldDialog>
    </div>
  );
}

export default React.memo(AddCustomFields);
