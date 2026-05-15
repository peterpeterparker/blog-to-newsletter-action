import { z } from "zod";

const AnthropicMessageSchema = z.object({
  model: z.string(),
  maxTokens: z.number(),
  content: z.string(),
});

export const AnthropicMessageCodec = z.codec(AnthropicMessageSchema, z.string(), {
  decode: ({ model, maxTokens, content }) =>
    JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  encode: (json) => JSON.parse(json),
});

export const AnthropicResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
    }),
  ),
});
export type AnthropicResponse = z.infer<typeof AnthropicResponseSchema>;
