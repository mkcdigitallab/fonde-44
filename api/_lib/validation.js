import { z } from "zod";
export const orderSchema = z.object({
  clientReference: z.string().trim().min(8).max(100),
  customer: z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().min(8).max(30), location: z.string().trim().min(2).max(300).optional().default(""), details: z.string().trim().max(2000).optional().default(""), address: z.string().trim().max(300).optional().default("") }),
  items: z.array(z.object({ productId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(100) })).min(1).max(30),
  fulfillment: z.enum(["delivery", "pickup"]),
  paymentMethod: z.enum(["cash", "wave", "orange_money"])
});
export const eventSchema = z.object({ type: z.string().trim().min(2).max(80), people: z.number().int().min(1).max(10000), date: z.string().date().refine(value => value >= new Date().toISOString().slice(0, 10), "date_in_the_past"), phone: z.string().trim().min(8).max(30) });
