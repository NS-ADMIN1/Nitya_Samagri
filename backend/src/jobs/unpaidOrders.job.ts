// src/jobs/unpaidOrders.job.ts
//
// Every few minutes: cancel online-payment orders that were never paid, so
// the stock and coupon they were holding go back on sale. How long an order
// may stay unpaid is UNPAID_ORDER_MINUTES (config/env.ts).
//
// Safe with more than one API instance running — each order is re-checked
// and cancelled inside a transaction, so it is only ever cancelled once.
import { cancelUnpaidOrders } from "../modules/orders/order.service";
import { logger } from "../utils/logger";

const EVERY_MS = 5 * 60 * 1000;

let timer: NodeJS.Timeout | undefined;
let running = false;

async function run() {
  if (running) return; // the previous run is still going
  running = true;
  try {
    const cancelled = await cancelUnpaidOrders();
    if (cancelled > 0) logger.info(`Cancelled ${cancelled} unpaid order(s) and released their stock`);
  } catch (err) {
    logger.error("Unpaid-order job failed", { err });
  } finally {
    running = false;
  }
}

export function startUnpaidOrdersJob(): void {
  if (timer) return;
  timer = setInterval(run, EVERY_MS);
  timer.unref(); // never keeps the process alive on its own
  logger.info("Unpaid-order job started");
}

export function stopUnpaidOrdersJob(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
