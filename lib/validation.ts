/**
 * Zod Validation Schemas
 * Centralized request/response validation for all API endpoints
 */

const z = {
  string: (options?: { min?: number; max?: number; email?: boolean; url?: boolean }) => ({
    parse: (val: any) => {
      if (typeof val !== 'string') throw new Error(`Expected string, got ${typeof val}`);
      if (options?.min && val.length < options.min) throw new Error(`String too short`);
      if (options?.max && val.length > options.max) throw new Error(`String too long`);
      if (options?.email && !val.includes('@')) throw new Error(`Invalid email`);
      if (options?.url && !val.startsWith('http')) throw new Error(`Invalid URL`);
      return val;
    },
  }),
  number: () => ({
    parse: (val: any) => {
      const num = Number(val);
      if (isNaN(num)) throw new Error(`Expected number, got ${typeof val}`);
      return num;
    },
  }),
  boolean: () => ({
    parse: (val: any) => {
      if (typeof val !== 'boolean') throw new Error(`Expected boolean, got ${typeof val}`);
      return val;
    },
  }),
  object: <T extends Record<string, any>>(shape: T) => ({
    parse: (val: any) => {
      if (typeof val !== 'object' || val === null) {
        throw new Error(`Expected object, got ${typeof val}`);
      }
      const result: any = {};
      for (const [key, schema] of Object.entries(shape)) {
        if (key in val) {
          result[key] = (schema as any).parse(val[key]);
        }
      }
      return result as { [K in keyof T]: any };
    },
  }),
  optional: (schema: any) => ({
    parse: (val: any) => {
      if (val === undefined || val === null) return undefined;
      return schema.parse(val);
    },
  }),
  array: (schema: any) => ({
    parse: (val: any) => {
      if (!Array.isArray(val)) throw new Error(`Expected array, got ${typeof val}`);
      return val.map((item: any) => schema.parse(item));
    },
  }),
};

// RAG Chat Validation
export const chatRequestSchema = z.object({
  question: z.string({ min: 1, max: 2000 }),
  userId: z.optional(z.string()),
  meetingId: z.optional(z.string()),
});

export const chatResponseSchema = z.object({
  answer: z.string(),
  sources: z.optional(z.array(z.object({
    meetingId: z.string(),
    content: z.string(),
  }))),
  error: z.optional(z.string()),
});

// Meeting Validation
export const createMeetingSchema = z.object({
  title: z.string({ min: 1, max: 255 }),
  description: z.optional(z.string({ max: 5000 })),
  startTime: z.string(),
  endTime: z.string(),
  attendees: z.optional(z.array(z.object({
    name: z.string(),
    email: z.string({ email: true }),
  }))),
});

export const updateMeetingSchema = z.object({
  title: z.optional(z.string({ min: 1, max: 255 })),
  description: z.optional(z.string({ max: 5000 })),
  actionItems: z.optional(z.array(z.object({
    text: z.string(),
    assignee: z.optional(z.string()),
    dueDate: z.optional(z.string()),
  }))),
});

// User Validation
export const userUpdateSchema = z.object({
  name: z.optional(z.string({ min: 1, max: 100 })),
  email: z.optional(z.string({ email: true })),
  botName: z.optional(z.string({ min: 1, max: 50 })),
  preferredChannelId: z.optional(z.string()),
});

// Integration Validation
export const integrationStatusSchema = z.object({
  platform: z.string({ min: 1 }),
  connected: z.boolean(),
  accessToken: z.optional(z.string()),
});

// Process Meeting for RAG
export const processRAGSchema = z.object({
  meetingId: z.string(),
  transcript: z.optional(z.string()),
  force: z.optional(z.boolean()),
});

// Generic error response
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.optional(z.string()),
  details: z.optional(z.object({})),
  timestamp: z.optional(z.string()),
});

/**
 * Validation utility
 */
export function validateRequest<T>(schema: any, data: unknown): { valid: true; data: T } | { valid: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { valid: true, data: parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validation failed';
    return { valid: false, error: message };
  }
}

/**
 * Type-safe schema helper
 */
export type ValidatedType<T> = T extends { parse: (v: any) => infer R } ? R : never;
