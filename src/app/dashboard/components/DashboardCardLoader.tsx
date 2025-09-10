import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card"; // Assuming Card components are imported
import { cn } from "@/lib/utils";

const DashboardCardLoader = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className={cn(
                "bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg  shadow-sm cursor-pointer hay-700 "
            )}>
                <Skeleton className="w-full h-[200px] rounded-lg" />
                {/* <CardHeader>
                    
                </CardHeader>
                <CardContent>
                    <div className="flex justify-start">
                        <Skeleton className="w-1/3 h-[36px] rounded-lg" />
                    </div>
                </CardContent> */}
            </Card>
        ))}
    </div>
);

export default DashboardCardLoader;