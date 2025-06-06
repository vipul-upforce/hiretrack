import * as Yup from "yup";

export const SignupSchema = Yup.object().shape({
  email: Yup.string()
    .required("Email is required")
    .matches(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, "Invalid Email"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters long")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/\d/, "Password must contain at least one number")
    .matches(
      /[@$!%*?&]/,
      "Password must contain at least one special character (@$!%*?&)"
    )
    .required("Password is required"),
  name: Yup.string()
    .required("Name is required")
    .trim()
    .matches(/^(?!\s+$).*/, "Name cannot be only spaces")
    .min(2, "Name must be at least 2 characters long")
    .max(20, "Name cannot exceed 20 characters"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
  termsAccepted: Yup.boolean()
    .oneOf([true], "You must accept the terms and privacy policy")
    .required("You must accept the terms and privacy policy"),
});
