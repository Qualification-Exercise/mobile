/**
 * Reads Jest's coverage-summary.json and prints the average of the four
 * total metrics (statements, branches, functions, lines).
 *
 * Requires the `json-summary` coverage reporter to have run first, which
 * writes coverage/coverage-summary.json.
 */
const fs = require('fs');
const path = require('path');

const summaryPath = path.join(
  __dirname,
  '..',
  'coverage',
  'coverage-summary.json',
);

if (!fs.existsSync(summaryPath)) {
  console.error(
    `Coverage summary not found at ${summaryPath}. Run the coverage step first.`,
  );
  process.exit(1);
}

const { total } = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const metrics = ['statements', 'branches', 'functions', 'lines'];
const pcts = metrics.map(m => total[m].pct);
const average = pcts.reduce((sum, pct) => sum + pct, 0) / pcts.length;

for (const m of metrics) {
  console.log(`  ${m.padEnd(12)} ${total[m].pct.toFixed(2)}%`);
}
console.log(`  ${'average'.padEnd(12)} ${average.toFixed(2)}%`);
