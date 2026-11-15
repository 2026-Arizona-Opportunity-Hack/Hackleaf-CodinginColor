import { z } from "zod";
import { demoDonors } from "@/lib/demo/data";
import { GENERAL_SUPPORT } from "@/features/donation-requests/allocation";
import { parseAmount } from "@/features/donation-requests/requests";

const text = (max: number) => z.string().trim().max(max);
export const profileInput = z.object({
  type: z.enum(["individual", "organization"]), first_name: text(100), last_name: text(100), organization_name: text(200),
  email: z.string().trim().pipe(z.email().max(254)).transform((value) => value.toLowerCase()), phone: text(40), address_line: text(200),
  city: text(100), state: text(100), postal_code: text(20), is_anonymous: z.boolean(),
  do_not_contact: z.enum(["none", "email", "text", "all"]),
}).strict().superRefine((value, ctx) => {
  if (value.type === "individual" && (!value.first_name || !value.last_name)) ctx.addIssue({ code: "custom", message: "Enter your first and last name." });
  if (value.type === "organization" && !value.organization_name) ctx.addIssue({ code: "custom", message: "Enter the organization name." });
});
export type ProfileFields = z.infer<typeof profileInput>;
export type DemoProfile = ProfileFields & { id: string };
export interface GiftDetails { giftId: string; donorId: string; frequency: "one_time" | "monthly" | "annually"; note: string; is_anonymous: boolean }
export function profileName(profile: ProfileFields) { return profile.type === "organization" ? profile.organization_name : `${profile.first_name} ${profile.last_name}`; }
export function validateProfile(input: unknown, profiles: readonly DemoProfile[], id?: string) {
  const value = profileInput.parse(input);
  if (profiles.some((profile) => profile.id !== id && profile.email === value.email) || demoDonors.some((donor) => donor.id !== id && donor.email?.toLowerCase() === value.email)) throw new Error("That email already belongs to a demo profile. Use the login page or another fictional email.");
  return value;
}
export const donationInput = z.object({
  amount: z.string(), currency: z.literal("USD"),
  source: z.enum(["zeffy", "benevity", "az_gives", "united_way", "spreadsheet"]),
  frequency: z.enum(["one_time", "monthly", "annually"]), note: text(500), is_anonymous: z.boolean(),
}).strict();
export function parseDonation(input: unknown) {
  const { amount, ...fields } = donationInput.parse(input);
  return { ...fields, programId: GENERAL_SUPPORT, amountCents: parseAmount(amount) };
}
export const initialDemoProfile: DemoProfile = {
  id: demoDonors[0].id, type: "individual", first_name: "Jordan", last_name: "Ellis", organization_name: "",
  email: "donor1@example.org", phone: "", address_line: "", city: "", state: "", postal_code: "", is_anonymous: false, do_not_contact: "all",
};
