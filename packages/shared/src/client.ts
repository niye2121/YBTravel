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

export const clientTypeSchema = z.enum(["household", "company", "individual"]);
export type ClientType = z.infer<typeof clientTypeSchema>;

export const clientSchema = z.object({
  id: z.number(),
  name: z.string(),
  clientType: clientTypeSchema,
  isDemo: z.boolean(),
  phoneNumber: z.string().nullable(),
  preferredRepId: z.number().nullable(),
  preferredRepName: z.string().nullable(),
  secondaryRepId: z.number().nullable(),
  secondaryRepName: z.string().nullable(),
  bookingFeeGroupId: z.number().nullable(),
  bookingFeeGroupName: z.string(),
  stage: z.string(),
  stageName: z.string(),
  createdAt: z.string(),
});
export type Client = z.infer<typeof clientSchema>;

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clientType: clientTypeSchema.default("household"),
  phoneNumber: z.string().trim().min(7).max(32).nullable().optional(),
  preferredRepId: z.number().nullable().optional(),
  secondaryRepId: z.number().nullable().optional(),
  bookingFeeGroupId: z.number().int().positive(),
  conversationId: z.number().int().positive().optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  clientType: clientTypeSchema,
  phoneNumber: z.string().trim().min(7).max(32).nullable(),
  preferredRepId: z.number().int().positive().nullable(),
  secondaryRepId: z.number().int().positive().nullable(),
  bookingFeeGroupId: z.number().int().positive(),
  stage: z.string().trim().min(1, "Onboarding stage is required").max(50),
});
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

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
  title: z.string().nullable(),
  gender: z.string().nullable(),
  nationality: z.string().nullable(),
  passportStatus: passportStatusSchema,
  passportNumber: z.string().nullable(),
  passportIssuingCountry: z.string().nullable(),
  passportExpiresOn: z.string().nullable(),
  createdAt: z.string(),
  isDemo: z.boolean(),
  clients: z.array(travellerClientLinkSchema),
});
export type Traveller = z.infer<typeof travellerSchema>;

export const travellerRelationshipSchema = z.enum([
  "self",
  "spouse_partner",
  "child",
  "parent_guardian",
  "sibling",
  "other_relative",
  "employee",
  "employer",
  "colleague",
  "friend",
  "guest",
  "group_member",
  "other",
]);
export type TravellerRelationship = z.infer<typeof travellerRelationshipSchema>;

export const createTravellerInput = z
  .object({
    name: z.string().trim().min(1, "Legal name is required").max(160),
    dob: z.string().min(1, "Date of birth is required"),
    title: z.enum(["mr", "mrs", "ms", "miss", "master", "dr"]).nullable().optional(),
    gender: z.enum(["female", "male", "unspecified"]).nullable().optional(),
    nationality: z.string().trim().max(80).nullable().optional(),
    passportStatus: passportStatusSchema.default("missing"),
    passportNumber: z.string().trim().max(40).nullable().optional(),
    passportIssuingCountry: z.string().trim().max(80).nullable().optional(),
    passportExpiresOn: z.string().nullable().optional(),
    links: z
      .array(
        z.object({
          clientId: z.number(),
          relationship: travellerRelationshipSchema.nullable().optional(),
        }),
      )
      .default([]),
  })
  .superRefine((value, context) => {
    if (value.passportStatus !== "on_file") return;
    if (!value.passportNumber) {
      context.addIssue({ code: "custom", path: ["passportNumber"], message: "Passport number is required when passport is on file" });
    }
    if (!value.passportIssuingCountry) {
      context.addIssue({ code: "custom", path: ["passportIssuingCountry"], message: "Issuing country is required when passport is on file" });
    }
    if (!value.passportExpiresOn) {
      context.addIssue({ code: "custom", path: ["passportExpiresOn"], message: "Passport expiry is required when passport is on file" });
    }
  });
export type CreateTravellerInput = z.infer<typeof createTravellerInput>;
