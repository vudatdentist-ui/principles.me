import { loadProductInsights } from "../features/analytics/product-insights";
import { closeDatabaseForTests } from "../lib/db/client";

const requestedDays = Number(process.argv[2] ?? "30");
const days = Number.isFinite(requestedDays) ? requestedDays : 30;

try {
  const insights = await loadProductInsights({ days });
  process.stdout.write(`${JSON.stringify(insights, null, 2)}\n`);
} finally {
  await closeDatabaseForTests();
}
