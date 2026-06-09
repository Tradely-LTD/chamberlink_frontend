import * as yup from 'yup';

export const registerSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email address'),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(
      /^(\+234|0)[789][01]\d{8}$/,
      'Enter a valid Nigerian phone number (e.g. 08012345678)'
    ),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Must contain at least one digit'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
});

export type RegisterFormValues = yup.InferType<typeof registerSchema>;
