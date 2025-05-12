import { toast } from "@/hooks/use-toast";

export default function handleCandidateInfoCopy(email: string) {
  // e.preventDefault();
  navigator.clipboard
    .writeText(email)
    .then(() => {
      toast({
        title: "Success",
        description: "Candidate Email is copied to your clipboard",
        variant: "default",
      });
    })
    .catch((err) => {
      toast({
        title: "Error",
        description: err.message || "Failed to copy the candidate email.",
        variant: "destructive",
      });
    });
}
