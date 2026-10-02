import { z } from "zod";
export const orderSchema = z.object({
  customer: z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().min(8).max(30), address: z.string().trim().max(300).optional().default("") }),
  items: z.array(z.object({ productId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(100) })).min(1).max(30),
  fulfillment: z.enum(["delivery", "pickup"]),
  paymentMethod: z.enum(["cash", "wave", "orange_money"])
});
export const eventSchema = z.object({ type: z.string().trim().min(2).max(80), people: z.number().int().min(1).max(10000), date: z.string().date(), phone: z.string().trim().min(8).max(30) });
