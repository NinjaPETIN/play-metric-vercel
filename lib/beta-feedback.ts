import {z} from 'zod';
export const betaFeedbackSchema=z.object({tasks:z.array(z.boolean()).length(5),ease:z.number().int().min(1).max(5),note:z.string().trim().max(500)}).strict();
