import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CustomFieldsContext } from "../../Context";
import React, { useCallback, useContext, useState } from "react";
import Breadcrumbs from "../Breadcrums";
import CustomFieldForm from "../Form/CustomFieldForm";
import CustomFieldList from "./CustomFieldList";
function FormCustomFieldList() {
  const { selectedFormId, setStepName } = useContext(CustomFieldsContext);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const breadcrumbs = [
    <div key="custom-fields" onClick={() => setStepName("FormList")}>
      Global Meta Fields
    </div>,
    <div key={selectedFormId?.formName}>{selectedFormId?.formName}</div>,
  ];

  return (
    <div>
      <div className="flex justify-between">
        <Breadcrumbs breadcrumbs={breadcrumbs} />
        <Button onClick={handleOpen}>
          <Plus />
        </Button>
      </div>
      {/* <Separator className="my-4" /> */}
      <CustomFieldForm
        isOpen={isOpen}
        handleClose={handleClose}
        existingFields={selectedFormId?.fields}
      />
      <CustomFieldList />
    </div>
  );
}

export default React.memo(FormCustomFieldList);
