import { ProfessionalLoader } from "@/components/ui/professional-loader";

const LoaderSkeleton = () => (
  <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
    <ProfessionalLoader size="lg" text="Loading..." />
  </div>
);

export default LoaderSkeleton;
