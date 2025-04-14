import * as Yup from "yup";
export const candidateSchema = (customFields: Yup.Schema<unknown>) =>
  Yup.object().shape({
    name: Yup.string()
      .required("Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(25, "Name cannot be longer than 25 charecters"),
    location: Yup.string().required("Location is required"),
    experience: Yup.number()
      .required("Experience is required")
      .min(0, "Experience cannot be negative"),
    skills: Yup.array()
      .of(Yup.string())
      .min(1, "At least one skill is required"),
    expectedCTC: Yup.number()
      .required("Expected CTC is required")
      .min(0, "CTC cannot be negative")
      .max(100000000, "Can not be more then 100CR"),
    currentCTC: Yup.number()
      .required("Current CTC is required")
      .min(0, "CTC cannot be negative")
      .max(100000000, "Can not be more then 100CR"),
    noticePeriod: Yup.number()
      .required("Notice period is required")
      .integer("Notice period must be an integer")
      .min(0, "Notice period cannot be negative")
      .max(180, "Can not be more then 180 days(6 months)"),
    // currentLocation: Yup.string().required("Current location is required"),
    resume: Yup.mixed().required("Resume is required"),
    // remarks: Yup.string(),
    attachments: Yup.array().of(Yup.mixed()),
    assignee: Yup.string().nullable(),
    deadline: Yup.date().nullable(),
    assignment: Yup.object()
      .shape({
        interviewerId: Yup.string().nullable(),
        deadline: Yup.date()
          .min(new Date(), "Past date is not allowed")
          .nullable(),
      })
      .nullable()
      .test(
        "interviewer-required-if-deadline",
        "Interviewer ID is required if a deadline is set",
        function (value) {
          if (
            value?.deadline &&
            (!value.interviewerId || value.interviewerId === "-1")
          ) {
            return this.createError({
              path: "assignment.interviewerId",
              message: "Interviewer ID is required when a deadline is set",
            });
          }
          return true;
        }
      ),
    customFields: customFields,
    email: Yup.string()
      .required("Email is required")
      .matches(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Invalid Email"
      ),
  });

export interface CandidateFormValues {
  name: string;
  location: string;
  experience: number;
  skills: string[];
  expectedCTC: number;
  currentCTC: number;
  noticePeriod: number;
  // currentLocation: string;
  resume: File | null;
  // remarks: string;
  attachments: File[];
  assignee?: string;
  deadline?: Date;
  assignment?: {
    interviewerId: string | { _id: string; name: string; email: string } | null;
    deadline: Date | null;
  } | null;
  email?: string;
}
