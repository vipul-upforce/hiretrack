import { useState, useMemo } from 'react';
import { CandidateAssignment } from '../types';

export function useCalendarFilters() {
  const [searchText, setSearchText] = useState('');
  const [filterText, setFilterText] = useState('');

  const applyFilter = () => {
    setFilterText(searchText.trim());
  };

  const filterAssignments = useMemo(
    () =>
      (
        assignments: CandidateAssignment[],
        role: string,
        userId: string | undefined,
      ): CandidateAssignment[] =>
        assignments.filter((assignment: CandidateAssignment) => {
          if (role === 'interviewer') {
            const interviewerId =
              typeof assignment?.assignment?.interviewerId === 'object'
                ? assignment?.assignment?.interviewerId?._id
                : assignment?.assignment?.interviewerId;
            if (
              !assignment?.assignment ||
              interviewerId !== userId ||
              !interviewerId
            ) {
              return false;
            }
          }

          if (!filterText) return true;
          const searchRegex = new RegExp(filterText, 'i');

          const jobSkills =
            (typeof assignment.jobId === 'object' &&
              assignment.jobId?.skills) ||
            [];
          const assignmentSkills = assignment.skills || [];
          const assignmentJobSkills =
            (typeof assignment.assignment?.jobId !== 'string' &&
              assignment.assignment?.jobId?.skills) ||
            [];
          const allSkills = [
            ...jobSkills,
            ...assignmentSkills,
            ...assignmentJobSkills,
          ];

          return (
            searchRegex.test(assignment.name || '') ||
            searchRegex.test(
              assignment.jobId && typeof assignment.jobId === 'object'
                ? assignment.jobId.title
                : '',
            ) ||
            searchRegex.test(
              (typeof assignment?.assignment?.interviewerId === 'object' &&
                assignment?.assignment?.interviewerId?.name) ||
                '',
            ) ||
            (allSkills.length > 0 &&
              allSkills.some((skill) => searchRegex.test(skill || '')))
          );
        }),
    [filterText],
  );

  return {
    searchText,
    setSearchText,
    filterText,
    applyFilter,
    filterAssignments,
  };
}
