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
  candidateHistory: ICandidateHistory[] | undefined;
  isHistoryLoading: boolean;
  isRemarkSubmitting: boolean;
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
  candidateHistory,
  isHistoryLoading,
  isRemarkSubmitting,
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
      className="flex h-full flex-col"
    >
      <TabsList
        className={`grid w-full ${
          user?.role === 'interviewer' ? 'grid-cols-2' : 'grid-cols-3'
        } h-12 rounded-none border-b border-gray-200 bg-transparent dark:border-gray-700`}
      >
        <TabsTrigger
          value="overview"
          className="flex h-full items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:border-blue-400 dark:data-[state=active]:text-blue-400"
        >
          <UserIcon className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="flex h-full items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:border-blue-400 dark:data-[state=active]:text-blue-400"
        >
          <MessageSquare className="h-4 w-4" />
          History
        </TabsTrigger>
        {user?.role !== 'candidate' && (
          <TabsTrigger
            value="logs"
            className={`flex h-full items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:border-blue-400 dark:data-[state=active]:text-blue-400 ${user?.role === 'interviewer' ? 'hidden' : ''}`}
          >
            <Clock className="h-4 w-4" />
            Logs
          </TabsTrigger>
        )}
      </TabsList>

      <div className="flex-1 overflow-y-auto px-4 py-3 lg:px-6 lg:py-4">
        <TabsContent value="overview" className="mt-0 space-y-6">
          <CandidateOverviewTab
            candidate={candidate}
            onEditFollowUp={onEditFollowUp}
            onRemoveFollowUp={onRemoveFollowUp}
            isReEvaluating={isReEvaluating}
            isEvaluatingFor={isEvaluatingFor}
            onReEvaluate={onReEvaluate}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-0 space-y-6">
          <CandidateHistoryTab
            candidate={candidate}
            candidateHistory={candidateHistory}
            isHistoryLoading={isHistoryLoading}
            isRemarkSubmitting={isRemarkSubmitting}
            validTimeLineItems={validTimeLineItems}
            handleRemarkUpdate={handleRemarkUpdate}
            setEditingRemark={setEditingRemark}
            setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
            historyLoaded={historyLoaded}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-0 space-y-6">
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
