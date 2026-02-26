import { DataSource } from "typeorm";
import { Contact } from "../entity/Contact";

// if DATABASE_URL is set we're on render/production, otherwise local sqlite
const isProduction = !!process.env.DATABASE_URL;

export const AppDataSource = new DataSource(
    isProduction
        ? {
              type: "postgres",
              url: process.env.DATABASE_URL,
              ssl: { rejectUnauthorized: false },
              entities: [Contact],
              synchronize: true,
              logging: false,
          }
        : {
              type: "better-sqlite3",
              database: "database.sqlite",
              entities: [Contact],
              synchronize: true,
              logging: false,
          }
);
