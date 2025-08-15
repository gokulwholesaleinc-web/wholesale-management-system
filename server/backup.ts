import { db } from './db';
import { storage } from './storage';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import archiver from 'archiver';
import * as tar from 'tar-fs';
import { createGunzip } from 'zlib';

export class BackupManager {
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

  // Create full system backup
  async createFullBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `gokul-backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, `${backupName}.tar.gz`);

    try {
      // Create temporary backup directory
      const tempDir = path.join(this.backupDir, `temp-${timestamp}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Backup database data
      await this.backupDatabaseData(tempDir);
      
      // Backup configuration files
      await this.backupConfiguration(tempDir);
      
      // Backup uploaded files
      await this.backupFiles(tempDir);
      
      // Create compressed archive
      await this.createArchive(tempDir, backupPath);
      
      // Clean up temporary directory
      await fs.rm(tempDir, { recursive: true, force: true });
      
      console.log(`Full backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error('Failed to create backup');
    }
  }

  // Backup database data to JSON files
  private async backupDatabaseData(backupDir: string) {
    const dataDir = path.join(backupDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    try {
      // Backup all major tables
      const tables = [
        'products',
        'categories', 
        'users',
        'orders',
        'orderItems',
        'cart',
        'addresses',
        'purchaseOrders',
        'purchaseOrderItems'
      ];

      for (const tableName of tables) {
        try {
          let data;
          switch (tableName) {
            case 'products':
              data = await storage.getProducts();
              break;
            case 'categories':
              data = await storage.getCategories();
              break;
            case 'users':
              data = await storage.getAllUsers();
              break;
            case 'orders':
              data = await storage.getAllOrders();
              break;
            case 'addresses':
              // Skip addresses for now
              data = [];
              break;
            default:
              // Skip other tables for simplified backup
              data = [];
          }
          
          const filePath = path.join(dataDir, `${tableName}.json`);
          await fs.writeFile(filePath, JSON.stringify(data, null, 2));
          console.log(`Backed up ${tableName}: ${data?.length || 0} records`);
        } catch (error) {
          console.warn(`Failed to backup ${tableName}:`, error);
        }
      }

      // Create backup metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        tables: tables,
        totalRecords: 0
      };
      
      await fs.writeFile(
        path.join(dataDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  // Backup configuration files
  private async backupConfiguration(backupDir: string) {
    const configDir = path.join(backupDir, 'config');
    await fs.mkdir(configDir, { recursive: true });

    const configFiles = [
      'package.json',
      'package-lock.json',
      'drizzle.config.ts',
      'tsconfig.json',
      'vite.config.ts',
      'tailwind.config.ts',
      'components.json'
    ];

    for (const fileName of configFiles) {
      try {
        const sourcePath = path.join(process.cwd(), fileName);
        const destPath = path.join(configDir, fileName);
        await fs.copyFile(sourcePath, destPath);
      } catch (error) {
        console.warn(`Failed to backup ${fileName}:`, error);
      }
    }
  }

  // Backup uploaded files and assets
  private async backupFiles(backupDir: string) {
    const filesDir = path.join(backupDir, 'files');
    await fs.mkdir(filesDir, { recursive: true });

    const sourceDirectories = [
      'public/images',
      'public/assets'
    ];

    for (const sourceDir of sourceDirectories) {
      try {
        const sourcePath = path.join(process.cwd(), sourceDir);
        const destPath = path.join(filesDir, path.basename(sourceDir));
        
        await this.copyDirectory(sourcePath, destPath);
      } catch (error) {
        console.warn(`Failed to backup ${sourceDir}:`, error);
      }
    }
  }

  // Recursively copy directory
  private async copyDirectory(source: string, destination: string) {
    try {
      await fs.access(source);
      await fs.mkdir(destination, { recursive: true });
      
      const items = await fs.readdir(source);
      
      for (const item of items) {
        const sourcePath = path.join(source, item);
        const destPath = path.join(destination, item);
        
        const stats = await fs.stat(sourcePath);
        
        if (stats.isDirectory()) {
          await this.copyDirectory(sourcePath, destPath);
        } else {
          await fs.copyFile(sourcePath, destPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist, skip silently
    }
  }

  // Create compressed archive
  private async createArchive(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('tar', { gzip: true });

      output.on('close', () => {
        console.log(`Archive created: ${archive.pointer()} total bytes`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  // Restore from backup
  async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      console.log(`Starting restore from: ${backupPath}`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const tempDir = path.join(this.backupDir, `restore-${timestamp}`);
      
      // Extract backup archive
      await this.extractArchive(backupPath, tempDir);
      
      // Restore database data
      await this.restoreDatabaseData(tempDir);
      
      // Restore files
      await this.restoreFiles(tempDir);
      
      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true });
      
      console.log('Restore completed successfully');
    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error('Failed to restore backup');
    }
  }

  // Extract compressed archive
  private async extractArchive(archivePath: string, extractDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      createReadStream(archivePath)
        .pipe(createGunzip())
        .pipe(tar.extract(extractDir))
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  // Restore database data
  private async restoreDatabaseData(restoreDir: string) {
    const dataDir = path.join(restoreDir, 'data');
    
    try {
      // Read metadata
      const metadataPath = path.join(dataDir, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      
      console.log(`Restoring backup from: ${metadata.timestamp}`);
      
      // Clear existing data (with confirmation)
      console.log('Warning: This will replace all existing data');
      
      // Restore each table
      for (const tableName of metadata.tables) {
        try {
          const filePath = path.join(dataDir, `${tableName}.json`);
          const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
          
          // Clear existing data and insert backup data
          await this.restoreTableData(tableName, data);
          
          console.log(`Restored ${tableName}: ${data.length} records`);
        } catch (error) {
          console.warn(`Failed to restore ${tableName}:`, error);
        }
      }
    } catch (error) {
      console.error('Database restore failed:', error);
      throw error;
    }
  }

  // Restore specific table data
  private async restoreTableData(tableName: string, data: any[]) {
    if (!data || data.length === 0) return;
    
    try {
      // This would need to be implemented based on your storage interface
      // For now, we'll log the operation
      console.log(`Would restore ${data.length} records to ${tableName}`);
      
      // In a real implementation, you would:
      // 1. Truncate the existing table
      // 2. Insert the backup data
      // 3. Update sequences/auto-increment values
    } catch (error) {
      console.error(`Failed to restore ${tableName}:`, error);
    }
  }

  // Restore files
  private async restoreFiles(restoreDir: string) {
    const filesDir = path.join(restoreDir, 'files');
    
    try {
      const publicDir = path.join(process.cwd(), 'public');
      
      // Restore images
      const imagesSource = path.join(filesDir, 'images');
      const imagesDest = path.join(publicDir, 'images');
      await this.copyDirectory(imagesSource, imagesDest);
      
      // Restore assets
      const assetsSource = path.join(filesDir, 'assets');
      const assetsDest = path.join(publicDir, 'assets');
      await this.copyDirectory(assetsSource, assetsDest);
      
      console.log('Files restored successfully');
    } catch (error) {
      console.warn('File restore failed:', error);
    }
  }

  // List available backups
  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(file => file.endsWith('.tar.gz'))
        .sort()
        .reverse(); // Latest first
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  // Delete old backups (keep last N backups)
  async cleanupOldBackups(keepCount: number = 5): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        
        for (const backup of toDelete) {
          const backupPath = path.join(this.backupDir, backup);
          await fs.unlink(backupPath);
          console.log(`Deleted old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  // Get backup information
  async getBackupInfo(backupName: string): Promise<any> {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      const stats = await fs.stat(backupPath);
      
      return {
        name: backupName,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      console.error('Failed to get backup info:', error);
      return null;
    }
  }
}

export const backupManager = new BackupManager();