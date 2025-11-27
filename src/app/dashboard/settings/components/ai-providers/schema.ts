import * as Yup from "yup";

export const aiProvidersSchema = Yup.object({
  activeProvider: Yup.string().required("Please select an active provider"),
  gemini_api_key: Yup.string().max(200, "Max length 200 chars"),
  gemini_model: Yup.string().required("Model is required"),
  gemini_custom_model: Yup.string().when("gemini_model", {
    is: "custom",
    then: (schema) => schema.required("Custom model name is required"),
    otherwise: (schema) => schema,
  }),
  openai_api_key: Yup.string().max(200, "Max length 200 chars"),
  openai_model: Yup.string().required("Model is required"),
  openai_custom_model: Yup.string().when("openai_model", {
    is: "custom",
    then: (schema) => schema.required("Custom model name is required"),
    otherwise: (schema) => schema,
  }),
  anthropic_api_key: Yup.string().max(200, "Max length 200 chars"),
  anthropic_model: Yup.string().required("Model is required"),
  anthropic_custom_model: Yup.string().when("anthropic_model", {
    is: "custom",
    then: (schema) => schema.required("Custom model name is required"),
    otherwise: (schema) => schema,
  }),
  perplexity_api_key: Yup.string().max(200, "Max length 200 chars"),
  perplexity_model: Yup.string().required("Model is required"),
  perplexity_custom_model: Yup.string().when("perplexity_model", {
    is: "custom",
    then: (schema) => schema.required("Custom model name is required"),
    otherwise: (schema) => schema,
  }),
});
