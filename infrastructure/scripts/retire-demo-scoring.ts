import { db, audit, lockWeek } from '../../apps/api/src/db';
import { recalculate } from '../../apps/api/src/scoring.service';

async function main() {
  await db.$transaction(async tx => {
    await lockWeek(tx, 2026, 1);
    const events = await tx.kickingEvent.findMany({ where: { season: 2026, week: 1, provider: 'csv',
      providerEventId: { in: ['demo-buf-1', 'demo-buf-2', 'demo-dal-1', 'demo-kc-1', 'demo-phi-1'] }, voidedAt: null } });
    for (const event of events) {
      await tx.kickingEvent.update({ where: { id: event.id }, data: { voidedAt: new Date() } });
      await audit(tx, 'SYSTEM', 'EVENT_VOIDED', event.id, 'Retire seed demonstration scores before live ESPN scoring', event, { voided: true });
    }
    if (events.length) await recalculate(tx, 2026, 1);
    console.log(`Retired ${events.length} demo scoring events; historical seasons preserved`);
  });
}
void main().finally(() => db.$disconnect());
