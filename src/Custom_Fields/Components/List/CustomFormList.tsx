// import { Button } from "@/components/ui/button";
import AddFormID from "../Form/AddFormID";
import { CustomFieldsContext } from "../../Context";
import React, { useContext, useState } from "react";
import FormIDCard from "../Form/FormCard";
// import { Separator } from "@/components/ui/separator";
function CustomFieldFormList() {
  const { customFields } = useContext(CustomFieldsContext);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      {/* <div className="flex justify-end"> */}
      {/* <Button
          onClick={() => {
            setIsOpen(true);
          }}
        >
          Add Form
        </Button> */}
      {/* </div> */}

      {/* <Separator className="my-4" /> */}
      <AddFormID isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex flex-col py-4 gap-4">
        {Object.entries(customFields).map(([formId, form]) => (
          <FormIDCard
            key={formId}
            formId={formId}
            formName={form.formName}
            fields={form.fields}
          />
        ))}
      </div>
    </div>
  );
}

export default React.memo(CustomFieldFormList);
