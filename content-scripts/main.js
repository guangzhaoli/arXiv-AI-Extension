/**
 * Main Content Script - Entry point for the arXiv AI Extension
 */
class ArxivExtension {
  constructor() {
    this.siteConfigs = null;
    this.chatDetector = null;
    this.fileInjector = null;
    this.cacheManager = null;
    this.arxivParser = null;
    this.progressTracker = null;
    this.initialized = false;
  }

  /**
   * Initialize the extension
   */
  async init() {
    if (this.initialized) {
      console.log('arXiv Extension already initialized');
      return;
    }

    console.log('Initializing arXiv AI Extension...');
    
    try {
      // Initialize core components
      this.siteConfigs = new SiteConfigs();
      this.arxivParser = new ArxivParser();
      this.cacheManager = new CacheManager();
      this.progressTracker = new ProgressTracker();
      
      // Check if current site is supported
      if (!this.siteConfigs.getCurrentConfig()) {
        console.log('Current site not supported by arXiv extension');
        return;
      }

      // Initialize file injector and chat detector
      this.fileInjector = new FileInjector(this.siteConfigs, this.progressTracker);
      this.chatDetector = new ChatDetector(this.siteConfigs);

      // Start monitoring chat input
      this.chatDetector.start();

      // Clean up expired cache entries
      await this.cacheManager.clearExpired();

      this.initialized = true;
      console.log('arXiv AI Extension initialized successfully');

      // Make this instance globally available
      window.arxivExtension = this;

    } catch (error) {
      console.error('Failed to initialize arXiv extension:', error);
    }
  }

