import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IChecklistTemplate } from "@/lib/models/ChecklistTemplate";
import { IChecklist } from "@/lib/models/JobLaneConfig";

interface TemplateSelectorProps {
  filteredTemplates: IChecklistTemplate[];
  onLoadFromTemplate: (templateId: string) => void;
  currentChecklist?: IChecklist;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  filteredTemplates,
  onLoadFromTemplate,
  currentChecklist,
}) => {
  if (filteredTemplates.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Load from Template</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Select onValueChange={onLoadFromTemplate}>
            <SelectTrigger>
              <SelectValue placeholder={currentChecklist ? currentChecklist.name : "No template selected"} />
            </SelectTrigger>
            <SelectContent>
              {filteredTemplates.map((template) => (
                <SelectItem
                  key={template._id.toString()}
                  value={template._id.toString()}
                >
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

