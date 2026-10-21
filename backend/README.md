# KisanMandi REST API Backend

A custom, high-performance REST API backend for the **KisanMandi** agricultural commodity marketplace. Built with Node.js and Express, it features real-time mandi prices, 14-day statistical aggregations, cross-market comparisons, produce listings with automated market benchmark labeling, and a threshold-driven price alert engine.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or later (v20+ / v22+ recommended)
- **npm**: v9.0.0 or later

---

## 2. Installation & Quick Start

### Installation
Navigate to the `backend/` directory and install dependencies:

```bash
cd backend
npm install
```

### Environment Setup
Copy the example environment file:

```bash
cp .env.example .env
```

Configure your `.env` variables if needed:
```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Seeding the Database
Populate the database with the required hackathon demonstration dataset (8 crops, 3 mandis, 6 users, exactly 336 price records spanning 14 consecutive days, 12 listings, and 5 alerts):

```bash
npm run seed
```

### Running the Server
Start the standalone Express backend server:

```bash
# Production / standard mode
npm start

# Or with automatic reload during development
npm run dev
```
The server will boot on `http://localhost:4000`.

### Running Automated Tests
Run the automated test suite covering all 14 functional verifications (health, validations, role safeguards, alert triggers, cross-market sorting, and persistence):

```bash
npm test
```
The test suite operates against an isolated temporary database, leaving demo data intact.

---

## 3. Persistence Architecture

- **Engine**: Safe, serialized JSON file storage with transactional temporary file writes and atomic file renaming (`fs.promises.rename`).
- **Data File**: Stored in `backend/data/db.json`.
- **Concurrency & Reliability**: Read-through in-memory caching combined with an enqueued disk write pipeline prevents concurrent corruption.
- **Hackathon Scope**: JSON-file storage is designed for rapid prototyping, evaluation, and hackathon judging. For production multi-tenant workloads, the storage module (`backend/src/services/storage.js`) can be substituted with PostgreSQL, Cloud SQL, or Firestore without altering any route handlers.

---

## 4. Complete REST API Endpoints

### Health Check
- `GET /api/health`
  - Returns server health status, storage availability, and collection counts.

### Users
- `GET /api/users` (Query: `role`, `district`)
- `GET /api/users/:id`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Crops
- `GET /api/crops` (Query: `category`)
- `GET /api/crops/:id`
- `POST /api/crops`
- `PATCH /api/crops/:id`
- `DELETE /api/crops/:id`

### Markets
- `GET /api/markets` (Query: `district`)
- `GET /api/markets/:id`
- `POST /api/markets`
- `PATCH /api/markets/:id`
- `DELETE /api/markets/:id`

### Prices & Market Intelligence
- `GET /api/prices` (Query filters: `crop_id`, `market_id`, `date`, `start_date`, `end_date`)
- `GET /api/prices/summary?crop_id=:crop_id&market_id=:market_id`
  - Returns latest price, 1-day price change, percentage change, and 14-day stats (min, max, avg, observation count, daily points).
- `GET /api/prices/comparison?crop_id=:crop_id`
  - Compares the crop's latest prices across all mandis, sorted from highest to lowest, with the highest-priced market identified.
- `GET /api/prices/:id`
- `POST /api/prices` (Validates foreign keys; rejects duplicates for same crop, market, and date with 409 Conflict)
- `PATCH /api/prices/:id`
- `DELETE /api/prices/:id`

### Produce Listings
- `GET /api/listings` (Query filters: `crop_id`, `district`, `grade`, `status`, `user_id`, `search`, `sort=newest|price_asc`)
  - Automatically enriches each listing with dynamically calculated market labels:
    - **Below market**: asking price is `< -5%` of the crop's average mandi price.
    - **At market**: asking price is within `[-5%, +5%]`.
    - **Above market**: asking price is `> +5%`.
- `GET /api/listings/:id`
- `POST /api/listings` (Enforces that owner must be a `Farmer`)
- `PATCH /api/listings/:id` (Enforces owner identity via `x-user-id` header)
- `DELETE /api/listings/:id` (Enforces owner identity via `x-user-id` header)

### Price Alerts & Automation
- `GET /api/alerts` (Query filters: `user_id`, `active_status`, `triggered_status`)
- `GET /api/alerts/:id`
- `POST /api/alerts` (Creates alert for crop and market with condition `Above` or `Below`)
- `PATCH /api/alerts/:id` (Requires owner identity)
- `DELETE /api/alerts/:id` (Requires owner identity)
- `POST /api/alerts/evaluate`
  - Evaluates active alerts against latest mandi prices.
  - Updates triggered status without duplicate notifications.
  - Resets triggered status if conditions are no longer met.

---

## 5. Request & Response Examples

