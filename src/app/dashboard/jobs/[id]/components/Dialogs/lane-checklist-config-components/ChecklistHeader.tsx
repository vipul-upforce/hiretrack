import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface ChecklistHeaderProps {
  onSaveAsTemplate: () => void;
  onRemoveChecklist: () => void;
}

export const ChecklistHeader: React.FC<ChecklistHeaderProps> = ({
  onSaveAsTemplate,
  onRemoveChecklist,
}) => {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">Checklist Configuration</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onSaveAsTemplate}>
            <Save className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
          <Button variant="outline" size="sm" onClick={onRemoveChecklist}>
            <X className="h-4 w-4 mr-2" />
            Remove Checklist
          </Button>
        </div>
      </div>
    </CardHeader>
  );
};

