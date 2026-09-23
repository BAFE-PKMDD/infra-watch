import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { analyticsDailyAggregates, analyticsEvents } from "@/lib/db/schema";

export function getAnalyticsRetentionCutoffs(now = new Date()) {
  const currentManilaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const rawCutoffDate = new Date(`${currentManilaDate}T00:00:00.000Z`);
  rawCutoffDate.setUTCDate(rawCutoffDate.getUTCDate() - 90);
  const rawEventsBefore = new Date(`${rawCutoffDate.toISOString().slice(0, 10)}T00:00:00+08:00`);

  const aggregateDate = new Date(`${currentManilaDate}T00:00:00.000Z`);
  aggregateDate.setUTCFullYear(aggregateDate.getUTCFullYear() - 2);

  return {
    rawEventsBefore,
    dailyAggregatesBefore: aggregateDate.toISOString().slice(0, 10),
  };
}

export async function runCitizenAnalyticsMaintenance(now = new Date()) {
  const cutoffs = getAnalyticsRetentionCutoffs(now);

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      insert into ${analyticsDailyAggregates} (
        id, aggregate_date, metric_key, dimension_key, dimension_value,
        resource_type, resource_id, count, updated_at
      )
      select
        gen_random_uuid(),
        (timezone('Asia/Manila', ${analyticsEvents.occurredAt}))::date,
        ${analyticsEvents.eventName},
        'all', 'all', 'all', 'all', count(*)::integer, now()
      from ${analyticsEvents}
      where ${analyticsEvents.occurredAt} < ${cutoffs.rawEventsBefore}
      group by 2, 3
      on conflict (aggregate_date, metric_key, dimension_key, dimension_value, resource_type, resource_id)
      do update set count = excluded.count, updated_at = now()
    `);

    await tx.execute(sql`
      insert into ${analyticsDailyAggregates} (
        id, aggregate_date, metric_key, dimension_key, dimension_value,
        resource_type, resource_id, count, updated_at
      )
      select
        gen_random_uuid(),
        (timezone('Asia/Manila', ${analyticsEvents.occurredAt}))::date,
        ${analyticsEvents.eventName},
        'resource', 'project', 'project', ${analyticsEvents.resourceId}, count(*)::integer, now()
      from ${analyticsEvents}
      where ${analyticsEvents.occurredAt} < ${cutoffs.rawEventsBefore}
        and ${analyticsEvents.resourceId} is not null
      group by 2, 3, 7
      on conflict (aggregate_date, metric_key, dimension_key, dimension_value, resource_type, resource_id)
      do update set count = excluded.count, updated_at = now()
    `);

    await tx.execute(sql`
      insert into ${analyticsDailyAggregates} (
        id, aggregate_date, metric_key, dimension_key, dimension_value,
        resource_type, resource_id, count, updated_at
      )
      select
        gen_random_uuid(),
        (timezone('Asia/Manila', ${analyticsEvents.occurredAt}))::date,
        ${analyticsEvents.eventName},
        'result_count_band', ${analyticsEvents.resultCountBand}, 'all', 'all', count(*)::integer, now()
      from ${analyticsEvents}
      where ${analyticsEvents.occurredAt} < ${cutoffs.rawEventsBefore}
        and ${analyticsEvents.resultCountBand} is not null
      group by 2, 3, 5
      on conflict (aggregate_date, metric_key, dimension_key, dimension_value, resource_type, resource_id)
      do update set count = excluded.count, updated_at = now()
    `);

    await tx.delete(analyticsEvents).where(sql`${analyticsEvents.occurredAt} < ${cutoffs.rawEventsBefore}`);
    await tx.delete(analyticsDailyAggregates).where(sql`${analyticsDailyAggregates.aggregateDate} < ${cutoffs.dailyAggregatesBefore}`);
  });

  return cutoffs;
}
