import * as Yup from "yup";

export const userFormVaidationSchema = Yup.object().shape({
  name: Yup.string()
    // .trim()
    .strict(true)
    .min(2, "Full Name must be at least 2 characters long")
    .max(20, "Full Name cannot exceed 20 characters")
    .matches(/^(?!\s+$).*/, "Full Name cannot be only spaces")
    .required("Full Name is required"),
  email: Yup.string()
    .required("Email is required")
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid Email"
    ),
  role: Yup.string()
    .oneOf(["hr", "interviewer", "admin"], "Invalid role")
    .required("Role is required"),
});
