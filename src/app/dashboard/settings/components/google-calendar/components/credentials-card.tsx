import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { CredentialsFormData } from "../types";

interface CredentialsCardProps {
  formData: CredentialsFormData;
  setFormData: (data: CredentialsFormData) => void;
  onSave: () => void;
  isUpdating: boolean;
  isConnected?: boolean;
}

export function CredentialsCard({
  formData,
  setFormData,
  onSave,
  isUpdating,
  isConnected,
}: CredentialsCardProps) {
  const [showClientSecret, setShowClientSecret] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">OAuth2 Credentials</CardTitle>
        <CardDescription>
          Enter your Google OAuth2 credentials from Google Cloud Console
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            value={formData.clientId}
            onChange={(e) =>
              setFormData({ ...formData, clientId: e.target.value })
            }
            placeholder="Enter Google OAuth2 Client ID"
            disabled={isConnected}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientSecret">Client Secret</Label>
          <div className="flex items-center gap-2">
            <Input
              id="clientSecret"
              type={showClientSecret ? "text" : "password"}
              value={formData.clientSecret}
              onChange={(e) =>
                setFormData({ ...formData, clientSecret: e.target.value })
              }
              placeholder="Enter Google OAuth2 Client Secret"
              disabled={isConnected}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowClientSecret(!showClientSecret)}
              disabled={isConnected}
            >
              {showClientSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {!isConnected && (
          <Button
            onClick={onSave}
            variant="default"
            disabled={
              !formData.clientId || !formData.clientSecret || isUpdating
            }
            className="w-full"
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Credentials
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
