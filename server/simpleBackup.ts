import { storage } from './storage';
import fs from 'fs/promises';
import path from 'path';

export class SimpleBackupManager {
  private backupDir = path.join(process.cwd(), 'backups');
  
  constructor() {
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  // Create JSON backup of all data
  async createDataBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `gokul-data-backup-${timestamp}.json`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      // Collect all data
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: {
          products: await storage.getProducts(),
          categories: await storage.getCategories(),
          users: await storage.getAllUsers(),
          orders: await storage.getAllOrders()
        }
      };

      // Write to JSON file
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      
      console.log(`Data backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error('Failed to create backup');
    }
  }

  // List available backups
  async listBackups(): Promise<any[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.endsWith('.json') && file.startsWith('gokul-data-backup-'))
        .sort()
        .reverse(); // Latest first

      const backupDetails = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            sizeFormatted: this.formatFileSize(stats.size)
          };
        })
      );

      return backupDetails;
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  // Get backup content for preview
  async getBackupPreview(filename: string): Promise<any> {
    try {
      const backupPath = path.join(this.backupDir, filename);
      const content = await fs.readFile(backupPath, 'utf-8');
      const backupData = JSON.parse(content);
      
      return {
        timestamp: backupData.timestamp,
        version: backupData.version,
        summary: {
          products: backupData.data?.products?.length || 0,
          categories: backupData.data?.categories?.length || 0,
          users: backupData.data?.users?.length || 0,
          orders: backupData.data?.orders?.length || 0
        }
      };
    } catch (error) {
      console.error('Failed to preview backup:', error);
      return null;
    }
  }

  // Delete backup file
  async deleteBackup(filename: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, filename);
      await fs.unlink(backupPath);
      console.log(`Deleted backup: ${filename}`);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error('Failed to delete backup');
    }
  }

  // Clean up old backups (keep last N)
  async cleanupOldBackups(keepCount: number = 5): Promise<number> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        
        for (const backup of toDelete) {
          await this.deleteBackup(backup.name);
        }
        
        return toDelete.length;
      }
      
      return 0;
    } catch (error) {
      console.error('Backup cleanup failed:', error);
      return 0;
    }
  }

  // Format file size for display
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Create automated daily backup
  async createAutomatedBackup(): Promise<string> {
    try {
      const backupPath = await this.createDataBackup();
      
      // Clean up old backups automatically
      await this.cleanupOldBackups(10); // Keep 10 most recent
      
      return backupPath;
    } catch (error) {
      console.error('Automated backup failed:', error);
      throw error;
    }
  }
}

export const simpleBackupManager = new SimpleBackupManager();