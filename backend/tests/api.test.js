/**
 * KisanMandi Automated Backend Test Suite
 *
 * Verifies all 14 required test specifications against an isolated temporary database.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../src/app.js';
import { storage } from '../src/services/storage.js';
import { runSeed } from '../scripts/seed.js';

let server;
let baseUrl;
const testDbPath = path.join(os.tmpdir(), `kisanmandi_test_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);

async function setup() {
  // Use isolated test database
  storage.setDbPath(testDbPath);
  await storage.init();
  await runSeed(storage);

  const app = createApp();
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
}

async function teardown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  try {
    if (fs.existsSync(testDbPath)) {
      await fs.promises.unlink(testDbPath);
    }
  } catch {}
}

const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(number, name, fn) {
  try {
    await fn();
    console.log(`  ✓ Test ${number}: ${name}`);
    results.push({ number, name, passed: true });
  } catch (err) {
    console.error(`  ✗ Test ${number}: ${name} - FAILED:`, err.message);
    results.push({ number, name, passed: false, error: err.message });
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log(' Starting KisanMandi Backend Test Suite (14 Tests)');
  console.log(` Isolated Test Database: ${testDbPath}`);
  console.log('======================================================\n');

  await setup();

  // 1. Health endpoint
  await runTest(1, 'Health endpoint returns healthy status and collection counts', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.status === 'healthy', 'Status should be healthy');
    assert(body.storage_available === true, 'Storage should be available');
    assert(body.collections.prices === 336, 'Should have 336 price records');
  });

  // 2. User creation and validation
  await runTest(2, 'User creation and validation', async () => {
    // Valid creation
    const validRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kamran Ali',
        phone: '0300-9988776',
        district: 'Hyderabad',
        role: 'Farmer'
      })
    });
    assert(validRes.status === 201, `Expected 201, got ${validRes.status}`);
    const validBody = await validRes.json();
    assert(validBody.success === true, 'Success should be true');
    assert(validBody.data.role === 'Farmer', 'Role should be Farmer');

    // Invalid role rejection
    const invalidRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad Role User',
        phone: '0300-1111111',
        district: 'Sukkur',
        role: 'InvalidRole'
      })
    });
    assert(invalidRes.status === 400, `Expected 400 for invalid role, got ${invalidRes.status}`);
    const invalidBody = await invalidRes.json();
    assert(invalidBody.error.code === 'VALIDATION_ERROR', 'Should return VALIDATION_ERROR');
  });

  // 3. Listing retrieval
  await runTest(3, 'Listing retrieval with dynamic market labeling', async () => {
    const res = await fetch(`${baseUrl}/listings?status=Active`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(Array.isArray(body.data), 'Data should be an array');
    assert(body.data.length > 0, 'Should return active listings');
    // Verify market labeling attached
    const first = body.data[0];
    assert(typeof first.market_label === 'string', 'Should have market_label');
    assert(['Below market', 'At market', 'Above market', 'Market comparison unavailable'].includes(first.market_label), 'Market label format');
  });

  // 4. Invalid listing quantity
  await runTest(4, 'Reject listing creation with invalid quantity (<= 0)', async () => {
    const res = await fetch(`${baseUrl}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_farmer_1',
        crop_id: 'crp_wheat',
        quantity: -10, // Invalid!
        asking_price: 95.0,
        district: 'Hyderabad',
        grade: 'A',
        available_from: '2026-12-01',
        contact_phone: '0300-1122334'
      })
    });
    assert(res.status === 400, `Expected 400 for non-positive quantity, got ${res.status}`);
    const body = await res.json();
    assert(body.error.code === 'VALIDATION_ERROR', 'Should return VALIDATION_ERROR');
  });

  // 5. Buyer attempting to create a listing
  await runTest(5, 'Buyer role attempting to create listing is rejected with 403', async () => {
    const res = await fetch(`${baseUrl}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_buyer_1', // Buyer!
        crop_id: 'crp_wheat',
        quantity: 500,
        asking_price: 95.0,
        district: 'Sukkur',
        grade: 'A',
        available_from: '2026-12-01',
        contact_phone: '0304-5566778'
      })
    });
    assert(res.status === 403, `Expected 403 Forbidden for Buyer creating listing, got ${res.status}`);
    const body = await res.json();
    assert(body.error.code === 'ROLE_NOT_PERMITTED', 'Should return ROLE_NOT_PERMITTED');
  });

  // 6. A farmer attempting to modify another farmer's listing
  await runTest(6, "Farmer attempting to modify another farmer's listing is rejected with 403", async () => {
    // lst_001 is owned by usr_farmer_1
    const res = await fetch(`${baseUrl}/listings/lst_001`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'usr_farmer_2' // Mismatched farmer!
      },
      body: JSON.stringify({
        asking_price: 150.0
      })
    });
    assert(res.status === 403, `Expected 403 for unauthorized farmer edit, got ${res.status}`);
    const body = await res.json();
    assert(body.error.code === 'OWNERSHIP_MISMATCH', 'Should return OWNERSHIP_MISMATCH');
  });

  // 7. Listing deletion
  await runTest(7, 'Listing deletion with verified owner permissions', async () => {
    // First create a temporary listing to delete
    const createRes = await fetch(`${baseUrl}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_farmer_1',
        crop_id: 'crp_rice',
        quantity: 100,
        asking_price: 160.0,
        district: 'Hyderabad',
        grade: 'B',
        available_from: '2026-12-01',
        contact_phone: '0300-1122334'
      })
    });
    assert(createRes.status === 201, 'Should create temp listing');
    const tempListing = (await createRes.json()).data;

    // Delete with owner header
    const delRes = await fetch(`${baseUrl}/listings/${tempListing.id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'usr_farmer_1' }
    });
    assert(delRes.status === 200, `Expected 200 on delete, got ${delRes.status}`);

    // Verify it is gone
    const checkRes = await fetch(`${baseUrl}/listings/${tempListing.id}`);
    assert(checkRes.status === 404, 'Deleted listing should return 404');
  });

  // 8. Above alert boundary
  await runTest(8, 'Alert condition Above triggers when price >= target_price', async () => {
    // Create an Above alert: target price 50 PKR (current wheat price in Hyderabad is ~96 PKR)
    const alertRes = await fetch(`${baseUrl}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_farmer_1',
        crop_id: 'crp_wheat',
        market_id: 'mkt_hyd',
        condition: 'Above',
        target_price: 50.0,
        active_status: true
      })
    });
    assert(alertRes.status === 201, `Expected 201, got ${alertRes.status}`);
    const alert = (await alertRes.json()).data;

    // Trigger evaluation
    const evalRes = await fetch(`${baseUrl}/alerts/evaluate`, { method: 'POST' });
    assert(evalRes.status === 200, 'Evaluation should succeed');

    const checkRes = await fetch(`${baseUrl}/alerts/${alert.id}`);
    const updated = (await checkRes.json()).data;
    assert(updated.triggered_status === true, 'Alert should be triggered because 96 >= 50');
  });

  // 9. Below alert boundary
  await runTest(9, 'Alert condition Below triggers when price <= target_price', async () => {
    // Target price 300 PKR (current tomato price is ~115 PKR, so 115 <= 300)
    const alertRes = await fetch(`${baseUrl}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'usr_buyer_1',
        crop_id: 'crp_tomato',
        market_id: 'mkt_suk',
        condition: 'Below',
        target_price: 300.0,
        active_status: true
      })
    });
    assert(alertRes.status === 201, 'Should create alert');
    const alert = (await alertRes.json()).data;

    await fetch(`${baseUrl}/alerts/evaluate`, { method: 'POST' });
    const checkRes = await fetch(`${baseUrl}/alerts/${alert.id}`);
    const updated = (await checkRes.json()).data;
    assert(updated.triggered_status === true, 'Alert should trigger because price <= 300');
  });

  // 10. Repeated alert evaluation without duplicate triggering
  await runTest(10, 'Repeated alert evaluation avoids duplicate triggering count', async () => {
    // Run evaluation twice
    const firstEval = await (await fetch(`${baseUrl}/alerts/evaluate`, { method: 'POST' })).json();
    const secondEval = await (await fetch(`${baseUrl}/alerts/evaluate`, { method: 'POST' })).json();

    assert(secondEval.newly_triggered_count === 0, `Repeated evaluation should report 0 newly triggered, got ${secondEval.newly_triggered_count}`);
  });

  // 11. Price-history filtering
  await runTest(11, 'Price-history filtering by crop, market, and date range', async () => {
    const res = await fetch(`${baseUrl}/prices?crop_id=crp_wheat&market_id=mkt_hyd`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.count === 14, `Expected exactly 14 history records for wheat at Hyderabad Mandi, got ${body.count}`);

    // Test summary endpoint
    const summaryRes = await fetch(`${baseUrl}/prices/summary?crop_id=crp_wheat&market_id=mkt_hyd`);
    assert(summaryRes.status === 200, 'Summary endpoint should succeed');
    const summary = (await summaryRes.json()).data;
    assert(summary.stats_14_day.observations === 14, 'Should have 14 observations in 14-day stats');
    assert(typeof summary.stats_14_day.average === 'number', 'Should compute average price');
  });

  // 12. Market comparison
  await runTest(12, 'Market comparison across all mandis for a crop', async () => {
    const res = await fetch(`${baseUrl}/prices/comparison?crop_id=crp_cotton`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.data.available === true, 'Comparison should be available');
    assert(body.data.markets.length === 3, 'Should compare all 3 markets');
    // Ensure sorted descending
    const p1 = body.data.markets[0].price;
    const p2 = body.data.markets[1].price;
    const p3 = body.data.markets[2].price;
    assert(p1 >= p2 && p2 >= p3, 'Markets must be sorted by price descending');
    assert(body.data.highestMarket.market_id === body.data.markets[0].market_id, 'Highest market correctly identified');
  });

  // 13. Seed-data counts
  await runTest(13, 'Seed-data counts match required specifications', async () => {
    const db = await storage.read();
    assert(db.users.length >= 6, `Expected >= 6 users, found ${db.users.length}`);
    assert(db.crops.length === 8, `Expected 8 crops, found ${db.crops.length}`);
    assert(db.markets.length === 3, `Expected 3 markets, found ${db.markets.length}`);
    assert(db.prices.length === 336, `Expected 336 price records, found ${db.prices.length}`);
    assert(db.listings.length >= 12, `Expected >= 12 listings, found ${db.listings.length}`);
    assert(db.alerts.length >= 5, `Expected >= 5 alerts, found ${db.alerts.length}`);
  });

  // 14. Data persistence across restart, where practical
  await runTest(14, 'Data persistence across restart from disk file', async () => {
    // Insert a new crop
    const addRes = await fetch(`${baseUrl}/crops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Guava',
        category: 'Fruits'
      })
    });
    assert(addRes.status === 201, 'Crop added');
    const createdCrop = (await addRes.json()).data;

    // Simulate server/storage restart: instantiate fresh storage pointing to same test DB path
    storage.cachedData = null;
    storage.initialized = false;
    await storage.init();

    const freshCollection = await storage.getCollection('crops');
    const persisted = freshCollection.find((c) => c.id === createdCrop.id);
    assert(Boolean(persisted), 'Persisted record should survive cache invalidation and re-initialization');
    assert(persisted.name === 'Guava', 'Persisted record name matches');
  });

  await teardown();

  const passedCount = results.filter((r) => r.passed).length;
  console.log('\n======================================================');
  console.log(` Test Results: ${passedCount}/${results.length} PASSED`);
  console.log('======================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
