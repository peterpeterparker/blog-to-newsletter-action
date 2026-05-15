import { z } from "zod";

export const NewsletterPayloadSchema = z.object({
  subject: z.string(),
  previewText: z.string(),
  html: z.string(),
  text: z.string(),
});
export type NewsletterPayload = z.infer<typeof NewsletterPayloadSchema>;

export const CampaignIdSchema = z.string();
export type CampaignId = z.infer<typeof CampaignIdSchema>;
