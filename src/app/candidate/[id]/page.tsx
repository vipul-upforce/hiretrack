"use client";

import { CandidateDetailsDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog";
import { toast } from "@/hooks/use-toast";
import useRoles from "@/hooks/useRoles";
import { Candidate } from "@/types/candidate";
import { redirect, useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CandidateDetailsPage() {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  //   const [isOpen, setIsOpen] = useState(true);
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const role = useRoles();

  useEffect(() => {
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
    if (!id) return;

    async function fetchCandidate() {
      setLoading(true);
      try {
        const res = await fetch(`/api/candidates/${id}`);
        if (res.status === 401) {
          router.push(`/auth/login?redirect=${pathname}`);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setCandidate(data);
          const jobId = data.jobId._id;
          if (role === "admin" || role === "hr") {
            router.push(`/dashboard/jobs/${jobId}?candidateId=${id}`);
          }
        } else {
          throw new Error(res.statusText || "Candidate fetch failed");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load the candidate.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchCandidate();
  }, [params?.id, pathname, router]);

  if (loading) return <div>Loading candidate details...</div>;
  if (!candidate) return <div>Candidate not found.</div>;

  return (
    <div className=" w-screen h-[100dvh]">
      <CandidateDetailsDialog
        candidate={candidate}
        isOpen={true}
        onOpenChange={() => {
          redirect(`/dashboard/jobs/${candidate?.jobId?._id}`);
        }}
        // onUpdate={() => {}}
        onUpdate={() => {
          window.location.reload();
        }}
        hideCloseButtons={true}
        // hideEditButton={false}
      />
      {/* <button onClick={() => setIsOpen(true)}>Open dialog</button> */}
    </div>
  );
}
