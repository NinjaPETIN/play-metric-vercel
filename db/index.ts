import {env} from "@/lib/database-env";
import {drizzle} from "drizzle-orm/d1";
import * as schema from "./schema";
export function getDb(){return drizzle(env.DB,{schema});}
