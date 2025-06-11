/**
 * Cache Manager - Handles local storage of downloaded PDFs
 */
class CacheManager {
  constructor() {
    this.cachePrefix = 'arxiv_cache_';
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  }

  /**
   * Generate cache key for a paper ID
   * @param {string} paperId - arXiv paper ID
   * @returns {string} - Cache key
   */
  getCacheKey(paperId) {
    return `${this.cachePrefix}${paperId}`;
  }

  /**
   * Check if paper exists in cache and is not expired
   * @param {string} paperId - arXiv paper ID
   * @returns {Promise<boolean>}
   */
  async exists(paperId) {
    try {
      const cacheKey = this.getCacheKey(paperId);
      const result = await chrome.storage.local.get(cacheKey);
      
      if (!result[cacheKey]) {
        return false;
      }

      const cachedData = result[cacheKey];
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cachedData.timestamp > this.cacheExpiry) {
        // Remove expired cache
        await this.remove(paperId);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking cache:', error);
      return false;
    }
  }

  /**
   * Store PDF blob in cache (with size limits)
   * @param {string} paperId - arXiv paper ID
   * @param {Blob} pdfBlob - PDF file blob
   * @param {string} title - Paper title
   * @returns {Promise<boolean>} - Success status
   */
  async store(paperId, pdfBlob, title = 'arXiv Paper') {
    try {
      const fileSizeMB = pdfBlob.size / 1024 / 1024;
      
      // Skip caching for files larger than 3MB to avoid quota issues
      if (fileSizeMB > 3) {
        console.log(`Skipping cache for large file: ${paperId} (${fileSizeMB.toFixed(2)} MB)`);
        return false;
      }

      // Check current storage usage
      const currentStats = await this.getStats();
      const currentSizeMB = currentStats.totalSize / 1024 / 1024;
      
      // If storage would exceed 8MB, clear some old entries
      if (currentSizeMB + fileSizeMB > 8) {
        await this.clearOldEntries(2); // Clear 2 oldest entries
      }

      // Convert blob to base64 for storage
      const base64Data = await this.blobToBase64(pdfBlob);
      
      const cacheData = {
        blob: base64Data,
        title: title,
        timestamp: Date.now(),
        size: pdfBlob.size,
        type: pdfBlob.type || 'application/pdf'
      };

      const cacheKey = this.getCacheKey(paperId);
      await chrome.storage.local.set({
        [cacheKey]: cacheData
      });

      console.log(`Cached PDF for paper ${paperId} (${fileSizeMB.toFixed(2)} MB)`);
      return true;
    } catch (error) {
      console.error('Error storing in cache:', error);
      
      // If storage quota exceeded, try to clear cache and retry once
      if (error.message.includes('QUOTA_BYTES')) {
        console.log('Storage quota exceeded, clearing old cache...');
        await this.clearOldEntries(5);
        return false; // Don't retry to avoid infinite loops
      }
      
      return false;
    }
  }

  /**
   * Retrieve PDF blob from cache
   * @param {string} paperId - arXiv paper ID
   * @returns {Promise<{blob: Blob, title: string} | null>}
   */
  async retrieve(paperId) {
    try {
      const cacheKey = this.getCacheKey(paperId);
      const result = await chrome.storage.local.get(cacheKey);
      
      if (!result[cacheKey]) {
        return null;
      }

      const cachedData = result[cacheKey];
      
      // Check if cache is expired
      const now = Date.now();
      if (now - cachedData.timestamp > this.cacheExpiry) {
        await this.remove(paperId);
        return null;
      }

      // Convert base64 back to blob
      const blob = await this.base64ToBlob(cachedData.blob, cachedData.type);
      
      return {
        blob: blob,
        title: cachedData.title
      };
    } catch (error) {
      console.error('Error retrieving from cache:', error);
      return null;
    }
  }

  /**
   * Remove paper from cache
   * @param {string} paperId - arXiv paper ID
   * @returns {Promise<boolean>}
   */
  async remove(paperId) {
    try {
      const cacheKey = this.getCacheKey(paperId);
      await chrome.storage.local.remove(cacheKey);
      return true;
    } catch (error) {
      console.error('Error removing from cache:', error);
      return false;
    }
  }

  /**
   * Clear all expired cache entries
   * @returns {Promise<number>} - Number of entries cleared
   */
  async clearExpired() {
    try {
      const allData = await chrome.storage.local.get(null);
      const now = Date.now();
      let clearedCount = 0;

      for (const [key, data] of Object.entries(allData)) {
        if (key.startsWith(this.cachePrefix) && data.timestamp) {
          if (now - data.timestamp > this.cacheExpiry) {
            await chrome.storage.local.remove(key);
            clearedCount++;
          }
        }
      }

      console.log(`Cleared ${clearedCount} expired cache entries`);
      return clearedCount;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Clear oldest cache entries to free up space
   * @param {number} count - Number of entries to clear
   * @returns {Promise<number>} - Number of entries cleared
   */
  async clearOldEntries(count = 3) {
    try {
      const allData = await chrome.storage.local.get(null);
      const cacheEntries = [];

      // Collect all cache entries with timestamps
      for (const [key, data] of Object.entries(allData)) {
        if (key.startsWith(this.cachePrefix) && data.timestamp) {
          cacheEntries.push({ key, timestamp: data.timestamp, size: data.size || 0 });
        }
      }

      // Sort by timestamp (oldest first)
      cacheEntries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest entries
      const toRemove = cacheEntries.slice(0, count);
      const keysToRemove = toRemove.map(entry => entry.key);

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        const freedSpace = toRemove.reduce((sum, entry) => sum + entry.size, 0);
        console.log(`Cleared ${keysToRemove.length} old cache entries, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
      }

      return keysToRemove.length;
    } catch (error) {
      console.error('Error clearing old cache entries:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<{totalEntries: number, totalSize: number}>}
   */
  async getStats() {
    try {
      const allData = await chrome.storage.local.get(null);
      let totalEntries = 0;
      let totalSize = 0;

      for (const [key, data] of Object.entries(allData)) {
        if (key.startsWith(this.cachePrefix) && data.size) {
          totalEntries++;
          totalSize += data.size;
        }
      }

      return {
        totalEntries,
        totalSize
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalEntries: 0, totalSize: 0 };
    }
  }

  /**
   * Convert blob to base64 string
   * @param {Blob} blob - Blob to convert
   * @returns {Promise<string>}
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:mime;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert base64 string to blob
   * @param {string} base64 - Base64 string
   * @param {string} type - MIME type
   * @returns {Promise<Blob>}
   */
  async base64ToBlob(base64, type = 'application/pdf') {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  }
}

// Make available globally
window.CacheManager = CacheManager;
