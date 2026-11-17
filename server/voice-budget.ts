// One atomic statement caps paid generations across all visitors and Worker isolates.
// Counts are deliberately not refunded on cancellation or upstream failure.
export const RESERVE_VOICE = `INSERT INTO voice_budget (id,total,hour,hour_count,day,day_count)
VALUES (1,1,?1,1,?2,1)
ON CONFLICT(id) DO UPDATE SET
 total=total+1, hour=?1, day=?2,
 hour_count=CASE WHEN hour=?1 THEN hour_count+1 ELSE 1 END,
 day_count=CASE WHEN day=?2 THEN day_count+1 ELSE 1 END
WHERE total<5000 AND (hour<>?1 OR hour_count<200) AND (day<>?2 OR day_count<500)
RETURNING total`;
export type VoiceDatabase={prepare(sql:string):{bind(...values:number[]):{first():Promise<unknown>}}};
export async function reserveVoice(db:VoiceDatabase|undefined,now=Date.now()):Promise<boolean>{
 if(!db)throw Error('Voice budget unavailable');
 return Boolean(await db.prepare(RESERVE_VOICE).bind(Math.floor(now/3600000),Math.floor(now/86400000)).first());
}
