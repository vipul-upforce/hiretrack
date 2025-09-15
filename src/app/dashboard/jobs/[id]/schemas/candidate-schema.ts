import { Interviewer } from "@/lib/features/user/userApi";
import * as Yup from "yup";

export const candidateSchema = (customFields: Yup.Schema<unknown>) =>
  Yup.object().shape({
    resume: Yup.mixed().required("Resume is required"),
    name: Yup.string()
      .required("Name is required")
      .min(2, "Name must be at least 2 characters long")
      .max(25, "Name must be 25 characters or fewer")
      .matches(
        /^(?=.*[A-Za-z]).+$/,
        "Name must include at least one letter and cannot consist of only numbers or symbols."
      ),
    email: Yup.string()
      .required("Email is required")
      .matches(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email address"
      ),
    contact: Yup.string()
      .required("Contact number is required")
      .matches(
        /^[\d\s\-\+\(\)]{10,15}$/,
        "Please enter a valid contact number (10-15 digits)"
      ),
    location: Yup.string()
      .required("Location is required")
      .matches(
        /^(?=.*[A-Za-z]).+$/,
        "Location must include at least one letter and cannot consist of only numbers or symbols."
      ),
    experience: Yup.number()
      .required("Experience is required")
      .min(0, "Experience cannot be negative"),
    skills: Yup.array()
      .of(
        Yup.string()
          .required("Skill is required")
          .matches(
            /^(?=.*[A-Za-z]).+$/,
            "Each skill must include at least one letter and cannot consist of only numbers or symbols."
          )
      )
      .min(1, "At least one skill is required"),
    expectedCTC: Yup.mixed()
      .required("Expected CTC is required")
      .test(
        "is-valid-ctc",
        "Expected CTC must be a valid number",
        function (value) {
          if (value === undefined || value === null || value === "")
            return false;
          // If it's already a number, it's valid
          if (typeof value === "number") return !isNaN(value) && value >= 0;
          // If it's a string, try to convert it
          if (typeof value === "string") {
            const cleanValue = value.replace(/[,\s]/g, "");
            const numValue = parseFloat(cleanValue);
            return !isNaN(numValue) && numValue >= 0;
          }
          return false;
        }
      )
      .transform((value) => {
        // This will normalize the value after validation
        if (typeof value === "string") {
          const cleanValue = value.replace(/[,\s]/g, "");
          return parseFloat(cleanValue);
        }
        return value;
      }),
    currentCTC: Yup.mixed()
      .required("Current CTC is required")
      .test(
        "is-valid-ctc",
        "Current CTC must be a valid number",
        function (value) {
          if (value === undefined || value === null || value === "")
            return false;
          // If it's already a number, it's valid
          if (typeof value === "number") return !isNaN(value) && value >= 0;
          // If it's a string, try to convert it
          if (typeof value === "string") {
            const cleanValue = value.replace(/[,\s]/g, "");
            const numValue = parseFloat(cleanValue);
            return !isNaN(numValue) && numValue >= 0;
          }
          return false;
        }
      )
      .transform((value) => {
        // This will normalize the value after validation
        if (typeof value === "string") {
          const cleanValue = value.replace(/[,\s]/g, "");
          return parseFloat(cleanValue);
        }
        return value;
      }),
    noticePeriod: Yup.number()
      .required("Notice period is required")
      .integer("Notice period must be an integer")
      .min(0, "Notice period cannot be negative")
      .max(180, "Can not be more then 180 days(6 months)"),
    attachments: Yup.array().of(Yup.mixed()),
    assignee: Yup.string().nullable(),
    time: Yup.date().nullable(),
    assignment: Yup.object()
      .shape({
        interviewerId: Yup.mixed().nullable(), // Allow string or object
        time: Yup.date().nullable(),
        // .when("interviewerId", (interviewerId, schema) => {
        //   // Handle both string and object cases

        //   const id = typeof interviewerId === "string" ? interviewerId : "_id" in interviewerId && interviewerId?._id;
        //   if (id && id !== "-1") {
        //     return schema
        //       .min(new Date(), "Past Date is not allowed")
        //       .required("Time is required when interviewer is assigned");
        //   }
        //   return schema.nullable();
        // }),
      })
      .nullable()
      .test(
        "interviewer-required-if-time",
        "Interviewer ID is required if a time is set",
        function (value) {
          const interviewerId =
            typeof value?.interviewerId === "string"
              ? value.interviewerId
              : (value?.interviewerId as Interviewer)?._id;
          if (value?.time && (!interviewerId || interviewerId === "-1")) {
            return this.createError({
              path: "assignment.interviewerId",
              message: "Interviewer ID is required when time is set",
            });
          }
          return true;
        }
      ),
    customFields: customFields,
  });
export interface CandidateFormValues {
  name: string;
  email: string;
  contact: string;
  location: string;
  experience: number;
  skills: string[];
  expectedCTC: number | string;
  currentCTC: number | string;
  noticePeriod: number;
  // currentLocation: string;
  resume: File | null;
  // remarks: string;
  attachments: File[];
  assignee?: string;
  time?: Date;
  assignment?: {
    interviewerId: string | { _id: string; name: string; email: string } | null;
    time: Date | null;
  } | null;
}
