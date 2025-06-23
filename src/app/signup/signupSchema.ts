import * as Yup from "yup";

export const SignupSchema = Yup.object().shape({
  email: Yup.string()
    .required("Email is required")
    .matches(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, "Invalid Email"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters.")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter.")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .matches(/\d/, "Password must include at least one number.")
    .matches(
      /[@$!%*?&]/,
      "Password must include at least one special character (@$!%*?&)"
    )
    .required("Password is required"),
  name: Yup.string()
    .required("Name is required")
    .trim()
    .matches(/^(?!\s+$).*/, "Name cannot be only spaces.")
    .min(2, "Name must be at least 2 characters long.")
    .max(20, "Name must be 20 characters or fewer."),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
  termsAccepted: Yup.boolean()
    .oneOf([true], "You must accept the terms and privacy policy")
    .required("You must accept the terms and privacy policy"),
});
