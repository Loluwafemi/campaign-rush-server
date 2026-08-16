import { z } from "zod";

/**
 * Loose E.164-style validation: optional leading +, 8-15 digits total.
 * Intentionally permissive about formatting (spaces/dashes stripped
 * before validation) since participants paste numbers in whatever
 * format their phone's contact app gives them.
 */
const phoneNumberSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[\s\-()]/g, ""))
  .pipe(z.string().regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number"));

export const registerParticipantSchema = z.object({
  eventId: z.string().cuid(),
  name: z.string().trim().min(1).max(120),
  phoneNumber: phoneNumberSchema,
});
export type RegisterParticipantInput = z.infer<typeof registerParticipantSchema>;

export const refCodeParamSchema = z.object({
  refCode: z
    .string()
    .min(6)
    .max(8)
    .regex(/^[0-9A-Za-z]+$/),
});
export type RefCodeParam = z.infer<typeof refCodeParamSchema>;
