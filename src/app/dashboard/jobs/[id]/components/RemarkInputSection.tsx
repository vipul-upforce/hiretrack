import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";
import Rating from "@mui/material/Rating";

import { User } from "@/lib/features/users/usersApi";

interface RemarkInputSectionProps {
  newRemark: string;
  setNewRemark: (value: string) => void;
  remarkRating: number | null;
  setRemarkRating: (value: number | null) => void;
  setRemarkRatingHistory: (value: number | null) => void;
  isSubRemarkPrivate: boolean;
  setIsSubRemarkPrivate: (value: boolean) => void;
  user: User | null;
  handleAddRemark: () => void;
}

export default function RemarkInputSection({
  newRemark,
  setNewRemark,
  remarkRating,
  setRemarkRating,
  setRemarkRatingHistory,
  isSubRemarkPrivate,
  setIsSubRemarkPrivate,
  user,
  handleAddRemark,
}: RemarkInputSectionProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-4">
        <Textarea
          placeholder="Add a remark..."
          value={newRemark}
          onChange={(e) => setNewRemark(e.target.value)}
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="rating">Rating:</Label>
            <Rating
              name="half-rating"
              value={remarkRating}
              onChange={(e, value) => {
                setRemarkRating(value ? value : null);
                setRemarkRatingHistory(value ? value : null);
              }}
              defaultValue={0}
              precision={0.5}
            />
          </div>
          <div className="flex flex-row items-center justify-evenly">
            <div className="flex items-center justify-between px-2 py-2">
              {(user?.role === "admin" || user?.role === "hr") && (
                <>
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
                    onCheckedChange={() =>
                      setIsSubRemarkPrivate(!isSubRemarkPrivate)
                    }
                    className="w-8 h-4 drop-shadow-lg border border-1 border-solid ml-2"
                  />
                </>
              )}
            </div>
            <Button onClick={handleAddRemark}>Add Remark</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
