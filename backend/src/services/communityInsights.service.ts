import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { CommunityInsight, CommunityInsightSeed } from "../types/communityInsight.type";
import communityInsightsSeed from "../data/communityInsightsSeed";

sqlite3.verbose();

const DEFAULT_DB_FILE = path.join(__dirname, "..", "data", "community_insights.db");

type CommunityInsightRow = {
  id: number;
  category: string;
  title: string;
  description: string;
  source: string | null;
  lastUpdated: string;
};

const mapRowToInsight = (row: CommunityInsightRow): CommunityInsight => ({
  id: row.id,
  category: row.category,
  title: row.title,
  description: row.description,
  source: row.source ?? undefined,
  lastUpdated: row.lastUpdated,
});

export interface CommunityInsightsServiceOptions {
  databaseFile?: string;
  seedData?: CommunityInsightSeed[];
}

export class CommunityInsightsService {
  private readonly db: sqlite3.Database;
  private readonly initialized: Promise<void>;
  private readonly seedData: CommunityInsightSeed[];

  constructor(options?: CommunityInsightsServiceOptions) {
    const dbFile =
      options?.databaseFile || process.env.COMMUNITY_INSIGHTS_DB_PATH || DEFAULT_DB_FILE;

    if (dbFile !== ":memory:") {
      fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    }

    this.db = new sqlite3.Database(dbFile);
    this.seedData = options?.seedData ?? communityInsightsSeed;
    this.initialized = this.initialize();
  }

  private initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(
          `CREATE TABLE IF NOT EXISTS community_insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            source TEXT,
            lastUpdated TEXT NOT NULL
          )`,
          (createError) => {
            if (createError) {
              reject(createError);
              return;
            }

            this.db.get<{ count: number }>(
              "SELECT COUNT(*) AS count FROM community_insights",
              (countError, row) => {
                if (countError) {
                  reject(countError);
                  return;
                }

                if (!row || row.count > 0) {
                  resolve();
                  return;
                }

                const insertStatement = this.db.prepare(
                  `INSERT INTO community_insights (category, title, description, source, lastUpdated)
                   VALUES (?, ?, ?, ?, ?)`,
                );

                const insertNext = (index: number) => {
                  if (index >= this.seedData.length) {
                    insertStatement.finalize((finalizeError) => {
                      if (finalizeError) {
                        reject(finalizeError);
                        return;
                      }

                      resolve();
                    });
                    return;
                  }

                  const insight = this.seedData[index];
                  insertStatement.run(
                    insight.category,
                    insight.title,
                    insight.description,
                    insight.source ?? null,
                    insight.lastUpdated,
                    (insertError: Error | null) => {
                      if (insertError) {
                        reject(insertError);
                        return;
                      }

                      insertNext(index + 1);
                    },
                  );
                };

                insertNext(0);
              },
            );
          },
        );
      });
    });
  }

  public async listInsights(category?: string): Promise<CommunityInsight[]> {
    await this.initialized;

    return new Promise((resolve, reject) => {
      const params: string[] = [];
      let query =
        "SELECT id, category, title, description, source, lastUpdated FROM community_insights";

      if (category) {
        query += " WHERE LOWER(category) = LOWER(?)";
        params.push(category);
      }

      query += " ORDER BY lastUpdated DESC, id ASC";

      this.db.all<CommunityInsightRow>(query, params, (error, rows) => {
        if (error) {
          reject(error);
          return;
        }

        const normalizedRows = rows ?? [];
        resolve(normalizedRows.map(mapRowToInsight));
      });
    });
  }

  public async searchInsights(term: string): Promise<CommunityInsight[]> {
    await this.initialized;

    return new Promise((resolve, reject) => {
      const normalizedTerm = term.trim().toLowerCase();
      const likeTerm = `%${normalizedTerm}%`;

      const query = `
        SELECT id, category, title, description, source, lastUpdated
        FROM community_insights
        WHERE LOWER(title) LIKE ?
          OR LOWER(description) LIKE ?
          OR LOWER(category) LIKE ?
        ORDER BY lastUpdated DESC, id ASC
      `;

      this.db.all<CommunityInsightRow>(
        query,
        [likeTerm, likeTerm, likeTerm],
        (error, rows) => {
          if (error) {
            reject(error);
            return;
          }

          const normalizedRows = rows ?? [];
          resolve(normalizedRows.map(mapRowToInsight));
        },
      );
    });
  }

  public async listCategories(): Promise<string[]> {
    await this.initialized;

    return new Promise((resolve, reject) => {
      const query = "SELECT DISTINCT category FROM community_insights ORDER BY category ASC";

      this.db.all<{ category: string }>(query, [], (error, rows) => {
        if (error) {
          reject(error);
          return;
        }

        const normalizedRows = rows ?? [];
        resolve(normalizedRows.map((row) => row.category));
      });
    });
  }
}

const communityInsightsService = new CommunityInsightsService();

export default communityInsightsService;
