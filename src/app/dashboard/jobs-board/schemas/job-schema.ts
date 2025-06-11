// import { FileData } from "@/Custom_Fields/hooks/useCustomForm";
// import { Dayjs } from "dayjs";
import { FileData } from "@/Custom_Fields/hooks/useCustomForm";
import { Dayjs } from "dayjs";
import * as Yup from "yup";

export const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>?/gm, "")
    .replace(/\s+/g, " ")
    .trim();

// export const jobSchema = (customFields: Yup.Schema<unknown>)=>{
export const jobSchema = (customFields: Yup.Schema<unknown>) => {
  return Yup.object().shape({
    title: Yup.string()
      .required("Job title is required")
      .trim("Job title cannot have leading or trailing spaces")
      .max(300, "Job title cannot exceed 300 characters"),
    // company: Yup.string()
    //   .required("Company name is required")
    //   .min(2, "Company name must be at least 2 characters")
    //   .trim("Title should not have leading or trailing spaces"),
    // description: Yup.string()
    //   .required("Job description is required")
    //   .min(50, "Description must be at least 50 characters")
    //   .trim("Title should not have leading or trailing spaces"),
    description: Yup.string()
      .required("Job description is required")
      .test(
        "min-text-length",
        "Description must be at least 50 characters",
        (value) => {
          if (!value) return false;
          const plainText = stripHtml(value);
          return plainText.length >= 50;
        }
      ),
    skills: Yup.array()
      .of(Yup.string())
      .min(1, "At least one skill is required"),
    experience: Yup.number()
      .required("Years of experience is required")
      .min(0, "Experience cannot be negative"),
    links: Yup.array().of(Yup.string().url("Must be a valid URL")),
    // validTill: Yup.date()
    //   .required("Valid till date is required")
    //   .min(new Date(), "Past date is not allowed"),
    files: Yup.array().of(Yup.mixed()),
    images: Yup.array().of(Yup.mixed()),
    customFields: customFields,
  });
};

export interface JobFormValues {
  _id: string;
  title: string;
  // company: string;
  description: string;
  skills: string[];
  experience: number;
  links: string[];
  // validTill: Date;
  files: File[];
  images: File[];
  removedFiles?: string[];
  removedImages?: string[];
  customFields: Record<
    string,
    string | boolean | string[] | File[] | Dayjs | FileData[]
  >;
}
