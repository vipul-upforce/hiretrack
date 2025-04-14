// "use client"
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { useEffect, useState } from "react"
// import { useFormik } from "formik"
// import * as Yup from "yup"
// import { Button } from "@/components/ui/button"
// import { Label } from "@/components/ui/label"
// import { FormField } from "@/lib/models/FormField"
// // import { renderFormField } from "@/lib/form-helpers"
// import { toast } from "@/hooks/use-toast"

// interface DynamicEntityFormProps {
//   entityType: 'jobs' | 'candidates'
//   initialData?: any
//   onSubmit: (values: any) => Promise<void>
//   isEditing?: boolean
// }

// export function DynamicEntityForm({
//   entityType,
//   initialData,
//   onSubmit,
//   isEditing = false
// }: DynamicEntityFormProps) {
//   const [permanentFields, setPermanentFields] = useState<FormField[]>([])
//   const [tempFields, setTempFields] = useState<FormField[]>([])

//   useEffect(() => {
//     fetchFormFields()
//   }, [entityType])

//   const fetchFormFields = async () => {
//     try {
//       const [permanentResponse, tempResponse] = await Promise.all([
//         fetch(`/api/form-fields?moduleType=${entityType}&isPermanent=true`),
//         fetch(`/api/form-fields?moduleType=${entityType}&isPermanent=false`)
//       ])

//       const permanent = await permanentResponse.json()
//       const temp = await tempResponse.json()

//       setPermanentFields(permanent)
//       setTempFields(temp)
//     } catch (error : unknown) {
//       toast({
//         title: "Error : " + (error instanceof Error && error.message),
//         description: "Failed to load form fields",
//         variant: "destructive"
//       })
//     }
//   }

//   // Create validation schema from all fields
//   const validationSchema = Yup.object().shape(
//     [...permanentFields, ...tempFields].reduce((acc: Record<string, Yup.Schema<any>>, field) => {
//       let validator: Yup.Schema<any>

//       switch (field.fieldType) {
//         case 'file':
//           validator = Yup.array().of(
//             Yup.mixed().test('fileSize', 'File too large', function (value) {
//               if (!value || !(value instanceof File)) return true;
//               return (value as File).size <= (field.maxSize || 5 * 1024 * 1024);
//             })
//           )
//           if (field.isRequired) {
//             // validator = validator.min(1, 'At least one file is required')
//           }
//           break

//         case 'number':
//           validator = Yup.number().typeError('Must be a number')
//           if (field.isRequired) {
//             validator = validator.required(`${field.label} is required`)
//           }
//           break

//         default:
//           validator = Yup.string()
//           if (field.isRequired) {
//             validator = validator.required(`${field.label} is required`)
//           }
//       }

//       acc[field.name] = validator
//       return acc
//     }, {})
//   )

//   const formik = useFormik({
//     initialValues: {
//       ...initialData,
//       ...[...permanentFields, ...tempFields].reduce((acc: any, field) => {
//         acc[field.name] = initialData?.[field.name] || field.defaultValue || ''
//         return acc
//       }, {})
//     },
//     validationSchema,
//     enableReinitialize: true,
//     onSubmit: async (values) => {
//       try {
//         const formData = new FormData()

//         // Add all field values to formData
//         Object.entries(values).forEach(([key, value]) => {
//           if (Array.isArray(value) && value[0] instanceof File) {
//             value.forEach((file: File) => {
//               formData.append(key, file)
//             })
//           } else {
//             formData.append(key, value as string)
//           }
//         })

//         await onSubmit(formData)

//         toast({
//           title: "Success",
//           description: `${entityType === 'jobs' ? 'Job' : 'Candidate'} ${isEditing ? 'updated' : 'created'} successfully`
//         })
//       } catch {
//         toast({
//           title: "Error",
//           description: `Failed to ${isEditing ? 'update' : 'create'} ${entityType === 'jobs' ? 'job' : 'candidate'}`,
//           variant: "destructive"
//         })
//       }
//     }
//   })

//   return (
//     <form onSubmit={formik.handleSubmit} className="space-y-6">
//       {/* Permanent Fields */}
//       <div className="space-y-4">
//         <h3 className="text-lg font-semibold">Details</h3>
//         {permanentFields.map((field) => (
//           <div key={field._id} className="space-y-2">
//             <Label htmlFor={field.name}>
//               {field.label}
//               {field.isRequired && <span className="text-red-500">*</span>}
//             </Label>
//             {renderFormField({
//               field,
//               formik,
//               value: formik.values[field.name],
//               onChange: (value) => formik.setFieldValue(field.name, value)
//             })}
//             {formik.touched[field.name] && formik.errors[field.name] && (
//               <div className="text-red-500 text-sm">
//                 {formik.errors[field.name] as string}
//               </div>
//             )}
//           </div>
//         ))}
//       </div>

//       {/* Temporary Fields */}
//       {tempFields.length > 0 && (
//         <div className="space-y-4">
//           <h3 className="text-lg font-semibold">Additional Information</h3>
//           {tempFields.map((field) => (
//             <div key={field._id} className="space-y-2">
//               <Label htmlFor={field.name}>
//                 {field.label}
//                 {field.isRequired && <span className="text-red-500">*</span>}
//               </Label>
//               {renderFormField({
//                 field,
//                 formik,
//                 value: formik.values[field.name],
//                 onChange: (value) => formik.setFieldValue(field.name, value)
//               })}
//               {formik.touched[field.name] && formik.errors[field.name] && (
//                 <div className="text-red-500 text-sm">
//                   {formik.errors[field.name] as string}
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}

//       <div className="flex justify-end pt-4">
//         <Button type="submit">
//           {isEditing ? 'Update' : 'Create'} {entityType === 'jobs' ? 'Job' : 'Candidate'}
//         </Button>
//       </div>
//     </form>
//   )
// }

import React from "react";

function DynamicEntityForm() {
  return <div>DynamicEntityForm</div>;
}

export default DynamicEntityForm;
