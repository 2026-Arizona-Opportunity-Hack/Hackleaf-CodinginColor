import { expect, it } from "vitest";
import { initialDemoProfile, parseDonation, profileName, validateProfile } from "./model";

const { id, ...base } = initialDemoProfile;
const fields = { ...base, email: "  NEW@EXAMPLE.ORG  " };

it("validates screenshot donor fields and normalizes contact identity", () => {
  const profile = validateProfile(fields, []);
  expect(profile.email).toBe("new@example.org");
  expect(profileName(profile)).toBe("Jordan Ellis");
  expect(() => validateProfile({ ...fields, first_name: " " }, [])).toThrow();
  expect(() => validateProfile({ ...fields, type: "organization", organization_name: " " }, [])).toThrow();
  expect(profileName(validateProfile({ ...fields, type: "organization", organization_name: " Test Foundation " }, []))).toBe("Test Foundation");
});

it("rejects duplicate demo identities while permitting self edits", () => {
  expect(() => validateProfile(base, [initialDemoProfile])).toThrow(/already belongs/);
  expect(validateProfile(base, [initialDemoProfile], id).email).toBe(base.email);
  expect(() => validateProfile({ ...fields, email: "donor2@example.org" }, [])).toThrow(/already belongs/);
});

it("keeps audit, status, ownership and auth privileges out of registration input", () => {
  for (const forbidden of ["owner_user_id", "role", "status", "merged_into_id", "email_undeliverable", "revision", "created_source", "password", "donor_id"]) {
    expect(() => validateProfile({ ...fields, [forbidden]: "forged" }, [])).toThrow();
  }
});

it("validates monetary preferences, exact cents and anonymity without claiming provider delivery", () => {
  const input = { amount: "20.01", currency: "USD", source: "zeffy", frequency: "monthly", note: " Supplies ", is_anonymous: true };
  expect(parseDonation(input)).toMatchObject({ amountCents: 2001, programId: "general", note: "Supplies", is_anonymous: true });
  for (const changed of [{ amount: "0" }, { amount: "1.001" }, { programId: "ai-academy" }, { programId: "general" }, { currency: "EUR" }, { donorId: "someone-else" }, { sent: true }, { external_id: "fake-receipt" }]) expect(() => parseDonation({ ...input, ...changed })).toThrow();
});
