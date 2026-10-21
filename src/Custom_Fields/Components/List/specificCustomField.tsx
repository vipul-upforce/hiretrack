import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import React, { useCallback, useContext, useState } from 'react';
import { CustomFieldsContext } from '../../Context';
import Breadcrumbs from '../Breadcrums';
import CustomFieldForm from '../Form/CustomFieldForm';
import CustomFieldList from './CustomFieldList';

function FormSpecificCustomFieldList() {
  const { selectedFormId, setStepName } = useContext(CustomFieldsContext);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const breadcrumbs = [
    <div
      key="custom-fields"
      onClick={() => setStepName('FormList')}
      role="button"
      tabIndex={0}
      className="cursor-pointer"
    >
      Personalized Form Fields
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
      <Separator className="mt-4" />
      <CustomFieldForm isOpen={isOpen} handleClose={handleClose} />
      <CustomFieldList />
    </div>
  );
}

export default React.memo(FormSpecificCustomFieldList);
