/**
 * KisanMandi JSON File Persistence Service
 *
 * NOTE FOR HACKATHON DEMONSTRATION:
 * This service implements file-based JSON storage suitable for rapid hackathon
 * development, prototyping, and local evaluations. In a production multi-tenant
 * deployment, this layer should be swapped with a relational database (e.g. PostgreSQL)
 * or document database (e.g. Firestore / MongoDB) without modifying the route controllers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow dynamic DB path via environment variable (vital for isolated test runs)
const DEFAULT_DB_PATH = path.resolve(__dirname, '../../data/db.json');

const REQUIRED_COLLECTIONS = [
  'users',
  'crops',
  'markets',
  'prices',
  'listings',
  'alerts'
];

class StorageService {
  constructor() {
    this.dbPath = process.env.DB_FILE_PATH
      ? path.resolve(process.env.DB_FILE_PATH)
      : DEFAULT_DB_PATH;
    this.writeQueue = Promise.resolve();
    this.cachedData = null;
    this.initialized = false;
  }

  setDbPath(customPath) {
    this.dbPath = path.resolve(customPath);
    this.cachedData = null;
    this.initialized = false;
  }

  getDbPath() {
    return this.dbPath;
  }

  /**
   * Initializes and validates database schema on startup.
   */
  async init() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      if (!fs.existsSync(this.dbPath)) {
        const initialSchema = {
          users: [],
          crops: [],
          markets: [],
          prices: [],
          listings: [],
          alerts: []
        };
        await fs.promises.writeFile(
          this.dbPath,
          JSON.stringify(initialSchema, null, 2),
          'utf-8'
        );
        this.cachedData = initialSchema;
      } else {
        const raw = await fs.promises.readFile(this.dbPath, 'utf-8');
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new Error(`Corrupted JSON database at ${this.dbPath}`);
        }

        // Validate structure
        for (const col of REQUIRED_COLLECTIONS) {
          if (!Array.isArray(parsed[col])) {
            parsed[col] = [];
          }
        }
        this.cachedData = parsed;
      }

      this.initialized = true;
      return true;
    } catch (err) {
      this.initialized = false;
      throw new Error(`Failed to initialize storage: ${err.message}`);
    }
  }

  /**
   * Safe read from memory cache or file.
   */
  async read() {
    if (!this.initialized || !this.cachedData) {
      await this.init();
    }
    return JSON.parse(JSON.stringify(this.cachedData));
  }

  /**
   * Serialized atomic file write.
   * Enqueues writes so concurrent operations cannot interleave or corrupt the file.
   */
  async write(newData) {
    // Validate database schema before writing
    for (const col of REQUIRED_COLLECTIONS) {
      if (!Array.isArray(newData[col])) {
        throw new Error(`Invalid database structure: missing collection ${col}`);
      }
    }

    // Sequence through write queue
    return new Promise((resolve, reject) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          const tempPath = `${this.dbPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(7)}`;
          const payload = JSON.stringify(newData, null, 2);

          // Atomic write: write to temp file then rename
          await fs.promises.writeFile(tempPath, payload, 'utf-8');
          await fs.promises.rename(tempPath, this.dbPath);

          // Update memory cache after disk confirmation
          this.cachedData = JSON.parse(payload);
          resolve(this.cachedData);
        })
        .catch((err) => {
          reject(new Error(`Persistence write error: ${err.message}`));
        });
    });
  }

  async getCollection(name) {
    const db = await this.read();
    if (!db[name]) {
      throw new Error(`Collection '${name}' does not exist.`);
    }
    return db[name];
  }

  async findById(collectionName, id) {
    const items = await this.getCollection(collectionName);
    return items.find((item) => item.id === id) || null;
  }

  async insert(collectionName, record) {
    const db = await this.read();
    if (!db[collectionName]) {
      db[collectionName] = [];
    }
    db[collectionName].push(record);
    await this.write(db);
    return record;
  }

  async update(collectionName, id, updates) {
    const db = await this.read();
    const index = db[collectionName]?.findIndex((item) => item.id === id);
    if (index === -1 || index === undefined) {
      return null;
    }
    const updatedRecord = { ...db[collectionName][index], ...updates, id };
    db[collectionName][index] = updatedRecord;
    await this.write(db);
    return updatedRecord;
  }

  async delete(collectionName, id) {
    const db = await this.read();
    const index = db[collectionName]?.findIndex((item) => item.id === id);
    if (index === -1 || index === undefined) {
      return false;
    }
    db[collectionName].splice(index, 1);
    await this.write(db);
    return true;
  }
}

export const storage = new StorageService();
export default storage;
