import {z} from 'zod';
export const jobSchema=z.object({playerId:z.string().regex(/^\d{1,10}$/),season:z.number().int().min(2000).max(2100),competition:z.enum(['regular','preseason','playoffs'])});
const count=z.number().int().nonnegative().max(1000000),pct=z.number().min(0).max(1);
export const dataSchemas={zones:z.object({zones:z.array(z.object({key:z.enum(['rim','paint','mid','corner','arc']),label:z.string().max(50),attempts:count,made:count})).max(5)}),shots:z.object({totalAttempts:count,dribbleAttempts:count,dribbleMade:count,catchAttempts:count,catchMade:count}),passes:z.object({games:count,passes:count,assists:count}),defense:z.object({games:count,attempts:count,made:count,normalPct:pct.nullable()})};
