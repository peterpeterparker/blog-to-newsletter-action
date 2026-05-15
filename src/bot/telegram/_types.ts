// _types.ts
import { z } from "zod";

const InlineKeyboardButtonSchema = z.object({
  text: z.string(),
  callbackData: z.string(),
});

const InlineKeyboardButtonsSchema = z.array(InlineKeyboardButtonSchema);

const InlineKeyboardSchema = z.array(InlineKeyboardButtonsSchema);
export type InlineKeyboard = z.infer<typeof InlineKeyboardSchema>;

const SendMessageSchema = z.object({
  chatId: z.string(),
  text: z.string(),
  inlineKeyboard: z.array(InlineKeyboardButtonsSchema),
});

export const SendMessageCodec = z.codec(SendMessageSchema, z.string(), {
  decode: ({ chatId, text, inlineKeyboard }) =>
    JSON.stringify({
      chat_id: chatId,
      parse_mode: "HTML",
      text,
      reply_markup: {
        inline_keyboard: inlineKeyboard.map((row) =>
          row.map(({ text, callbackData }) => ({
            text,
            callback_data: callbackData,
          })),
        ),
      },
    }),
  encode: (json) => JSON.parse(json),
});

export const TestEmailsSchema = z.nullable(z.array(z.email()).max(5));
