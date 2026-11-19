import {z} from 'zod';
import {reportPath} from './report-context';
export {reportPath} from './report-context';
export const problemReportSchema=z.object({description:z.string().trim().min(10).max(1000),path:z.string().max(8000).transform(reportPath),image:z.string().max(180000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/).optional()}).strict();
