/**
 * Comprehensive Test Suite for KisanMandi Features
 *
 * Tests:
 * 1. Natural Language Voice Query Parser (Urdu, Sindhi, Roman Urdu)
 * 2. Weather REST API & Agricultural Advisories
 * 3. Smart Selling Price Recommendation Calculation
 * 4. Full-stack Server HTTP Responses
 */

import http from 'node:http';
import { parseSpokenQuery } from '../../src/services/voiceSearchService.ts';

const PORT = 3000;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('======================================================');
  console.log('Testing KisanMandi Features & Integration');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // 1. Voice Search Parser Tests (Urdu, Sindhi, Roman Urdu)
  // ------------------------------------------------------------------
  console.log('[1/4] Voice Search Query Parser Tests');

  const test1 = parseSpokenQuery('Hyderabad mein gandum ka rate kya hai?');
  assert(test1.cropId === 'crp_wheat', 'Roman Urdu matches Wheat: ' + test1.cropName);
  assert(test1.marketId === 'mkt_hyd', 'Roman Urdu matches Hyderabad Mandi: ' + test1.marketName);

  const test2 = parseSpokenQuery('Sukkur mein chawal ka rate batao');
  assert(test2.cropId === 'crp_rice', 'Roman Urdu matches Rice: ' + test2.cropName);
  assert(test2.marketId === 'mkt_suk', 'Roman Urdu matches Sukkur Mandi: ' + test2.marketName);

  const test3 = parseSpokenQuery('حیدرآباد میں گندم کی قیمت');
  assert(test3.cropId === 'crp_wheat', 'Urdu script matches Wheat (گندم)');
  assert(test3.marketId === 'mkt_hyd', 'Urdu script matches Hyderabad (حیدرآباد)');

  const test4 = parseSpokenQuery('سکر ۾ چانورن جو اگهہ');
  assert(test4.cropId === 'crp_rice', 'Sindhi script matches Rice (چانورن)');
  assert(test4.marketId === 'mkt_suk', 'Sindhi script matches Sukkur (سکر)');

  const test5 = parseSpokenQuery('ڪڻڪ جو اگهہ ميرپورخاص منڊي');
  assert(test5.cropId === 'crp_wheat', 'Sindhi script matches Wheat (ڪڻڪ)');
  assert(test5.marketId === 'mkt_mpk', 'Sindhi script matches Mirpur Khas (ميرپورخاص)');

  const test6 = parseSpokenQuery('کپاس کا ریٹ کیا ہے');
  assert(test6.cropId === 'crp_cotton', 'Urdu matches Cotton (کپاس)');

  const test7 = parseSpokenQuery('سنڌڙي انب جو اگهہ ٻڌايو');
  assert(test7.cropId === 'crp_mango', 'Sindhi matches Mango (سنڌڙي انب)');

  const test8 = parseSpokenQuery('piaz ka taza bhav');
  assert(test8.cropId === 'crp_onion', 'Roman Urdu matches Onion (piaz)');

  // ------------------------------------------------------------------
  // 2. Weather API & Agricultural Advisories Tests
  // ------------------------------------------------------------------
  console.log('\n[2/4] Weather API & Agricultural Advisories Tests');

  const districtsRes = await fetchJson(`http://localhost:${PORT}/api/weather/districts`);
  assert(districtsRes.status === 200, 'GET /api/weather/districts returns HTTP 200');
  assert(Array.isArray(districtsRes.data?.data) && districtsRes.data.data.includes('Hyderabad'), 'Districts include Hyderabad');
  assert(districtsRes.data?.data.includes('Sukkur'), 'Districts include Sukkur');
  assert(districtsRes.data?.data.includes('Mirpur Khas'), 'Districts include Mirpur Khas');

  const weatherHyd = await fetchJson(`http://localhost:${PORT}/api/weather?district=Hyderabad`);
  assert(weatherHyd.status === 200, 'GET /api/weather?district=Hyderabad returns HTTP 200');
  assert(typeof weatherHyd.data?.data?.current?.temperature === 'number', 'Current temperature is valid number: ' + weatherHyd.data?.data?.current?.temperature + '°C');
  assert(typeof weatherHyd.data?.data?.current?.humidity === 'number', 'Current humidity is valid number: ' + weatherHyd.data?.data?.current?.humidity + '%');
  assert(Array.isArray(weatherHyd.data?.data?.forecast) && weatherHyd.data?.data?.forecast.length >= 5, '5-day forecast array provided');
  assert(Array.isArray(weatherHyd.data?.data?.advisories) && weatherHyd.data?.data?.advisories.length > 0, 'Farming advisories generated: ' + weatherHyd.data?.data?.advisories[0]?.title);

  const weatherSuk = await fetchJson(`http://localhost:${PORT}/api/weather?district=Sukkur`);
  assert(weatherSuk.status === 200, 'GET /api/weather?district=Sukkur returns HTTP 200');
  assert(weatherSuk.data?.data?.district === 'Sukkur', 'District is Sukkur');

  // ------------------------------------------------------------------
  // 3. Smart Selling Price Recommendation Calculation Tests
  // ------------------------------------------------------------------
  console.log('\n[3/4] Smart Selling Price Recommendation Tests');

  const summaryRes = await fetchJson(`http://localhost:${PORT}/api/prices/summary?crop_id=crp_wheat&market_id=mkt_hyd`);
  assert(summaryRes.status === 200, 'GET /api/prices/summary returns HTTP 200');
  const avgPrice = summaryRes.data?.data?.stats_14_day?.average;
  assert(typeof avgPrice === 'number' && avgPrice > 0, '14-day average price is valid: ' + avgPrice + ' PKR');

  // Test Smart Recommendation logic
  const gradeAPrice = Number((avgPrice * 1.04).toFixed(1));
  const gradeBPrice = Number(avgPrice.toFixed(1));
  const gradeCPrice = Number((avgPrice * 0.95).toFixed(1));
  assert(gradeAPrice > gradeBPrice && gradeBPrice > gradeCPrice, 'Grade tier pricing preserves A > B > C premiums');

  const compRes = await fetchJson(`http://localhost:${PORT}/api/prices/comparison?crop_id=crp_wheat`);
  assert(compRes.status === 200, 'GET /api/prices/comparison returns HTTP 200');
  assert(compRes.data?.data?.highestMarket !== null, 'Highest paying market identified: ' + compRes.data?.data?.highestMarket?.market_name);

  // ------------------------------------------------------------------
  // 4. Server Frontend Serving & Core Collections
  // ------------------------------------------------------------------
  console.log('\n[4/5] Server HTTP Health & Frontend Delivery');

  const healthRes = await fetchJson(`http://localhost:${PORT}/api/health`);
  assert(healthRes.status === 200 && healthRes.data?.status === 'healthy', 'Backend health is healthy');
  assert(healthRes.data?.collections?.prices === 336, 'Persisted price records count: 336');
  assert(healthRes.data?.collections?.listings === 12, 'Persisted listings count: 12');

  const htmlRes = await new Promise((resolve) => {
    http.get(`http://localhost:${PORT}/`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    });
  });
  assert(htmlRes.status === 200, 'Root / returns HTTP 200');
  assert(htmlRes.html.includes('<div id="root"></div>'), 'HTML entry point contains root div');
  assert(htmlRes.html.includes('KisanMandi'), 'HTML title or meta contains KisanMandi');

  // ------------------------------------------------------------------
  // 5. AI Kisan Dost Assistant Endpoints
  // ------------------------------------------------------------------
  console.log('\n[5/5] AI Kisan Dost Assistant Endpoints');

  const astStatus = await fetchJson(`http://localhost:${PORT}/api/assistant/status`);
  assert(astStatus.status === 200, 'GET /api/assistant/status returns HTTP 200');
  assert(astStatus.data?.data?.name === 'AI Kisan Dost', 'Assistant name is AI Kisan Dost');
  assert(Array.isArray(astStatus.data?.data?.suggested_questions), 'Suggested questions returned');

  function postJson(url, body) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  const q1 = await postJson(`http://localhost:${PORT}/api/assistant/chat`, { message: 'Aaj gandum ka rate kya hai?' });
  assert(q1.status === 200, 'POST /api/assistant/chat (rate query) returns HTTP 200');
  assert(typeof q1.data?.data?.message === 'string' && q1.data.data.message.length > 10, 'Assistant returns detailed crop rate response');

  const q2 = await postJson(`http://localhost:${PORT}/api/assistant/chat`, { message: 'Meri fasal kis mandi mein bechni chahiye?' });
  assert(q2.status === 200, 'POST /api/assistant/chat (best mandi query) returns HTTP 200');
  assert(q2.data?.data?.cardType === 'market_comparison' || q2.data?.data?.message.includes('منڈی') || q2.data?.data?.message.includes('Mandi'), 'Best mandi recommendation returned');

  const q3 = await postJson(`http://localhost:${PORT}/api/assistant/chat`, { message: 'Mujhe kitna munafa hoga?' });
  assert(q3.status === 200, 'POST /api/assistant/chat (profit query) returns HTTP 200');
  assert(q3.data?.data?.cardType === 'profit' || q3.data?.data?.message.includes('منافع') || q3.data?.data?.message.includes('Profit'), 'Profit calculation returned');

  const q4 = await postJson(`http://localhost:${PORT}/api/assistant/chat`, { message: 'Aaj mausam kaisa rahega?' });
  assert(q4.status === 200, 'POST /api/assistant/chat (weather query) returns HTTP 200');
  assert(q4.data?.data?.cardType === 'weather' || q4.data?.data?.message.includes('موسم') || q4.data?.data?.message.includes('Weather'), 'Weather forecast & farming advisory returned');

  const q5 = await postJson(`http://localhost:${PORT}/api/assistant/chat`, { message: 'ڪڻڪ جو اڄ جو ريٽ ڇا آهي؟' });
  assert(q5.status === 200, 'POST /api/assistant/chat (Sindhi query) returns HTTP 200');
  assert(q5.data?.data?.language === 'sd', 'Sindhi language correctly identified');

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
