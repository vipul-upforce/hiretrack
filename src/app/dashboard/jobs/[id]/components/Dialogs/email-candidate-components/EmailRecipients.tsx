import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChipInput } from "@/components/ui/chip-input";

interface EmailRecipientsProps {
  cc: string[];
  setCc: (cc: string[]) => void;
  bcc: string[];
  setBcc: (bcc: string[]) => void;
  replyTo: string;
  setReplyTo: (replyTo: string) => void;
  userEmail: string;
}

export const EmailRecipients: React.FC<EmailRecipientsProps> = ({
  cc,
  setCc,
  bcc,
  setBcc,
  replyTo,
  setReplyTo,
  userEmail,
}) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="cc">CC</Label>
        <ChipInput
          value={cc}
          onChange={setCc}
          placeholder="Add email addresses"
          suggestions={[]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bcc">BCC</Label>
        <ChipInput
          value={bcc}
          onChange={setBcc}
          placeholder="Add email addresses"
          suggestions={[]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="replyTo">Reply To</Label>
        <Input
          id="replyTo"
          type="email"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder={userEmail || "Your email address"}
        />
      </div>
    </>
  );
};

