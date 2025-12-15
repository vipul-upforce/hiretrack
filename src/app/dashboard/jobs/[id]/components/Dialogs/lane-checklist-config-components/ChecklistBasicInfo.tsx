import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { IChecklist } from '@/lib/models/JobLaneConfig';

interface ChecklistBasicInfoProps {
  checklist: IChecklist;
  onChange: (updates: Partial<IChecklist>) => void;
}

export const ChecklistBasicInfo: React.FC<ChecklistBasicInfoProps> = ({
  checklist,
  onChange,
}) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <Label htmlFor="checklist-name">Checklist Name</Label>
      <Input
        id="checklist-name"
        value={checklist.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Enter checklist name..."
      />
    </div>
    <div className="flex items-center space-x-2 mt-6">
      <Switch
        id="mandatory"
        checked={checklist.isMandatory}
        onCheckedChange={(checked) => onChange({ isMandatory: checked })}
      />
      <Label htmlFor="mandatory">Mandatory</Label>
    </div>
  </div>
);
