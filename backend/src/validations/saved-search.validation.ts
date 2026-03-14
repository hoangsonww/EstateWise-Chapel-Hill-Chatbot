import { z } from "zod";
import {
  ValidationResult,
  convertZodErrors,
} from "./default.validation";

const AlertTypeEnum = z.enum(["new_match", "price_drop", "status_change"]);
const FrequencyEnum = z.enum(["hourly", "daily", "custom"]);

const CreateSavedSearchSchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(120, "Name cannot exceed 120 characters")
    .trim(),
  query: z.string().min(1, "Query cannot be empty").trim(),
  filters: z.record(z.string(), z.unknown()).optional(),
  frequency: FrequencyEnum.default("daily").optional(),
  alertTypes: z
    .array(AlertTypeEnum)
    .min(1, "At least one alert type is required")
    .default(["new_match"])
    .optional(),
  priceDropPercent: z.number().min(0).max(100).optional(),
  priceDropAmount: z.number().min(0).optional(),
});

const UpdateSavedSearchSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name cannot be empty")
      .max(120, "Name cannot exceed 120 characters")
      .trim()
      .optional(),
    query: z.string().min(1, "Query cannot be empty").trim().optional(),
    filters: z.record(z.string(), z.unknown()).optional(),
    frequency: FrequencyEnum.optional(),
    alertTypes: z.array(AlertTypeEnum).min(1).optional(),
    priceDropPercent: z.number().min(0).max(100).optional(),
    priceDropAmount: z.number().min(0).optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some((v) => v !== undefined),
    { message: "At least one field must be provided for update" },
  );

export const validateCreateSavedSearch = (data: unknown): ValidationResult => {
  try {
    CreateSavedSearchSchema.parse(data);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: convertZodErrors(error) };
    }
    return {
      isValid: false,
      errors: [{ field: "body", message: "Invalid request data" }],
    };
  }
};

export const validateUpdateSavedSearch = (data: unknown): ValidationResult => {
  try {
    UpdateSavedSearchSchema.parse(data);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: convertZodErrors(error) };
    }
    return {
      isValid: false,
      errors: [{ field: "body", message: "Invalid request data" }],
    };
  }
};
