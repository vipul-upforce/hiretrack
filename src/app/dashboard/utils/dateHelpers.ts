import { Candidate } from '@/types/candidate';

/**
 * Check if an assignment is scheduled for today
 */
export const isToday = (assignment: Candidate): boolean => {
  const assignmentDate = new Date(
    assignment.assignment?.time || assignment.interviewDate || '',
  );
  const today = new Date();
  return (
    assignmentDate.getDate() === today.getDate() &&
    assignmentDate.getMonth() === today.getMonth() &&
    assignmentDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if an assignment is scheduled for this week
 */
export const isThisWeek = (assignment: Candidate): boolean => {
  const assignmentDate = new Date(
    assignment.assignment?.time || assignment.interviewDate || '',
  );
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return assignmentDate >= startOfWeek && assignmentDate <= endOfWeek;
};