  /**
   * Main function to import arXiv paper
   * @param {string} input - arXiv URL or paper ID
   * @returns {Promise<boolean>} - Success status
   */
  async importArxivPaper(input) {
    console.log('Starting arXiv paper import:', input);
    
    try {
      // Step 1: Parse input
      this.progressTracker.start('parse');
      const parseResult = this.arxivParser.parse(input);
      
      if (!parseResult.success) {
        throw new Error(parseResult.error);
      }

      const paperId = parseResult.paperId;
      console.log('Parsed paper ID:', paperId);
      this.progressTracker.complete('Parsing completed');

      // Step 2: Check cache
      this.progressTracker.start('cache');
      const cached = await this.cacheManager.exists(paperId);
      
      let pdfBlob, title;
      
      if (cached) {
        console.log('Paper found in cache');
        this.progressTracker.complete('Found in cache');
        
        const cacheResult = await this.cacheManager.retrieve(paperId);
        pdfBlob = cacheResult.blob;
        title = cacheResult.title;
      } else {
        // Step 3: Download PDF
        console.log('Downloading PDF from arXiv...');
        this.progressTracker.start('download');
        
        const downloadResult = await this.downloadPDF(paperId);
        pdfBlob = downloadResult.blob;
        title = downloadResult.title;
        
        this.progressTracker.complete('Download completed');
        
        // Cache the downloaded PDF
        await this.cacheManager.store(paperId, pdfBlob, title);
      }

      // Step 4: Inject file into chat
      console.log('Injecting PDF into chat...');
      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}_${paperId}.pdf`;
      
      // Transition from download to upload progress
      this.progressTracker.updateProgress(100, 'Download completed, starting upload...');
      await this.delay(300); // Brief pause to show transition
      
      await this.fileInjector.injectFile(pdfBlob, filename);
      
      console.log('arXiv paper imported successfully');
      return true;

    } catch (error) {
      console.error('Failed to import arXiv paper:', error);
      
      // Show error in progress tracker if it exists
      if (this.progressTracker) {
        this.progressTracker.error(error.message);
      }
      
      throw error;
    }
  }

  /**
   * Utility function to create delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Download PDF from arXiv via background script
   * @param {string} paperId - arXiv paper ID
   * @returns {Promise<{blob: Blob, title: string}>}
   */
  async downloadPDF(paperId) {
    const urls = this.arxivParser.generateUrls(paperId);
    
    try {
      // Try to get paper title first from abstract page
      let title = 'arXiv Paper';
      try {
        const titleResponse = await chrome.runtime.sendMessage({
          type: 'FETCH_TITLE',
          url: urls.abstract
        });
        
        if (titleResponse && titleResponse.success) {
          title = this.arxivParser.extractTitle(titleResponse.html);
        }
      } catch (error) {
        console.warn('Could not fetch paper title:', error);
      }

      // Download PDF via background script
      console.log('Downloading PDF from:', urls.pdf);
      
      
      const downloadResponse = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_PDF',
        url: urls.pdf,
        filename: `${paperId}.pdf`
      });

      
      if (!downloadResponse || !downloadResponse.success) {
        throw new Error(downloadResponse?.error || 'Download failed');
      }

      // Convert base64 back to blob
      const blob = await this.base64ToBlob(downloadResponse.data, downloadResponse.type);
      
      return {
        blob: blob,
        title: title
      };

    } catch (error) {
      console.error('PDF download failed:', error);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Convert base64 string to blob (optimized for large files)
   * @param {string} base64 - Base64 string
   * @param {string} type - MIME type
   * @returns {Promise<Blob>}
   */
  async base64ToBlob(base64, type = 'application/pdf') {
    try {
      // For smaller files, use simple approach
      if (base64.length < 1024 * 1024) { // Less than ~750KB
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type });
      }
      
      // For larger files, process in chunks to avoid stack overflow
      const chunkSize = 1024; // Process 1KB at a time
      const chunks = [];
      
      for (let i = 0; i < base64.length; i += chunkSize) {
        const chunk = base64.slice(i, i + chunkSize);
        const byteCharacters = atob(chunk);
        const byteArray = new Uint8Array(byteCharacters.length);
        
        for (let j = 0; j < byteCharacters.length; j++) {
          byteArray[j] = byteCharacters.charCodeAt(j);
        }
        
        chunks.push(byteArray);
        
        // Allow other operations to run
        if (i % (chunkSize * 100) === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      return new Blob(chunks, { type });
      
    } catch (error) {
      console.error('Error converting base64 to blob:', error);
      
      // Fallback: use fetch with data URI for very large files
      try {
        const dataUri = `data:${type};base64,${base64}`;
        const response = await fetch(dataUri);
        return await response.blob();
      } catch (fallbackError) {
        console.error('Fallback conversion also failed:', fallbackError);
        throw new Error('Failed to convert PDF data');
      }
    }
  }

  /**
   * Get extension statistics
   * @returns {Promise<object>} - Extension stats
   */
  async getStats() {
    const cacheStats = await this.cacheManager.getStats();
    const config = this.siteConfigs.getCurrentConfig();
    
    return {
      currentSite: config ? config.name : 'Unknown',
      cacheEntries: cacheStats.totalEntries,
      cacheSize: `${(cacheStats.totalSize / 1024 / 1024).toFixed(2)} MB`,
      isListening: this.chatDetector ? this.chatDetector.isListening : false
    };
  }

  /**
   * Clear all cached papers
   * @returns {Promise<number>} - Number of entries cleared
   */
  async clearCache() {
    if (!this.cacheManager) return 0;
    
    const stats = await this.cacheManager.getStats();
    const totalEntries = stats.totalEntries;
    
    // Clear all cache entries
    const allData = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allData).filter(key => 
      key.startsWith(this.cacheManager.cachePrefix)
    );
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
    
    console.log(`Cleared ${keysToRemove.length} cache entries`);
    return keysToRemove.length;
  }

  /**
   * Restart the extension
   */
  async restart() {
    console.log('Restarting arXiv extension...');
    
    if (this.chatDetector) {
      this.chatDetector.stop();
    }
    
    this.initialized = false;
    await this.init();
  }

  /**
   * Handle page navigation/changes
   */
  handlePageChange() {
    console.log('Page change detected, checking context...');
    
    if (this.siteConfigs && this.siteConfigs.isValidContext()) {
      if (!this.chatDetector.isListening) {
        console.log('Starting chat detector for new context');
        this.chatDetector.start();
      }
    } else {
      if (this.chatDetector && this.chatDetector.isListening) {
        console.log('Stopping chat detector - invalid context');
        this.chatDetector.stop();
      }
    }
  }
}

// Initialize the extension when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

async function initializeExtension() {
  // Wait a bit for page to stabilize
  setTimeout(async () => {
    const extension = new ArxivExtension();
    await extension.init();
    
    // Listen for page changes (for SPAs)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        extension.handlePageChange();
      }
    }).observe(document, { subtree: true, childList: true });
    
  }, 1000);
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ARXIV_IMPORT') {
    if (window.arxivExtension) {
      window.arxivExtension.importArxivPaper(message.input)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    } else {
      sendResponse({ success: false, error: 'Extension not initialized' });
    }
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'DOWNLOAD_PROGRESS') {
    if (window.arxivExtension && window.arxivExtension.progressTracker) {
      const pct = Math.min(Math.max(message.percent || 0, 0), 100);
      window.arxivExtension.progressTracker.updateProgress(
        pct,
        `Downloading PDF... ${pct}%`
      );
    }
    return; // No response expected
  }
  
  if (message.type === 'GET_STATS') {
    if (window.arxivExtension) {
      window.arxivExtension.getStats()
        .then(stats => sendResponse({ success: true, stats }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    } else {
      sendResponse({ success: false, error: 'Extension not initialized' });
    }
    return true;
  }
});

console.log('arXiv AI Extension content script loaded');
