/**
 * Tabs Navigation Component for Candidate Details Dialog
 * Manages tab state and renders tab content
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserIcon, MessageSquare, Clock } from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { Dispatch, SetStateAction } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { CandidateOverviewTab } from './CandidateOverviewTab';
import { CandidateHistoryTab } from './CandidateHistoryTab';
import { CandidateLogsTab } from './CandidateLogsTab';
import { IEditRemark } from '../../../schemas/EditRemarkDialog';

interface CandidateDetailsTabsProps {
  candidate: Candidate;
  activeTab: string;
  onTabChange: (tab: string) => void;
  // Overview tab props
  onEditFollowUp: () => void;
  onRemoveFollowUp: () => void;
  isReEvaluating: boolean;
  isEvaluatingFor: string | null;
  onReEvaluate: () => void;
  // History tab props
  isHistoryLoading: boolean;
  isRemarkSubmitting: boolean;
  isFollowUpSubmitting: boolean;
  validTimeLineItems: ICandidateHistory[];
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean,
    rating?: number,
  ) => void;
  setEditingRemark: Dispatch<SetStateAction<IEditRemark | null>>;
  setIsEditRemarkDialogOpen: Dispatch<SetStateAction<boolean>>;
  historyLoaded: boolean;
}

/**
 * Main Tabs Component
 */
export function CandidateDetailsTabs({
  candidate,
  activeTab,
  onTabChange,
  onEditFollowUp,
  onRemoveFollowUp,
  isReEvaluating,
  isEvaluatingFor,
  onReEvaluate,
  isHistoryLoading,
  isRemarkSubmitting,
  isFollowUpSubmitting,
  validTimeLineItems,
  handleRemarkUpdate,
  setEditingRemark,
  setIsEditRemarkDialogOpen,
  historyLoaded,
}: CandidateDetailsTabsProps) {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="px-3 pt-2">
        <TabsList
          className={`grid w-full ${user?.role === 'interviewer' ? 'grid-cols-2' : 'grid-cols-3'
            } h-9 items-center justify-center bg-transparent p-0 text-muted-foreground`}
        >
          <TabsTrigger
            value="overview"
            className="flex items-center justify-center gap-1.5 rounded-none border-b-2 border-transparent px-2 py-1 text-xs font-medium ring-offset-background transition-all hover:text-foreground focus-visible:outline-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <UserIcon className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="flex items-center justify-center gap-1.5 rounded-none border-b-2 border-transparent px-2 py-1 text-xs font-medium ring-offset-background transition-all hover:text-foreground focus-visible:outline-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            History
          </TabsTrigger>

          {user?.role !== 'candidate' && (
            <TabsTrigger
              value="logs"
              className={`flex items-center justify-center gap-1.5 rounded-none border-b-2 border-transparent px-2 py-1 text-xs font-medium ring-offset-background transition-all hover:text-foreground focus-visible:outline-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none ${user?.role === 'interviewer' ? 'hidden' : ''
                }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Logs
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-3 lg:px-6 lg:py-2 pb-10 border-t-2 mb-4">
        <TabsContent value="overview" className="mt-0 h-full focus-visible:outline-none">
          <CandidateOverviewTab
            candidate={candidate}
            onEditFollowUp={onEditFollowUp}
            onRemoveFollowUp={onRemoveFollowUp}
            isReEvaluating={isReEvaluating}
            isEvaluatingFor={isEvaluatingFor}
            onReEvaluate={onReEvaluate}
            isFollowUpSubmitting={isFollowUpSubmitting}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-0 h-full focus-visible:outline-none">
          <CandidateHistoryTab
            candidate={candidate}
            isHistoryLoading={isHistoryLoading}
            isRemarkSubmitting={isRemarkSubmitting}
            validTimeLineItems={validTimeLineItems}
            handleRemarkUpdate={handleRemarkUpdate}
            setEditingRemark={setEditingRemark}
            setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
            historyLoaded={historyLoaded}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-0 h-full focus-visible:outline-none">
          <CandidateLogsTab
            candidate={candidate}
            isHistoryLoading={isHistoryLoading}
            historyLoaded={historyLoaded}
            validTimeLineItems={validTimeLineItems}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}