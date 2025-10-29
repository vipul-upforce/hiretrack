import { ProfessionalLoader } from "@/components/ui/professional-loader";

const DashboardCardLoader = () => (
    <div className="flex items-center justify-center h-[200px]">
        <ProfessionalLoader size="lg" text="Loading..." />
    </div>
);

export default DashboardCardLoader;