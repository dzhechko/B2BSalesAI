import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"), // 'admin' or 'user'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amoCrmApiKey: text("amocrm_api_key"),
  amoCrmSubdomain: text("amocrm_subdomain"),
  openaiApiKey: text("openai_api_key"),
  braveSearchApiKey: text("brave_search_api_key"),
  perplexityApiKey: text("perplexity_api_key"),
  encryptedData: text("encrypted_data"), // For storing encrypted API keys
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("light"), // 'light' or 'dark'
  playbook: text("playbook"), // Custom playbook content
  searchSystems: jsonb("search_systems").default('["brave", "perplexity"]'), // Array of enabled search systems
  preferences: jsonb("preferences"), // Additional user preferences
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amoCrmId: text("amocrm_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  position: text("position"),
  company: text("company"),
  status: text("status"),
  amoCrmData: jsonb("amocrm_data"), // Raw AmoCRM data
  collectedData: jsonb("collected_data"), // Data from Brave/Perplexity
  recommendations: jsonb("recommendations"), // AI recommendations
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertApiKeysSchema = createInsertSchema(apiKeys).omit({
  id: true,
  userId: true,
  encryptedData: true,
  updatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  userId: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ApiKeys = typeof apiKeys.$inferSelect;
export type InsertApiKeys = z.infer<typeof insertApiKeysSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
