import { z } from "zod";

/**
 * NOTE for anyone importing from this file in apps/api: only ever
 * `import type`, never a real value. This package is consumed as raw
 * TypeScript source with no build step — a value import resolves through
 * the workspace symlink into this .ts file, which plain `node dist/main.js`
 * can't execute at runtime. The API defines its own local copies of any
 * zod schemas it needs (see auth.controller.ts/users.controller.ts for the
 * existing pattern). The frontend has no such restriction — Vite bundles
 * this file directly, so real value imports are fine there.
 */

export const onboardingStageSchema = z.enum([
  "new_inquiry",
  "welcome_sent",
  "waiting_for_info",
  "information_received",
  "review_complete",
  "fully_onboarded",
]);
export type OnboardingStage = z.infer<typeof onboardingStageSchema>;

export const passportStatusSchema = z.enum(["on_file", "missing", "expiring_soon"]);
export type PassportStatus = z.infer<typeof passportStatusSchema>;

export const clientSchema = z.object({
  id: z.number(),
  name: z.string(),
  preferredRepId: z.number().nullable(),
  preferredRepName: z.string().nullable(),
  secondaryRepId: z.number().nullable(),
  secondaryRepName: z.string().nullable(),
  bookingFeeGroupId: z.number().nullable(),
  bookingFeeGroupName: z.string(),
  stage: onboardingStageSchema,
  createdAt: z.string(),
});
export type Client = z.infer<typeof clientSchema>;

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  preferredRepId: z.number().nullable().optional(),
  secondaryRepId: z.number().nullable().optional(),
  bookingFeeGroupId: z.number().int().positive(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

/**
 * The many-to-many link Joe asked for: one traveller can appear against
 * more than one client's account (e.g. flying under a parent's account and
 * their own), each link carrying its own relationship label.
 */
export const travellerClientLinkSchema = z.object({
  clientId: z.number(),
  clientName: z.string(),
  relationship: z.string().nullable(),
});
export type TravellerClientLink = z.infer<typeof travellerClientLinkSchema>;

export const travellerSchema = z.object({
  id: z.number(),
  name: z.string(),
  dob: z.string().nullable(),
  passportStatus: passportStatusSchema,
  createdAt: z.string(),
  clients: z.array(travellerClientLinkSchema),
});
export type Traveller = z.infer<typeof travellerSchema>;

export const createTravellerInput = z.object({
  name: z.string().min(1, "Name is required"),
  dob: z.string().nullable().optional(),
  passportStatus: passportStatusSchema.default("missing"),
  links: z
    .array(z.object({ clientId: z.number(), relationship: z.string().nullable().optional() }))
    .default([]),
});
export type CreateTravellerInput = z.infer<typeof createTravellerInput>;
