import { z } from 'zod';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { accountJson } from '../../../../lib/account-security';
import { database } from '../../../../lib/database-env';
import { PlanError } from '../../../../lib/account-plan';
const id = z.string().regex(/^\d{1,10}$/);
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const key = (user: string, player: string) => 'pm:player-note:' + user + ':' + player;
const fail = (error: unknown) => reply({ error: error instanceof PlanError ? error.message : 'No pudimos guardar tu nota.' }, error instanceof PlanError ? error.status : 503);
export async function GET(request: Request) {
    try {
        const user = await getChatGPTUser();
        if (!user)
            throw new PlanError(401, 'Iniciá sesión para usar notas privadas.');
        const player = id.safeParse(new URL(request.url).searchParams.get('player'));
        if (!player.success)
            throw new PlanError(400, 'Jugador inválido.');
        const row = await database.prepare('select payload from provider_cache where key=?').bind(key(user.userId, player.data)).first<{
            payload: string;
        }>();
        return reply(row ? JSON.parse(row.payload) : { note: '', updatedAt: null });
    }
    catch (error) {
        return fail(error);
    }
}
export async function POST(request: Request) {
    try {
        const user = await getChatGPTUser();
        if (!user)
            throw new PlanError(401, 'Iniciá sesión para usar notas privadas.');
        const parsed = z.object({ player: id, note: z.string().max(2000) }).strict().safeParse(await accountJson(request));
        if (!parsed.success)
            throw new PlanError(400, 'La nota debe tener hasta 2000 caracteres.');
        const payload = { note: parsed.data.note.trim(), updatedAt: new Date().toISOString() };
        if (!payload.note)
            await database.prepare('delete from provider_cache where key=?').bind(key(user.userId, parsed.data.player)).run();
        else
            await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at').bind(key(user.userId, parsed.data.player), JSON.stringify(payload), '2100-01-01T00:00:00Z').run();
        return reply(payload);
    }
    catch (error) {
        return fail(error);
    }
}
