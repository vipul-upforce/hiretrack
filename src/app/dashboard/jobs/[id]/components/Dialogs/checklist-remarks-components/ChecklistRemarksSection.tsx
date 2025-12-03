import { Label } from "@/components/ui/label";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { Rating } from "@mui/material";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";
import { ILocalUser } from "@/lib/redux/authSlice";

interface ChecklistRemarksSectionProps {
  newRemark: string;
  setNewRemark: (remark: string) => void;
  remarkRating: number | null;
  setRemarkRating: (rating: number | null) => void;
  setRemarkRatingHistory: (rating: number | null) => void;
  isSubRemarkPrivate: boolean;
  setIsSubRemarkPrivate: (isPrivate: boolean) => void;
  handleSubmit: () => void;
  isSubmitting: boolean;
  user: ILocalUser | null;
}

export function ChecklistRemarksSection({
  newRemark,
  setNewRemark,
  remarkRating,
  setRemarkRating,
  setRemarkRatingHistory,
  isSubRemarkPrivate,
  setIsSubRemarkPrivate,
  handleSubmit,
  isSubmitting,
  user,
}: ChecklistRemarksSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Remarks (Optional)</h3>
      <MentionTextarea
        placeholder="Add a remark... (Alt+Enter to submit)"
        className="min-h-[100px] max-h-80 overflow-y-auto"
        value={newRemark}
        onChange={setNewRemark}
        onKeyDown={(e) => {
          if (e.altKey && e.key === "Enter") {
            e.preventDefault();
            if (!isSubmitting && user?.id) {
              handleSubmit();
            }
          }
        }}
        organizationId={String(user?.organizationId) || ""}
        currentUserRole={user?.role || ""}
        rows={4}
      />
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <Label htmlFor="rating">Rating:</Label>
          <Rating
            name="half-rating"
            onChange={(e, value) => {
              setRemarkRating(value);
              setRemarkRatingHistory(value);
            }}
            value={remarkRating}
            precision={0.5}
            sx={{
              "& .MuiRating-iconEmpty": {
                color: "rgba(255, 255, 255, 0.3)",
              },
              "& .MuiRating-iconFilled": {
                color: "#fbbf24",
              },
              "& .MuiRating-iconHover": {
                color: "#f59e0b",
              },
            }}
          />
        </div>
        <div className="flex flex-row items-center justify-evenly">
          <div className="flex items-center space-x-2">
            {isSubRemarkPrivate ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
            <Label htmlFor="privacy-toggle" className="text-sm">
              {isSubRemarkPrivate ? "Private" : "Public"}
            </Label>
          </div>
          <Switch
            id="privacy-toggle-submit"
            checked={isSubRemarkPrivate}
            onCheckedChange={() => setIsSubRemarkPrivate(!isSubRemarkPrivate)}
            className="w-8 h-4 drop-shadow-lg border border-1 border-solid ml-2"
          />
        </div>
      </div>
    </div>
  );
}
