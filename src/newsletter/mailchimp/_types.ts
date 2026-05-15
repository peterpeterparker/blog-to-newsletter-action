import { z } from "zod";

const CreateCampaignSettingsSchema = z.object({
  subjectLine: z.string(),
  previewText: z.string(),
  fromName: z.string(),
  replyTo: z.string(),
});
export type CreateCampaignSettings = z.infer<typeof CreateCampaignSettingsSchema>;

const CreateCampaignRecipientsSchema = z.object({
  listId: z.string(),
});
export type CreateCampaignRecipients = z.infer<typeof CreateCampaignRecipientsSchema>;

const CreateCampaignArgsSchema = z.object({
  settings: CreateCampaignSettingsSchema,
  recipients: CreateCampaignRecipientsSchema,
});

export const CampaignResponseSchema = z.object({
  id: z.string(),
  // The ID used in the Mailchimp web application. View this campaign in your Mailchimp account at https://{dc}.admin.mailchimp.com/campaigns/show/?id={web_id}.
  web_id: z.number(),
});
export type CampaignResponse = z.infer<typeof CampaignResponseSchema>;

export const CreateCampaignCodec = z.codec(CreateCampaignArgsSchema, z.string(), {
  decode: ({ settings, recipients }) =>
    JSON.stringify({
      type: "regular",
      settings: {
        subject_line: settings.subjectLine,
        preview_text: settings.previewText,
        from_name: settings.fromName,
        reply_to: settings.replyTo,
        to_name: "*|FNAME|*",
      },
      recipients: {
        list_id: recipients.listId,
      },
    }),
  encode: (json) => JSON.parse(json),
});

const SetCampaignContentSchema = z.object({
  html: z.string(),
  plainText: z.string(),
});

export const SetCampaignContentCodec = z.codec(SetCampaignContentSchema, z.string(), {
  decode: ({ html, plainText }) =>
    JSON.stringify({
      html,
      plain_text: plainText,
    }),
  encode: (json) => JSON.parse(json),
});
