import React, { Fragment } from 'react';
import type { Resume } from '@/lib/redux/types';
import {
  initialEducation,
  initialWorkExperience,
} from '@/lib/redux/resumeSlice';
import { deepClone } from '@/lib/deep-clone';
import { cx } from '@/lib/cx';

function TableRowHeader({ children }: { children: React.ReactNode }) {
  return (
    <tr className="divide-x bg-gray-100">
      <th className="px-3 py-2 font-semibold" scope="colgroup" colSpan={2}>
        {children}
      </th>
    </tr>
  );
}

function TableRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string | string[];
  className?: string | false;
}) {
  return (
    <tr className={cx('divide-x', className)}>
      <th className="px-3 py-2 font-medium" scope="row">
        {label}
      </th>
      <td className="w-full px-3 py-2">
        {typeof value === 'string'
          ? value
          : value.map((x, idx) => (
              /* eslint-disable-next-line react/no-array-index-key */
              <Fragment key={idx}>
                • {x}
                <br />
              </Fragment>
            ))}
      </td>
    </tr>
  );
}

export function ResumeTable({ resume }: { resume: Resume }) {
  const educations =
    resume.educations.length === 0
      ? [deepClone(initialEducation)]
      : resume.educations;
  const workExperiences =
    resume.workExperiences.length === 0
      ? [deepClone(initialWorkExperience)]
      : resume.workExperiences;
  const skills = [...resume.skills.descriptions];
  const featuredSkills = resume.skills.featuredSkills
    .filter((item) => item.skill.trim())
    .map((item) => item.skill)
    .join(', ')
    .trim();
  if (featuredSkills) {
    skills.unshift(featuredSkills);
  }
  return (
    <table className="mt-2 w-full border text-sm text-gray-900">
      <tbody className="divide-y text-left align-top">
        <TableRowHeader>Profile</TableRowHeader>
        <TableRow label="Name" value={resume.profile.name} />
        <TableRow label="Email" value={resume.profile.email} />
        <TableRow label="Phone" value={resume.profile.contact} />
        <TableRow label="Location" value={resume.profile.location} />
        <TableRow label="Link" value={resume.profile.url} />
        <TableRow label="Summary" value={resume.profile.summary} />
        <TableRowHeader>Education</TableRowHeader>
        {educations.map((education, idx) => (
          /* eslint-disable-next-line react/no-array-index-key */
          <Fragment key={idx}>
            <TableRow label="School" value={education.school as string} />
            <TableRow label="Degree" value={education.degree as string} />
            <TableRow label="GPA" value={education.gpa as string} />
            <TableRow label="Date" value={education.date as string} />
            <TableRow
              label="Descriptions"
              value={education.descriptions as string[]}
              className={
                educations.length - 1 !== 0 &&
                idx !== educations.length - 1 &&
                '!border-b-4'
              }
            />
          </Fragment>
        ))}
        <TableRowHeader>Work Experience</TableRowHeader>
        {workExperiences.map((workExperience, idx) => (
          /* eslint-disable-next-line react/no-array-index-key */
          <Fragment key={idx}>
            <TableRow
              label="Company"
              value={workExperience.company as string}
            />
            <TableRow
              label="Job Title"
              value={workExperience.jobTitle as string}
            />
            <TableRow label="Date" value={workExperience.date as string} />
            <TableRow
              label="Descriptions"
              value={workExperience.descriptions as string[]}
              className={
                workExperiences.length - 1 !== 0 &&
                idx !== workExperiences.length - 1 &&
                '!border-b-4'
              }
            />
          </Fragment>
        ))}
        {resume.projects.length > 0 && (
          <TableRowHeader>Projects</TableRowHeader>
        )}
        {resume.projects.map((project, idx) => (
          /* eslint-disable-next-line react/no-array-index-key */
          <Fragment key={idx}>
            <TableRow label="Project" value={project.project} />
            <TableRow label="Date" value={project.date} />
            <TableRow
              label="Descriptions"
              value={project.descriptions}
              className={
                resume.projects.length - 1 !== 0 &&
                idx !== resume.projects.length - 1 &&
                '!border-b-4'
              }
            />
          </Fragment>
        ))}
        <TableRowHeader>Skills</TableRowHeader>
        <TableRow label="Descriptions" value={skills} />
      </tbody>
    </table>
  );
}
