/**
 * Candidate Card Info Component
 * Displays key information: experience, location, CTC, notice period, contact, email
 */

import { Clock, MapPin, Calendar, Phone, Mail, Copy } from 'lucide-react';
import { Candidate } from '@/types/candidate';

interface CandidateCardInfoProps {
  candidate: Candidate;
  onCopy: (text: string, label: string) => void;
}

export function CandidateCardInfo({
  candidate,
  onCopy,
}: CandidateCardInfoProps) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <div className="flex min-w-0 items-center gap-2.5 text-gray-600 dark:text-gray-400">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
            Experience
          </span>
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
            {candidate.experience} years
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2.5 text-gray-600 dark:text-gray-400">
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
            Location
          </span>
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
            {candidate.location}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2.5 text-gray-600 dark:text-gray-400">
        <span className="h-4 w-4 flex-shrink-0 text-sm font-semibold">₹</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
            Expected CTC
          </span>
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
            {candidate.expectedCTC} LPA
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2.5 text-gray-600 dark:text-gray-400">
        <Calendar className="h-4 w-4 flex-shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
            Notice Period
          </span>
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
            {candidate.noticePeriod ? `${candidate.noticePeriod} days` : '-'}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2.5 text-gray-600 dark:text-gray-400">
        <span className="h-4 w-4 flex-shrink-0 text-sm font-semibold opacity-60">
          ₹
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
            Current CTC
          </span>
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
            {candidate.currentCTC ? `${candidate.currentCTC} LPA` : '-'}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2.5 text-gray-600 dark:text-gray-400">
        <Phone className="h-4 w-4 flex-shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
            Contact
          </span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-semibold text-gray-900 dark:text-gray-100">
              {candidate.contact || 'N/A'}
            </span>
            {candidate.contact && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(candidate.contact, 'Contact number');
                }}
                className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
      {candidate.email && (
        <div className="col-span-2 flex min-w-0 items-center gap-2.5 text-gray-600 dark:text-gray-400">
          <Mail className="h-4 w-4 flex-shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
              Email
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                {candidate.email}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(candidate.email, 'Email');
                }}
                className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
