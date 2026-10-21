/**
 * KisanMandi Repeatable & Idempotent Database Seed Script
 *
 * Seed targets:
 * - 8 crops (Grains, Cash Crops, Vegetables, Fruits)
 * - 3 markets (Hyderabad, Sukkur, Mirpur Khas)
 * - 6 fictional users (4 Farmers, 2 Buyers)
 * - Exactly 336 price records (8 crops × 3 markets × 14 consecutive daily observations)
 * - 12 valid produce listings
 * - 5 price alerts
 */

import { storage } from '../src/services/storage.js';
import { getRelativeDate } from '../src/utils/dateUtils.js';

export async function runSeed(customStorage = storage) {
  console.log('[Seed] Initializing storage at:', customStorage.getDbPath());
  await customStorage.init();

  // 1. Fixed deterministic IDs for consistent relationships
  const users = [
    {
      id: 'usr_farmer_1',
      name: 'Rasheed Ahmed Brohi',
      phone: '0300-1122334',
      district: 'Hyderabad',
      role: 'Farmer'
    },
    {
      id: 'usr_farmer_2',
      name: 'Ghulam Mustafa Soomro',
      phone: '0301-2233445',
      district: 'Sukkur',
      role: 'Farmer'
    },
    {
      id: 'usr_farmer_3',
      name: 'Allah Dino Chandio',
      phone: '0302-3344556',
      district: 'Mirpur Khas',
      role: 'Farmer'
    },
    {
      id: 'usr_farmer_4',
      name: 'Naseer Jamali',
      phone: '0303-4455667',
      district: 'Hyderabad',
      role: 'Farmer'
    },
    {
      id: 'usr_buyer_1',
      name: 'Tariq Mehmood Traders',
      phone: '0304-5566778',
      district: 'Sukkur',
      role: 'Buyer'
    },
    {
      id: 'usr_buyer_2',
      name: 'Sindh Agri Wholesalers',
      phone: '0305-6677889',
      district: 'Hyderabad',
      role: 'Buyer'
    }
  ];

  // 2. 8 Crops across 4 categories
  const crops = [
    { id: 'crp_wheat', name: 'Wheat', category: 'Grains' },
    { id: 'crp_rice', name: 'Rice (Basmati)', category: 'Grains' },
    { id: 'crp_cotton', name: 'Cotton', category: 'Cash Crops' },
    { id: 'crp_sugarcane', name: 'Sugarcane', category: 'Cash Crops' },
    { id: 'crp_onion', name: 'Onion', category: 'Vegetables' },
    { id: 'crp_tomato', name: 'Tomato', category: 'Vegetables' },
    { id: 'crp_mango', name: 'Mango (Sindhri)', category: 'Fruits' },
    { id: 'crp_banana', name: 'Banana', category: 'Fruits' }
  ];

  // 3. 3 Mandis / Markets
  const markets = [
    { id: 'mkt_hyd', name: 'Hyderabad Mandi', district: 'Hyderabad' },
    { id: 'mkt_suk', name: 'Sukkur Mandi', district: 'Sukkur' },
    { id: 'mkt_mpk', name: 'Mirpur Khas Mandi', district: 'Mirpur Khas' }
  ];

  // Base plausible price benchmarks in PKR/kg per crop and market
  const basePrices = {
    crp_wheat: { mkt_hyd: 96, mkt_suk: 92, mkt_mpk: 94 },
    crp_rice: { mkt_hyd: 155, mkt_suk: 162, mkt_mpk: 158 },
    crp_cotton: { mkt_hyd: 215, mkt_suk: 228, mkt_mpk: 220 },
    crp_sugarcane: { mkt_hyd: 16.5, mkt_suk: 15.0, mkt_mpk: 16.0 },
    crp_onion: { mkt_hyd: 82, mkt_suk: 78, mkt_mpk: 86 },
    crp_tomato: { mkt_hyd: 115, mkt_suk: 125, mkt_mpk: 110 },
    crp_mango: { mkt_hyd: 210, mkt_suk: 195, mkt_mpk: 230 },
    crp_banana: { mkt_hyd: 95, mkt_suk: 105, mkt_mpk: 90 }
  };

  // 4. Generate exactly 336 price records: 8 crops × 3 markets × 14 consecutive dates
  // 14 consecutive dates from (today - 13) to (today - 0)
  const prices = [];
  const consecutiveDates = [];
  for (let d = 13; d >= 0; d--) {
    consecutiveDates.push(getRelativeDate(-d));
  }

  crops.forEach((crop) => {
    markets.forEach((market) => {
      const base = basePrices[crop.id][market.id];
      consecutiveDates.forEach((dateStr, dayIndex) => {
        // Deterministic mild realistic price oscillation
        const variation = Math.sin(dayIndex * 0.7 + crop.name.length) * (base * 0.05);
        const price = Number((base + variation).toFixed(2));
        prices.push({
          id: `prc_${crop.id}_${market.id}_d${dayIndex}`,
          crop_id: crop.id,
          market_id: market.id,
          date: dateStr,
          price
        });
      });
    });
  });

  // 5. 12 Valid Produce Listings
  const todayStr = getRelativeDate(0);
  const tomorrowStr = getRelativeDate(1);
  const nextWeekStr = getRelativeDate(7);

  const listings = [
    {
      id: 'lst_001',
      user_id: 'usr_farmer_1',
      crop_id: 'crp_wheat',
      quantity: 1200,
      asking_price: 95.0,
      district: 'Hyderabad',
      grade: 'A',
      available_from: todayStr,
      status: 'Active',
      contact_phone: '0300-1122334',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'lst_002',
      user_id: 'usr_farmer_1',
      crop_id: 'crp_onion',
      quantity: 850,
      asking_price: 80.0,
      district: 'Hyderabad',
      grade: 'B',
      available_from: todayStr,
      status: 'Active',
      contact_phone: '0300-1122334',
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    {
      id: 'lst_003',
      user_id: 'usr_farmer_2',
      crop_id: 'crp_rice',
      quantity: 3500,
      asking_price: 158.0,
      district: 'Sukkur',
      grade: 'A',
      available_from: tomorrowStr,
      status: 'Active',
      contact_phone: '0301-2233445',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'lst_004',
      user_id: 'usr_farmer_2',
      crop_id: 'crp_cotton',
      quantity: 2200,
      asking_price: 225.0,
      district: 'Sukkur',
      grade: 'A',
      available_from: todayStr,
      status: 'Active',
      contact_phone: '0301-2233445',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 8).toISOString()
    },
    {
      id: 'lst_005',
      user_id: 'usr_farmer_3',
      crop_id: 'crp_mango',
      quantity: 1500,
      asking_price: 235.0,
      district: 'Mirpur Khas',
      grade: 'A',
      available_from: todayStr,
      status: 'Active',
      contact_phone: '0302-3344556',
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 6).toISOString()
    },
    {
      id: 'lst_006',
      user_id: 'usr_farmer_3',
      crop_id: 'crp_tomato',
      quantity: 600,
      asking_price: 118.0,
      district: 'Mirpur Khas',
      grade: 'B',
      available_from: todayStr,
      status: 'Active',
      contact_phone: '0302-3344556',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'lst_007',
      user_id: 'usr_farmer_4',
      crop_id: 'crp_sugarcane',
      quantity: 15000,
      asking_price: 16.0,
      district: 'Hyderabad',
      grade: 'B',
      available_from: nextWeekStr,
      status: 'Active',
      contact_phone: '0303-4455667',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'lst_008',
      user_id: 'usr_farmer_4',
      crop_id: 'crp_banana',
      quantity: 900,
      asking_price: 92.0,
      district: 'Hyderabad',
      grade: 'A',
      available_from: todayStr,
      status: 'Active',
      contact_phone: '0303-4455667',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'lst_009',
      user_id: 'usr_farmer_1',
      crop_id: 'crp_tomato',
      quantity: 400,
      asking_price: 122.0,
      district: 'Hyderabad',
      grade: 'C',
      available_from: todayStr,
      status: 'Active',
      contact_phone: '0300-1122334',
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 1).toISOString()
    },
    {
      id: 'lst_010',
      user_id: 'usr_farmer_2',
      crop_id: 'crp_wheat',
      quantity: 2000,
      asking_price: 91.5,
      district: 'Sukkur',
      grade: 'B',
      available_from: tomorrowStr,
      status: 'Active',
      contact_phone: '0301-2233445',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'lst_011',
      user_id: 'usr_farmer_3',
      crop_id: 'crp_onion',
      quantity: 1100,
      asking_price: 84.0,
      district: 'Mirpur Khas',
      grade: 'A',
      available_from: todayStr,
      status: 'Active',
      contact_phone: '0302-3344556',
      created_at: new Date(Date.now() - 3600000 * 7).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 7).toISOString()
    },
    {
      id: 'lst_012',
      user_id: 'usr_farmer_4',
      crop_id: 'crp_cotton',
      quantity: 1000,
      asking_price: 218.0,
      district: 'Hyderabad',
      grade: 'B',
      available_from: todayStr,
      status: 'Sold',
      contact_phone: '0303-4455667',
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 20).toISOString()
    }
  ];

  // 6. 5 Price Alerts
  const alerts = [
    {
      id: 'alt_001',
      user_id: 'usr_farmer_1',
      crop_id: 'crp_wheat',
      market_id: 'mkt_hyd',
      condition: 'Above',
      target_price: 98.0,
      active_status: true,
      triggered_status: false,
      last_triggered_at: null
    },
    {
      id: 'alt_002',
      user_id: 'usr_farmer_2',
      crop_id: 'crp_cotton',
      market_id: 'mkt_suk',
      condition: 'Above',
      target_price: 225.0,
      active_status: true,
      triggered_status: false,
      last_triggered_at: null
    },
    {
      id: 'alt_003',
      user_id: 'usr_buyer_1',
      crop_id: 'crp_rice',
      market_id: 'mkt_suk',
      condition: 'Below',
      target_price: 160.0,
      active_status: true,
      triggered_status: false,
      last_triggered_at: null
    },
    {
      id: 'alt_004',
      user_id: 'usr_buyer_2',
      crop_id: 'crp_onion',
      market_id: 'mkt_hyd',
      condition: 'Below',
      target_price: 85.0,
      active_status: true,
      triggered_status: false,
      last_triggered_at: null
    },
    {
      id: 'alt_005',
      user_id: 'usr_farmer_3',
      crop_id: 'crp_mango',
      market_id: 'mkt_mpk',
      condition: 'Above',
      target_price: 220.0,
      active_status: true,
      triggered_status: false,
      last_triggered_at: null
    }
  ];

  // Construct complete dataset
  const newDb = {
    users,
    crops,
    markets,
    prices,
    listings,
    alerts
  };

  // Write to storage
  await customStorage.write(newDb);

  // Validate counts
  const expectedPrices = 8 * 3 * 14;
  if (prices.length !== expectedPrices) {
    throw new Error(`Seed failed: expected ${expectedPrices} price records, generated ${prices.length}`);
  }

  console.log('----------------------------------------------------');
  console.log(' KisanMandi Seed Completed Successfully!');
  console.log(' Record Summary:');
  console.log(` - Users:    ${users.length} (4 Farmers, 2 Buyers)`);
  console.log(` - Crops:    ${crops.length} (across 4 categories)`);
  console.log(` - Markets:  ${markets.length} (Hyderabad, Sukkur, Mirpur Khas)`);
  console.log(` - Prices:   ${prices.length} (8 crops × 3 markets × 14 consecutive dates = ${expectedPrices})`);
  console.log(` - Listings: ${listings.length} valid produce lots`);
  console.log(` - Alerts:   ${alerts.length} target price alerts`);
  console.log('----------------------------------------------------');

  return {
    users: users.length,
    crops: crops.length,
    markets: markets.length,
    prices: prices.length,
    listings: listings.length,
    alerts: alerts.length
  };
}

// Direct execution check
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
