import { z } from "zod";

export function normalizeSenegalPhone(value) {
  const normalized = String(value || "").trim().replace(/[\s().-]/g, "");
  if (normalized.startsWith("00221")) return "+221" + normalized.slice(5);
  if (normalized.startsWith("221") && normalized.length === 12) return "+" + normalized;
  return normalized;
}

export function isValidSenegalPhone(value) {
  return /^(?:\+221)?[37]\d{8}$/.test(normalizeSenegalPhone(value));
}

const senegalPhoneSchema = z.string().trim().min(8).max(30)
  .transform(normalizeSenegalPhone)
  .refine(isValidSenegalPhone, "invalid_senegal_phone");
export const orderSchema = z.object({
  clientReference: z.string().trim().min(8).max(100),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: senegalPhoneSchema,
    location: z.string().trim().max(300).optional().default(""),
    details: z.string().trim().max(2000).optional().default(""),
    address: z.string().trim().max(300).optional().default("")
  }),
  items: z.array(z.object({ productId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(100) })).min(1).max(30),
  fulfillment: z.enum(["delivery","pickup"]),
  paymentMethod: z.enum(["cash","wave","orange_money"]),
  orderTiming: z.enum(["now","scheduled"]).default("now"),
  scheduledAt: z.string().datetime({ offset: true }).optional()
});
export const voiceRequestSchema = z.object({
  audioData: z.string().min(1).max(12 * 1024 * 1024),
  duration: z.number().finite().min(0).max(180),
  kind: z.enum(["order", "event"]),
  customer: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: senegalPhoneSchema
  }).strict()
}).strict();

export const eventSchema = z.object({
  type: z.string().trim().min(2).max(80),
  people: z.number().int().min(1).max(10000),
  date: z.string().date().refine(value => value >= new Date().toISOString().slice(0,10), "date_in_the_past"),
  phone: z.string().trim().min(8).max(30),
  location: z.string().trim().min(2).max(300),
  details: z.string().trim().max(2000).default("")
});