import { z } from "zod";

// Send the supported strict-output schema subset to OpenAI. Zod remains the
// authoritative server validator for lengths and the more complex regex rules.
export function modelSchema(schema: z.ZodType): Record<string, unknown> {
  function project(input: unknown): Record<string, unknown> {
    const value = { ...(input as Record<string, unknown>) };
    const { minLength, maxLength } = value;
    delete value.$schema; delete value.minLength; delete value.maxLength; delete value.pattern;
    if (minLength !== undefined || maxLength !== undefined) value.description = `${value.description ?? ""} String length: ${minLength ?? 0}–${maxLength ?? "unbounded"} characters.`.trim();
    if (value.properties) {
      value.properties = Object.fromEntries(Object.entries(value.properties as Record<string, unknown>).map(([name, child]) => [name, project(child)]));
      value.required = Object.keys(value.properties as Record<string, unknown>);
      value.additionalProperties = false;
    }
    if (value.$defs) value.$defs = Object.fromEntries(Object.entries(value.$defs as Record<string, unknown>).map(([name, child]) => [name, project(child)]));
    if (value.items && typeof value.items === "object") value.items = project(value.items);
    for (const key of ["anyOf", "oneOf", "allOf"]) if (Array.isArray(value[key])) value[key] = value[key].map(project);
    return value;
  }
  return project(z.toJSONSchema(schema));
}
