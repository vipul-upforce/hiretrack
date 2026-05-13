import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { CVBatchProcessor } from './components/cv-batch-processor';

export default function Home() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header section with improved design */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            {/* Title */}
            <CardTitle className="line-clamp-2 text-xl font-bold md:mr-2">
              CV Upload
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
        <CVBatchProcessor />
      </div>
    </div>
  );
}
