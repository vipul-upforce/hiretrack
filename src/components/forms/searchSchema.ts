import * as Yup from "yup";


export const SearchSchema = Yup.object()
  .shape({
    name: Yup.string(),
    skills: Yup.array().of(Yup.string()),
    location: Yup.string(),
    minExpectedCTC: Yup.number().nullable(),
    maxExpectedCTC: Yup.number()
      .nullable()
      .when("minExpectedCTC", ([minExpectedCTC], schema) =>
        minExpectedCTC !== undefined
          ? schema.moreThan(
              minExpectedCTC,
              "Max Expected CTC must be greater than Min Expected CTC"
            )
          : schema
      ),
    minExperience: Yup.number()
      .nullable()
      .min(0, "Minimum experience cannot be negative"),
    maxExperience: Yup.number()
      .nullable()
      .min(
        Yup.ref("minExperience"),
        "Max experience must be greater than min experience"
      ),
    minCurrentCTC: Yup.number().nullable(),
    maxCurrentCTC: Yup.number()
      .nullable()
      .when("minCurrentCTC", ([minCurrentCTC], schema) =>
        minCurrentCTC !== undefined
          ? schema.moreThan(
              minCurrentCTC,
              "Max Current CTC must be greater than Min Current CTC"
            )
          : schema
      ),
    createdAfter: Yup.string(),
    createdBefore: Yup.string().when(
      "createdAfter",
      ([createdAfter], schema) =>
        createdAfter
          ? schema.test(
              "is-after",
              "To date must be after From date",
              (value) => !value || new Date(value) > new Date(createdAfter)
            )
          : schema
    ),
    organizationId: Yup.string(),
    logicOperator: Yup.string().oneOf(["$and", "$or"]),
  })
  .test("paired-fields", "Invalid field pairing", (values) => {
    const errors: {
      minExpectedCTC: string;
      maxExpectedCTC: string;
      minExperience: string;
      maxExperience: string;
      minCurrentCTC: string;
      maxCurrentCTC: string;
      createdAfter?: string;
      createdBefore?: string;
    } = {
      minExpectedCTC: "",
      maxExpectedCTC: "",
      minExperience: "",
      maxExperience: "",
      minCurrentCTC: "",
      maxCurrentCTC: "",
      createdAfter: "",
      createdBefore: "",
    };

    // Check Expected CTC pair
    if (
      (values.minExpectedCTC && !values.maxExpectedCTC) ||
      (!values.minExpectedCTC && values.maxExpectedCTC)
    ) {
      errors.minExpectedCTC =
        "Both min and max Expected CTC must be provided together";
      errors.maxExpectedCTC =
        "Both min and max Expected CTC must be provided together";
    }

    // Check Experience pair
    if (
      (values.minExperience && !values.maxExperience) ||
      (!values.minExperience && values.maxExperience)
    ) {
      errors.minExperience =
        "Both min and max Experience must be provided together";
      errors.maxExperience =
        "Both min and max Experience must be provided together";
    }

    // Check Current CTC pair
    if (
      (values.minCurrentCTC && !values.maxCurrentCTC) ||
      (!values.minCurrentCTC && values.maxCurrentCTC)
    ) {
      errors.minCurrentCTC =
        "Both min and max Current CTC must be provided together";
      errors.maxCurrentCTC =
        "Both min and max Current CTC must be provided together";
    }

    // FIX: Correct error messages for date fields
    if (
      (values.createdAfter && !values.createdBefore) ||
      (!values.createdAfter && values.createdBefore)
    ) {
      errors.createdAfter =
        "Both Created After and Created Before dates must be provided together";
      errors.createdBefore =
        "Both Created After and Created Before dates must be provided together";
    }

    const errorMessages = Object.keys(errors)
      .filter((key) => errors[key as keyof typeof errors])
      .map((key) => errors[key as keyof typeof errors])
      .join(", ");

    return errorMessages
      ? new Yup.ValidationError(errorMessages, values)
      : true;
  });