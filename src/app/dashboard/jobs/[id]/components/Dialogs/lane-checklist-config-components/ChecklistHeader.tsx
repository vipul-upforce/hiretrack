import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ChecklistHeaderProps {
  // onSaveAsTemplate: () => void;
  onRemoveChecklist: () => void;
}

export function ChecklistHeader({
  // onSaveAsTemplate,
  onRemoveChecklist,
}: ChecklistHeaderProps) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">Checklist Configuration</CardTitle>
        <div className="flex items-center space-x-2">
          {/* <Button variant="outline" size="sm" onClick={onSaveAsTemplate}>
            <Save className="mr-2 h-4 w-4" />
            Save as Template
          </Button> */}
          <Button variant="outline" size="sm" onClick={onRemoveChecklist}>
            <X className="mr-2 h-4 w-4" />
            Remove Checklist
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}
