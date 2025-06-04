import { users, apiKeys, userSettings, contacts, type User, type InsertUser, type ApiKeys, type InsertApiKeys, type UserSettings, type InsertUserSettings, type Contact, type InsertContact } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import crypto from "crypto";

const PostgresSessionStore = connectPg(session);

// Encryption functions for API keys
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : Buffer.from('b2b-sales-app-encryption-key-32-bytes!!', 'utf8');
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  try {
    if (!text || !text.includes(':')) {
      console.error('Invalid encrypted text format');
      return '';
    }
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt API keys:', error);
    return '';
  }
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getApiKeys(userId: number): Promise<ApiKeys | undefined>;
  createOrUpdateApiKeys(userId: number, keys: InsertApiKeys): Promise<ApiKeys>;
  
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createOrUpdateUserSettings(userId: number, settings: InsertUserSettings): Promise<UserSettings>;
  
  getContacts(userId: number): Promise<Contact[]>;
  getContact(id: number, userId: number): Promise<Contact | undefined>;
  createOrUpdateContact(contact: InsertContact): Promise<Contact>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getApiKeys(userId: number): Promise<ApiKeys | undefined> {
    const [keys] = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
    if (keys && keys.encryptedData) {
      try {
        const decryptedData = JSON.parse(decrypt(keys.encryptedData));
        return { ...keys, ...decryptedData };
      } catch (error) {
        console.error('Failed to decrypt API keys:', error);
      }
    }
    return keys || undefined;
  }

  async createOrUpdateApiKeys(userId: number, keys: InsertApiKeys): Promise<ApiKeys> {
    const encryptedData = encrypt(JSON.stringify(keys));
    
    const [existingKeys] = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
    
    if (existingKeys) {
      const [updatedKeys] = await db
        .update(apiKeys)
        .set({ 
          encryptedData,
          updatedAt: new Date()
        })
        .where(eq(apiKeys.userId, userId))
        .returning();
      return { ...updatedKeys, ...keys };
    } else {
      const [newKeys] = await db
        .insert(apiKeys)
        .values({ 
          userId,
          encryptedData,
          updatedAt: new Date()
        })
        .returning();
      return { ...newKeys, ...keys };
    }
  }

  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async createOrUpdateUserSettings(userId: number, settings: InsertUserSettings): Promise<UserSettings> {
    const [existingSettings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    
    if (existingSettings) {
      const [updatedSettings] = await db
        .update(userSettings)
        .set({ 
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(userSettings.userId, userId))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(userSettings)
        .values({ 
          userId,
          ...settings,
          updatedAt: new Date()
        })
        .returning();
      return newSettings;
    }
  }

  async getContacts(userId: number): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.userId, userId));
  }

  async getContact(id: number, userId: number): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    
    if (contact && contact.userId === userId) {
      return contact;
    }
    return undefined;
  }

  async createOrUpdateContact(contact: InsertContact): Promise<Contact> {
    const existingContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.amoCrmId, contact.amoCrmId!));
    
    const existingContact = existingContacts.find(c => c.userId === contact.userId);
    
    if (existingContact) {
      const [updatedContact] = await db
        .update(contacts)
        .set({ 
          ...contact,
          lastUpdated: new Date()
        })
        .where(eq(contacts.id, existingContact.id))
        .returning();
      return updatedContact;
    } else {
      const [newContact] = await db
        .insert(contacts)
        .values({ 
          ...contact,
          lastUpdated: new Date()
        })
        .returning();
      return newContact;
    }
  }
}

export const storage = new DatabaseStorage();
