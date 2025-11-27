import * as Yup from "yup";

export interface MultipleOrgsValues {
  multipleOrg: boolean;
}

export const multipleOrgSchema = Yup.object({
  multipleOrg: Yup.boolean().required(),
});
