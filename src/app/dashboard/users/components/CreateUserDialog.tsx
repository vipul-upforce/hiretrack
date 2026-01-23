'use client';

import { useState } from 'react';
import {
    Formik,
    Form,
    Field,
    FormikErrors,
    FormikTouched,
    FieldProps,
    FormikHelpers,
} from 'formik';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignupMutation } from '@/lib/features/auth/authApi';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { SignupFormValues } from '@/types/signup';
import { useAppSelector } from '@/lib/redux/hooks';
import { SignupSchema } from '@/app/auth/schema/Signup.schema';

interface CreateUserDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateUserDialog({
    isOpen,
    onOpenChange,
    onSuccess,
}: CreateUserDialogProps) {
    const { toast } = useToast();
    const [signup, { isLoading }] = useSignupMutation();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { user: userData } = useAppSelector((state) => state.auth);

    const initialValues: SignupFormValues = {
        email: '',
        password: '',
        name: '',
        confirmPassword: '',
        role: '',
        organizationId: '',
    };

    const handleSubmit = async (
        values: SignupFormValues,
        { setStatus, resetForm }: FormikHelpers<SignupFormValues>,
    ) => {
        try {
            if (userData) {
                try {
                    const orgIdCookie = userData.organizationId || '';
                    const signupData = {
                        ...values,
                        email: values.email.toLowerCase().trim(),
                        organizationId: orgIdCookie,
                        name: values.name.trim(),
                        triggerUserId: userData.id,
                        triggerUserName: userData.name,
                    };
                    const response = await signup(signupData).unwrap();

                    if (response.user) {
                        toast({
                            title: 'Success',
                            description: 'Account created successfully',
                            variant: 'default',
                        });
                        resetForm();
                        onOpenChange(false);
                        onSuccess();
                    } else {
                        throw new Error('No user data received');
                    }
                } catch (error: unknown) {
                    if (error && typeof error === 'object' && 'data' in error) {
                        const errorMessage =
                            (error.data as { error: string }).error ||
                            'Failed to parse user data from cookie';
                        throw new Error(errorMessage);
                    } else {
                        throw new Error('Failed to parse user data from cookie');
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                const errorMessage = err.message || 'Failed to create account';
                setStatus(errorMessage);
                toast({
                    title: 'Error',
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0">
                <DialogHeader className="px-6 py-4">
                    <DialogTitle className="text-2xl">Create Account</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    <Formik
                        initialValues={initialValues}
                        validationSchema={SignupSchema}
                        onSubmit={handleSubmit}
                    >
                        {({
                            errors,
                            touched,
                            isSubmitting,
                        }: {
                            errors: FormikErrors<SignupFormValues>;
                            touched: FormikTouched<SignupFormValues>;
                            isSubmitting: boolean;
                        }) => (
                            <Form className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Field name="name">
                                        {({ field }: FieldProps) => (
                                            <>
                                                <Input
                                                    {...field}
                                                    id="name"
                                                    type="text"
                                                    placeholder="Enter full name"
                                                    disabled={isLoading || isSubmitting}
                                                    className={
                                                        errors.name && touched.name ? 'border-red-500' : ''
                                                    }
                                                />
                                                {errors.name && touched.name && (
                                                    <div className="text-sm text-red-500">
                                                        {errors.name}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </Field>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Field name="email">
                                        {({ field }: FieldProps) => (
                                            <>
                                                <Input
                                                    {...field}
                                                    id="email"
                                                    type="email"
                                                    placeholder="Enter email address"
                                                    disabled={isLoading || isSubmitting}
                                                    className={
                                                        errors.email && touched.email
                                                            ? 'border-red-500'
                                                            : ''
                                                    }
                                                />
                                                {errors.email && touched.email && (
                                                    <div className="text-sm text-red-500">
                                                        {errors.email}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </Field>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Field name="password">
                                            {({ field }: FieldProps) => (
                                                <>
                                                    <Input
                                                        {...field}
                                                        id="password"
                                                        placeholder="Enter password"
                                                        type={showPassword ? 'text' : 'password'}
                                                        disabled={isLoading || isSubmitting}
                                                        className={
                                                            errors.password && touched.password
                                                                ? 'border-red-500'
                                                                : ''
                                                        }
                                                    />
                                                    {errors.password && touched.password && (
                                                        <div className="text-sm text-red-500">
                                                            {errors.password}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </Field>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className={`absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 hover:bg-transparent ${errors.password && touched.password ? 'translate-y-[-25px]' : ''}`}
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {!showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <div className="relative">
                                        <Field name="confirmPassword">
                                            {({ field }: FieldProps) => (
                                                <>
                                                    <Input
                                                        {...field}
                                                        id="confirmPassword"
                                                        placeholder="Confirm password"
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        disabled={isLoading || isSubmitting}
                                                        className={
                                                            errors.confirmPassword && touched.confirmPassword
                                                                ? 'border-red-500'
                                                                : ''
                                                        }
                                                    />
                                                    {errors.confirmPassword &&
                                                        touched.confirmPassword && (
                                                            <div className="text-sm text-red-500">
                                                                {errors.confirmPassword}
                                                            </div>
                                                        )}
                                                </>
                                            )}
                                        </Field>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className={`absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 hover:bg-transparent ${errors.confirmPassword && touched.confirmPassword ? 'translate-y-[-25px]' : ''}`}
                                            onClick={() =>
                                                setShowConfirmPassword(!showConfirmPassword)
                                            }
                                        >
                                            {!showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Field name="role">
                                        {({ field, form }: FieldProps) => (
                                            <>
                                                <Select
                                                    {...field}
                                                    value={field.value}
                                                    onValueChange={(value) =>
                                                        form.setFieldValue(field.name, value)
                                                    }
                                                    disabled={isLoading || isSubmitting}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="hr">HR</SelectItem>
                                                        <SelectItem value="interviewer">
                                                            Interviewer
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.role && touched.role && (
                                                    <div className="text-sm text-red-500">
                                                        {errors.role}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </Field>
                                </div>

                                <div className="sticky bottom-0 z-10 flex justify-end border-t bg-background pt-4">
                                    <Button
                                        type="submit"
                                        className="w-fit"
                                        disabled={isLoading || isSubmitting}
                                        variant="primary"
                                    >
                                        {isLoading || isSubmitting
                                            ? 'Creating User...'
                                            : 'Create User'}
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </DialogContent>
        </Dialog>
    );
}
