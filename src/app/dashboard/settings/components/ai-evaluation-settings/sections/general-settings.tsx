import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { SectionProps } from "../types";

export const GeneralSettingsSection: React.FC<SectionProps> = ({
  config,
  updateConfig,
}) => {
  return (
    <div className="space-y-6">
      {/* Temperature Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="temperature">
            Temperature: {config.temperature.toFixed(2)}
          </Label>
          <span className="text-xs text-muted-foreground">
            {config.temperature === 0
              ? "Fully Deterministic"
              : config.temperature <= 0.3
                ? "High Consistency"
                : "More Creative"}
          </span>
        </div>
        <Slider
          id="temperature"
          min={0}
          max={1}
          step={0.05}
          value={[config.temperature]}
          onValueChange={([value]) => updateConfig("temperature", value)}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Lower values (0-0.2) give consistent, deterministic scores.
          Recommended: 0.1 for 95% consistency.
        </p>
      </div>

      {/* Auto Evaluate Toggle */}
      <div className="flex items-center justify-between space-x-2 border-t pt-4">
        <div className="space-y-0.5">
          <Label htmlFor="autoEval">Evaluate All PDF Resumes Pages</Label>
          <p className="text-sm text-muted-foreground">
            Ignore page limits and evaluate all PDF resumes automatically
          </p>
        </div>
        <Switch
          id="autoEval"
          checked={config.autoEvaluateAllCandidates}
          onCheckedChange={(val) =>
            updateConfig("autoEvaluateAllCandidates", val)
          }
        />
      </div>

      {/* Max PDF Pages */}
      {!config.autoEvaluateAllCandidates && (
        <div className="space-y-2">
          <Label htmlFor="maxPages">Max PDF Pages for Auto-Evaluation</Label>
          <Input
            id="maxPages"
            type="number"
            min={0}
            value={config.maxPdfPages}
            onChange={(e) =>
              updateConfig("maxPdfPages", parseInt(e.target.value) || 0)
            }
          />
          <p className="text-xs text-muted-foreground">
            Only PDFs with this many pages or fewer will be auto-evaluated. Set
            to 0 for no limit.
          </p>
        </div>
      )}
    </div>
  );
};
