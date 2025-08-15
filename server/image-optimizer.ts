import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export class ImageOptimizer {
  private static readonly DEFAULT_OPTIONS: ImageOptimizationOptions = {
    width: 800,
    height: 600,
    quality: 80,
    format: 'webp'
  };

  static async optimizeImage(
    inputPath: string,
    outputPath: string,
    options: ImageOptimizationOptions = {}
  ): Promise<void> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      await sharp(inputPath)
        .resize(opts.width, opts.height, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .toFormat(opts.format!, { quality: opts.quality })
        .toFile(outputPath);
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw error;
    }
  }

  static async generateThumbnail(
    inputPath: string,
    outputPath: string,
    size: number = 150
  ): Promise<void> {
    try {
      await sharp(inputPath)
        .resize(size, size, { 
          fit: 'cover',
          position: 'center'
        })
        .toFormat('webp', { quality: 70 })
        .toFile(outputPath);
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      throw error;
    }
  }

  static async createResponsiveImages(
    inputPath: string,
    outputDir: string,
    basename: string
  ): Promise<{ [key: string]: string }> {
    const sizes = {
      small: { width: 400, height: 300 },
      medium: { width: 800, height: 600 },
      large: { width: 1200, height: 900 }
    };

    const results: { [key: string]: string } = {};

    for (const [sizeKey, dimensions] of Object.entries(sizes)) {
      const outputPath = path.join(outputDir, `${basename}-${sizeKey}.webp`);
      await this.optimizeImage(inputPath, outputPath, {
        ...dimensions,
        format: 'webp',
        quality: sizeKey === 'small' ? 70 : 80
      });
      results[sizeKey] = outputPath;
    }

    return results;
  }
}