### 1. Health Check
```bash
curl http://localhost:4000/api/health
```
```json
{
  "status": "healthy",
  "storage_available": true,
  "timestamp": "2026-10-21T05:56:00.000Z",
  "environment": "development",
  "collections": {
    "users": 6,
    "crops": 8,
    "markets": 3,
    "prices": 336,
    "listings": 12,
    "alerts": 5
  }
}
```

### 2. Market Comparison
```bash
curl "http://localhost:4000/api/prices/comparison?crop_id=crp_wheat"
```
```json
{
  "success": true,
  "data": {
    "available": true,
    "averagePrice": 94.33,
    "marketCount": 3,
    "highestMarket": {
      "market_id": "mkt_hyd",
      "market_name": "Hyderabad Mandi",
      "district": "Hyderabad",
      "price": 96.5,
      "change": 1.2,
      "percentage_change": 1.26
    },
    "markets": [
      { "market_id": "mkt_hyd", "market_name": "Hyderabad Mandi", "price": 96.5 },
      { "market_id": "mkt_mpk", "market_name": "Mirpur Khas Mandi", "price": 94.2 },
      { "market_id": "mkt_suk", "market_name": "Sukkur Mandi", "price": 92.3 }
    ]
  }
}
```

### 3. Create Produce Listing (Farmer only)
```bash
curl -X POST http://localhost:4000/api/listings \
  -H "Content-Type: application/json" \
  -H "x-user-id: usr_farmer_1" \
  -d '{
    "user_id": "usr_farmer_1",
    "crop_id": "crp_wheat",
    "quantity": 2500,
    "asking_price": 96.0,
    "district": "Hyderabad",
    "grade": "A",
    "available_from": "2026-10-22",
    "contact_phone": "0300-1122334"
  }'
```
```json
{
  "success": true,
  "data": {
    "id": "lst_a81f3d42",
    "user_id": "usr_farmer_1",
    "crop_id": "crp_wheat",
    "quantity": 2500,
    "asking_price": 96,
    "district": "Hyderabad",
    "grade": "A",
    "available_from": "2026-10-22",
    "status": "Active",
    "contact_phone": "0300-1122334",
    "created_at": "2026-10-21T05:56:00.000Z",
    "updated_at": "2026-10-21T05:56:00.000Z"
  }
}
```

### 4. Evaluate Price Alerts
```bash
curl -X POST http://localhost:4000/api/alerts/evaluate
```
```json
{
  "success": true,
  "evaluated_count": 5,
  "newly_triggered_count": 2,
  "alerts": [
    {
      "id": "alt_001",
      "user_id": "usr_farmer_1",
      "crop_id": "crp_wheat",
      "market_id": "mkt_hyd",
      "condition": "Above",
      "target_price": 95,
      "active_status": true,
      "triggered_status": true,
      "last_triggered_at": "2026-10-21T05:56:00.000Z",
      "current_price": 96.5
    }
  ]
}
```

---

## 6. Ownership & Role Safeguards

The API incorporates domain validation and identity enforcement:

1. **Role Restrictions**: Only users registered with `role: "Farmer"` can create produce listings. Requests from users with `role: "Buyer"` receive HTTP `403 Forbidden` (`ROLE_NOT_PERMITTED`).
2. **Owner Verification**: Modifications (`PATCH`) and deletions (`DELETE`) on listings verify that the active user (`x-user-id` header or body) matches `listing.user_id`. Attempting to modify another farmer's listing returns HTTP `403 Forbidden` (`OWNERSHIP_MISMATCH`).
3. **Alert Ownership**: Users can only edit or delete alerts they own.
4. **Demo Identity Note**: In this hackathon demonstration, identity is selected via the demo user switcher or the `x-user-id` header. In a production environment, this header would be replaced with signed JWT access tokens or verified server-side session cookies.

---

## 7. Connecting Frontend with Google AI Studio

The frontend connects to the backend through the central API client (`src/services/api.ts`).

- In development/local mode, configure in `.env`:
  ```env
  VITE_API_BASE_URL=http://localhost:4000/api
  ```
- In Google AI Studio preview environment:
  The application automatically mounts both the Express REST API and the Vite frontend on the same port (`3000`), so the default `/api` base URL functions seamlessly without external network configuration or CORS hurdles.

---

## 8. Deployment Guidance for Persistent Hosting

To deploy this backend as a persistent service (e.g., Render, Railway, Fly.io, or Google Cloud Run):

1. **Start Script**: Ensure your host uses `npm start` (which runs `node server.js`).
2. **Environment Variables**:
   - `PORT`: Supplied by the cloud provider (e.g., `8080` or `10000`).
   - `FRONTEND_ORIGIN`: Set to the full URL of your deployed frontend (e.g., `https://kisanmandi.web.app`).
   - `NODE_ENV`: Set to `production`.
3. **Persistent Volume (Optional for JSON storage)**: If using containerized hosting, mount a persistent volume at `backend/data/` so `db.json` persists across container restarts, or migrate the storage layer to Google Cloud SQL / Supabase / Firestore.
