import { z } from "zod";

/**
 * Duration is accepted as a value + unit pair rather than a bare
 * number of hours, since hosts naturally think in either "48 hours"
 * or "2 days" depending on the campaign. The controller normalizes
 * this to `durationHours` (the column Prisma actually stores) before
 * touching the database.
 */
const durationSchema = z.object({
  value: z.number().int().positive().max(720, "Duration cannot exceed 720 hours (30 days)"),
  unit: z.enum(["hours", "days"]),
});

export const createEventSchema = z.object({
  name: z.string().trim().min(3).max(150),
  description: z.string().trim().max(2000).optional(),
  targetGroupUrl: z.string().url("targetGroupUrl must be a valid URL"),
  ogImageUrl: z.string().url("ogImageUrl must be a valid URL").optional(),
  duration: durationSchema,
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const eventIdParamSchema = z.object({
  id: z.string().cuid(),
});
export type EventIdParam = z.infer<typeof eventIdParamSchema>;

/** Converts the accepted {value, unit} duration into a whole-hours integer for storage. */
export function durationToHours(duration: CreateEventInput["duration"]): number {
  return duration.unit === "days" ? duration.value * 24 : duration.value;
}
