/**
 * Tabs Navigation Component for Candidate Details Dialog
 * Manages tab state and renders tab content
 */

import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { UserIcon, MessageSquare, Clock } from 'lucide-react';
import { User } from '@/lib/features/users/usersApi';
import { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { Dispatch, SetStateAction } from 'react';
import { CandidateOverviewTab } from './CandidateOverviewTab';
import { CandidateHistoryTab } from './CandidateHistoryTab';
import { CandidateLogsTab } from './CandidateLogsTab';
import { IEditRemark } from '../../../schemas/EditRemarkDialog';

interface CandidateDetailsTabsProps {
  candidate: Candidate;
  user: User | null;
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
  handleRemarkUpdate: (id: string, description: string, isPrivate?: boolean, rating?: number) => void;
  setEditingRemark: Dispatch<SetStateAction<IEditRemark>>;
  setIsEditRemarkDialogOpen: (open: boolean) => void;
  historyLoaded: boolean;
}

/**
 * Main Tabs Component
 */
export function CandidateDetailsTabs({
  candidate,
  user,
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
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full">
      <TabsList
        className={`grid w-full ${
          user?.role === 'interviewer' ? 'grid-cols-2' : 'grid-cols-3'
        } bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-12`}
      >
        <TabsTrigger
          value="overview"
          className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none h-full"
        >
          <UserIcon className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none h-full"
        >
          <MessageSquare className="h-4 w-4" />
          History
        </TabsTrigger>
        {user?.role !== 'candidate' && (
          <TabsTrigger
            value="logs"
            className={`flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none h-full ${user?.role === 'interviewer' ? 'hidden' : ''}`}
          >
            <Clock className="h-4 w-4" />
            Logs
          </TabsTrigger>
        )}
      </TabsList>

      <div className="flex-1 overflow-y-auto px-4 py-3 lg:px-6 lg:py-4">
        <TabsContent value="overview" className="space-y-6 mt-0">
          <CandidateOverviewTab
            candidate={candidate}
            user={user}
            onEditFollowUp={onEditFollowUp}
            onRemoveFollowUp={onRemoveFollowUp}
            isReEvaluating={isReEvaluating}
            isEvaluatingFor={isEvaluatingFor}
            onReEvaluate={onReEvaluate}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-0">
          <CandidateHistoryTab
            candidate={candidate}
            user={user}
            candidateHistory={candidateHistory}
            isHistoryLoading={isHistoryLoading}
            isRemarkSubmitting={isRemarkSubmitting}
            validTimeLineItems={validTimeLineItems}
            handleRemarkUpdate={handleRemarkUpdate}
            setEditingRemark={setEditingRemark}
            setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6 mt-0">
          <CandidateLogsTab
            candidate={candidate}
            user={user}
            isHistoryLoading={isHistoryLoading}
            historyLoaded={historyLoaded}
            validTimeLineItems={validTimeLineItems}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
