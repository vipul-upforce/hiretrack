import { Resume } from "@/lib/redux/types";
import { useFormikContext } from "formik";
import { useEffect } from "react";

type WorkExperience = {
  company: string;
  jobTitle: string;
  date: string;
  descriptions: string[];
};

// Function to parse date strings
const parseDate = (dateStr: string): Date | null => {
  const currentDate = new Date();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthAbbr = monthNames.map((m) => m.slice(0, 3));

  // Handle "Present"
  if (dateStr.includes("Present")) return currentDate;

  // Match full month names, abbreviations, and spacing inconsistencies
  const dateRegex = new RegExp(
    `(${monthNames.join("|")}|${monthAbbr.join("|")})\\s?\\d{0,2},?\\s?(\\d{4})`,
    "i"
  );
  const match = dateStr.match(dateRegex);

  if (match) {
    const month =
      monthNames.findIndex(
        (m) => m.toLowerCase() === match[1].toLowerCase()
      ) !== -1
        ? monthNames.findIndex(
            (m) => m.toLowerCase() === match[1].toLowerCase()
          )
        : monthAbbr.findIndex(
            (m) => m.toLowerCase() === match[1].toLowerCase()
          );

    const year = parseInt(match[2], 10);

    return new Date(year, month, 1);
  }

  return null; // Return null if the date format isn't valid
};

// Calculate total experience in years
const calculateTotalExperience = (
  workExperiences: WorkExperience[]
): number => {
  let totalDays = 0;

  workExperiences.forEach(({ date }) => {
    const [startStr, endStr] = date.split("-");
    const startDate = parseDate(startStr.trim());
    const endDate = parseDate(endStr?.trim() || "Present");

    if (startDate && endDate) {
      const differenceInMilliseconds = endDate.getTime() - startDate.getTime();
      const differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);

      totalDays += Math.max(differenceInDays + 1, 0); // Include the last day
    }
  });

  const totalYears = totalDays / 365.25; // Account for leap years
  return parseFloat(totalYears.toFixed(2));
};

type FormValues = {
  name: string;
  email: string;
  contact: string;
  location: string;
  skills: string[];
  experience: number;
};

const FormUpdater = ({
  parsedResumeData,
}: {
  parsedResumeData: Resume | null;
}) => {
  const { values, setFieldValue, validateForm, setTouched } =
    useFormikContext<FormValues>();

  useEffect(() => {
    if (parsedResumeData && parsedResumeData.profile) {
      const { profile } = parsedResumeData;
      if (!values.name && profile.name) {
        setFieldValue("name", undefined);
        setTouched({ name: false });
      }
      if (!values.email && profile.email) {
        setFieldValue("email", undefined);
        setTouched({ email: false });
      }
      if (!values.contact && profile.contact) {
        setFieldValue("contact", undefined);
        setTouched({ contact: false });
      }

      if (!values.location && profile.location) {
        setFieldValue("location", undefined);
        setTouched({ location: false });
      }

      if (
        values.skills.length === 0 &&
        parsedResumeData.skills?.descriptions.length > 0
      ) {
        // Simple validation function - the heavy lifting is now done in the extraction
        const isValidSkill = (skill: string) => {
          const trimmed = skill.trim();
          return (
            trimmed.length >= 2 &&
            trimmed.length <= 30 &&
            trimmed.split(/\s+/).length <= 3 &&
            /[a-zA-Z]/.test(trimmed) &&
            !/^[\d\W_]+$/.test(trimmed)
          );
        };

        const splitSkills = [
          ...new Set([
            ...parsedResumeData.skills.featuredSkills
              .flatMap((desc) =>
                desc.skill
                  .replace(/^[^:]+:/, "")
                  ?.split(/[,|;\/]+/)
                  .map((skill) => skill.trim())
                  .filter(isValidSkill)
              )
              .filter(Boolean),
            ...parsedResumeData.skills.descriptions
              .flatMap((desc) =>
                desc
                  .replace(/^[^:]+:/, "")
                  ?.split(/[,|;\/]+/)
                  .map((skill) => skill.trim())
                  .filter(isValidSkill)
              )
              .filter(Boolean),
          ]),
        ].slice(0, 20);

        setFieldValue("skills", splitSkills);
        setTouched({ skills: true });
      }

      if (!values.experience && parsedResumeData.workExperiences.length > 0) {
        const exp = calculateTotalExperience(parsedResumeData.workExperiences);
        setFieldValue("experience", exp);
        setTouched({ experience: true });
      }
    }

    validateForm();
  }, [parsedResumeData, setFieldValue]);

  return null; // This component doesn't render anything
};

export default FormUpdater;
