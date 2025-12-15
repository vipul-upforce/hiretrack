/**
 * Candidate Card Info Component
 * Displays key information: experience, location, CTC, notice period, contact, email
 */

import {
  Clock, MapPin, Calendar, Phone, Mail, Copy,
} from 'lucide-react';
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
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5 text-sm">
      <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
            Experience
          </span>
          <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
            {candidate.experience}
            {' '}
            years
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
            Location
          </span>
          <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
            {candidate.location}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
        <span className="h-4 w-4 flex-shrink-0 text-sm font-semibold">₹</span>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
            Expected CTC
          </span>
          <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
            {candidate.expectedCTC}
            {' '}
            LPA
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
        <Calendar className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
            Notice Period
          </span>
          <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
            {candidate.noticePeriod ? `${candidate.noticePeriod} days` : '-'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
        <span className="h-4 w-4 flex-shrink-0 text-sm font-semibold opacity-60">
          ₹
        </span>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
            Current CTC
          </span>
          <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
            {candidate.currentCTC ? `${candidate.currentCTC} LPA` : '-'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
        <Phone className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
            Contact
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-900 dark:text-gray-100 font-semibold truncate flex-1 min-w-0">
              {candidate.contact || 'N/A'}
            </span>
            {candidate.contact && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(candidate.contact, 'Contact number');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
      {candidate.email && (
        <div className="col-span-2 flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
          <Mail className="h-4 w-4 flex-shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
              Email
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-gray-900 dark:text-gray-100 font-semibold flex-1 min-w-0">
                {candidate.email}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(candidate.email, 'Email');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
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
