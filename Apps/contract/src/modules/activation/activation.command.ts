import { z } from 'zod';
import { AccountInformation } from './activation.enums';

export const AccountFieldSchema = z.object({
  field: z.enum(AccountInformation),
  value: z.string(),
});
export type AccountField = z.infer<typeof AccountFieldSchema>;

export const AccountFieldsSchema = z.array(AccountFieldSchema).nonempty();
export type AccountFields = z.infer<typeof AccountFieldsSchema>;

// Public commands
export const VerifyKeySchema = z.object({
  key: z.string(),
});
export type VerifyKeyCommand = z.infer<typeof VerifyKeySchema>;

export const SubmitActivationSchema = z.object({
  key: z.string(),
  fullName: z.string(),
  phone: z.string(),
  accountFields: AccountFieldsSchema,
});
export type SubmitActivationCommand = z.infer<typeof SubmitActivationSchema>;

export const UpdateActivationSchema = z.object({
  accountFields: AccountFieldsSchema,
});
export type UpdateActivationCommand = z.infer<typeof UpdateActivationSchema>;

export const SubmitAdditionalInfoSchema = z.object({
  accountFields: AccountFieldsSchema,
});
export type SubmitAdditionalInfoCommand = z.infer<typeof SubmitAdditionalInfoSchema>;

// Required on both the activator's own Activate and the admin's resolve-frozen-to-activate
// (Stage-04-fix #2) — stored on Activation.activationEmail.
export const ActivateActivationSchema = z.object({
  activationEmail: z.email(),
});
export type ActivateActivationCommand = z.infer<typeof ActivateActivationSchema>;

// Activator commands
export const FlagWrongInfoSchema = z.object({
  fields: z.array(z.enum(AccountInformation)).nonempty(),
});
export type FlagWrongInfoCommand = z.infer<typeof FlagWrongInfoSchema>;

export const RequestAdditionalInfoSchema = z.object({
  fields: z.array(z.enum(AccountInformation)).nonempty(),
});
export type RequestAdditionalInfoCommand = z.infer<typeof RequestAdditionalInfoSchema>;

export const FreezeRequestSchema = z.object({
  reason: z.string().min(1),
});
export type FreezeRequestCommand = z.infer<typeof FreezeRequestSchema>;

// Admin commands
export const SetActivatorPriceSchema = z.object({
  amount: z.number().nonnegative().multipleOf(0.01),
});
export type SetActivatorPriceCommand = z.infer<typeof SetActivatorPriceSchema>;
