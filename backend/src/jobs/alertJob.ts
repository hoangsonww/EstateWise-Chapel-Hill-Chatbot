/**
 * Alert job – runs on a configurable interval and generates notifications
 * for saved searches whose criteria have been triggered.
 *
 * Detected events (per alertTypes on each saved search):
 *   new_match     – new property IDs appeared since the last snapshot
 *   price_drop    – price fell by >= priceDropPercent % or >= priceDropAmount $
 *   status_change – homeStatus field changed for a previously matched property
 *
 * Idempotency: each notification carries a deterministic `eventKey` so
 * duplicate events are silently discarded even if the job fires twice.
 */

import { queryProperties } from "../scripts/queryProperties";
import { SavedSearchService } from "../services/savedSearch.service";
import { NotificationService } from "../services/notification.service";
import Property from "../models/Property.model";
import { ISavedSearch } from "../models/SavedSearch.model";

const savedSearchService = new SavedSearchService();
const notificationService = new NotificationService();

// How many results to fetch per search run
const TOP_K = 20;

// Default price-drop thresholds if none set on the saved search
const DEFAULT_DROP_PERCENT = 5;

/**
 * Processes a single saved search: runs the query, diffs against the snapshot,
 * and emits notifications.
 */
async function processSavedSearch(search: ISavedSearch): Promise<void> {
  const searchId = (search as any)._id?.toString() ?? "";
  const userId = (search as any).userId?.toString() ?? "";

  let currentResults: { id: string; metadata: Record<string, any> }[];
  try {
    const raw = await queryProperties(search.query, TOP_K);
    currentResults = raw.map((r) => ({ id: r.id, metadata: r.metadata }));
  } catch (err) {
    console.error(`[alertJob] queryProperties failed for search ${searchId}:`, err);
    return;
  }

  const currentIds = currentResults.map((r) => r.id);
  const previousIds = new Set(search.lastResultIds);

  // ── new_match ─────────────────────────────────────────────────────────────
  if (search.alertTypes.includes("new_match")) {
    const newIds = currentIds.filter((id) => !previousIds.has(id));
    if (newIds.length > 0) {
      const dateTag = new Date().toISOString().slice(0, 10);
      const eventKey = `${searchId}_new_match_${dateTag}_${newIds.slice(0, 3).join("_")}`;
      await notificationService.createIfNotExists({
        userId,
        type: "new_match",
        title: `New listing${newIds.length > 1 ? "s" : ""} match "${search.name}"`,
        body: `${newIds.length} new propert${newIds.length > 1 ? "ies" : "y"} matched your saved search since your last check.`,
        metadata: {
          searchId,
          searchName: search.name,
          zpids: newIds,
          mapUrl: `/map?zpids=${newIds.join(",")}`,
        },
        eventKey,
      });
    }
  }

  // ── price_drop & status_change – need DB records for previous price/status ─
  if (
    search.alertTypes.includes("price_drop") ||
    search.alertTypes.includes("status_change")
  ) {
    // Only inspect properties that were already in the snapshot
    const watchedIds = currentIds.filter((id) => previousIds.has(id));
    if (watchedIds.length > 0) {
      const dbDocs = await Property.find({ zpid: { $in: watchedIds } })
        .select("zpid price homeStatus")
        .lean();

      for (const doc of dbDocs) {
        const zpid = String(doc.zpid);
        // Find the current Pinecone metadata for this zpid
        const current = currentResults.find((r) => r.id === zpid);
        if (!current) continue;

        const currentPrice = Number(current.metadata.price ?? 0);
        const dbPrice = Number(doc.price ?? 0);
        const currentStatus = String(current.metadata.homeStatus ?? "");
        const dbStatus = String(doc.homeStatus ?? "");

        // price_drop
        if (
          search.alertTypes.includes("price_drop") &&
          currentPrice > 0 &&
          dbPrice > 0 &&
          currentPrice < dbPrice
        ) {
          const dropAmount = dbPrice - currentPrice;
          const dropPercent = (dropAmount / dbPrice) * 100;
          const thresholdPct =
            search.priceDropPercent != null
              ? search.priceDropPercent
              : DEFAULT_DROP_PERCENT;
          const thresholdAmt = search.priceDropAmount ?? 0;

          if (dropPercent >= thresholdPct || dropAmount >= thresholdAmt) {
            const dateTag = new Date().toISOString().slice(0, 10);
            const eventKey = `${searchId}_price_drop_${zpid}_${dateTag}`;
            await notificationService.createIfNotExists({
              userId,
              type: "price_drop",
              title: `Price drop on a watched home`,
              body: `Price fell by $${dropAmount.toLocaleString()} (${dropPercent.toFixed(1)}%) for a property in "${search.name}".`,
              metadata: {
                searchId,
                zpid,
                oldPrice: dbPrice,
                newPrice: currentPrice,
                dropAmount,
                dropPercent: +dropPercent.toFixed(2),
                mapUrl: `/map?zpids=${zpid}`,
              },
              eventKey,
            });
          }
        }

        // status_change
        if (
          search.alertTypes.includes("status_change") &&
          currentStatus &&
          dbStatus &&
          currentStatus !== dbStatus
        ) {
          const dateTag = new Date().toISOString().slice(0, 10);
          const eventKey = `${searchId}_status_change_${zpid}_${dbStatus}_${currentStatus}_${dateTag}`;
          await notificationService.createIfNotExists({
            userId,
            type: "status_change",
            title: `Status change on a watched home`,
            body: `A property in "${search.name}" changed from ${dbStatus} → ${currentStatus}.`,
            metadata: {
              searchId,
              zpid,
              oldStatus: dbStatus,
              newStatus: currentStatus,
              mapUrl: `/map?zpids=${zpid}`,
            },
            eventKey,
          });
        }
      }
    }
  }

  // Persist the updated snapshot
  await savedSearchService.updateSnapshot(searchId, currentIds);
}

/**
 * Runs all due saved searches. Called by the scheduled interval.
 */
export async function runAlertJob(): Promise<void> {
  let dueSearches: ISavedSearch[];
  try {
    dueSearches = await savedSearchService.getDue();
  } catch (err) {
    console.error("[alertJob] Failed to fetch due saved searches:", err);
    return;
  }

  if (dueSearches.length === 0) return;

  console.log(`[alertJob] Processing ${dueSearches.length} due saved search(es)...`);
  for (const search of dueSearches) {
    await processSavedSearch(search).catch((err) =>
      console.error(`[alertJob] Error processing search ${(search as any)._id?.toString()}:`,
        err,
      ),
    );
  }
  console.log("[alertJob] Run complete.");
}

/**
 * Starts the alert job on a recurring interval.
 *
 * @param intervalMs How often to tick (default: 60 min).
 * @returns A NodeJS.Timeout handle that can be used to stop the job.
 */
export function startAlertJob(intervalMs = 60 * 60 * 1000): ReturnType<typeof setInterval> {
  console.log(
    `[alertJob] Starting – interval ${intervalMs / 60_000} min.`,
  );
  // Fire once soon after boot (offset by 30 s to let DB settle)
  const initialTimer = setTimeout(() => {
    runAlertJob().catch((err) =>
      console.error("[alertJob] Initial run error:", err),
    );
  }, 30_000);
  // Then on the regular interval
  const handle = setInterval(() => {
    runAlertJob().catch((err) =>
      console.error("[alertJob] Interval run error:", err),
    );
  }, intervalMs);

  // Prevent the initial timer from blocking process exit if the server shuts
  // down before it fires.
  (initialTimer as any).unref?.();
  (handle as any).unref?.();

  return handle;
}
