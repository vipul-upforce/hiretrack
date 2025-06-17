"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface EditLaneDialogProps {
  isEditLaneDialogOpen: boolean;
  setIsEditLaneDialogOpen: (open: boolean) => void;
  editingLane: string | null;
  prevLane: string | null;
  setEditingLane: (lane: string) => void;
  handleLaneUpdate: (prevId: string, name: string) => void;
  isLoading: boolean;
}

const EditLaneDialog = ({
  isEditLaneDialogOpen,
  setIsEditLaneDialogOpen,
  editingLane,
  prevLane,
  setEditingLane,
  handleLaneUpdate,
  isLoading,
}: EditLaneDialogProps) => {
  // //   const [prevLaneId, setPrevLaneId] = useState("");
  // const prevLaneId = editingLane
  //   //   editingLane &&
  // //   useEffect(() => {
  // //     setPrevLaneId(editingLane || "");
  // //   }, []);
  return (
    <Dialog open={isEditLaneDialogOpen} onOpenChange={setIsEditLaneDialogOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Lane</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lane-name">Lane Name</Label>
            <Input
              id="lane-name"
              placeholder="Enter lane name..."
              value={editingLane || ""}
              onChange={(e) => {
                const newValue = e.target.value;
                const regex = /^[a-z0-9\s]*$/;
                // console.log("@Changed the value: ", newValue);
                if (regex.test(newValue)) {
                  setEditingLane(newValue);
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsEditLaneDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!editingLane?.trim()}
            onClick={() => {
              if (
                prevLane &&
                prevLane.length > 0 &&
                editingLane &&
                editingLane.length > 0
              ) {
                handleLaneUpdate(prevLane, editingLane);
              } else {
                toast({
                  title: "Error",
                  description: "Something is missing...",
                  variant: "destructive",
                });
              }
              setIsEditLaneDialogOpen(false);
            }}
          >
            {isLoading ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditLaneDialog;
