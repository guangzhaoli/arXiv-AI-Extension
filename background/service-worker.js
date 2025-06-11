/**
 * Background Service Worker for arXiv AI Extension
 */

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('arXiv AI Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      'arxiv_settings': {
        autoCache: true,
        cacheExpiry: 7, // days
        showNotifications: true,
        version: '1.0.0'
      }
    });
    
    console.log('Extension settings initialized');
  }
});

// Handle browser action click (when user clicks extension icon)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if current tab is supported
    const supportedSites = [
      'chatgpt.com',
      'chat.openai.com',
      'gemini.google.com', 
      'aistudio.google.com'
    ];
    
    const isSupported = supportedSites.some(site => tab.url.includes(site));
    
    if (!isSupported) {
      // Show notification for unsupported sites
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icons/icon48.png',
        title: 'arXiv AI Extension',
        message: 'This extension only works on ChatGPT, Gemini, and AI Studio.'
      });
      return;
    }
    
    // Get extension stats from content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATS' });
    
    if (response && response.success) {
      console.log('Extension stats:', response.stats);
    }
    
  } catch (error) {
    console.error('Error handling browser action:', error);
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_PDF') {
    const tabId = sender.tab ? sender.tab.id : null;
    handlePDFDownload(message.url, message.filename, tabId)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open
  }
  
  if (message.type === 'FETCH_TITLE') {
    fetchTitle(message.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'SHOW_NOTIFICATION') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: message.title || 'arXiv AI Extension',
      message: message.message
    });
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_SETTINGS') {
    getSettings()
      .then(settings => sendResponse({ success: true, settings }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'SET_SETTINGS') {
    setSettings(message.settings)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Download PDF file using background script (for better CORS handling)
 * @param {string} url - PDF URL
 * @param {string} filename - Filename
 * @returns {Promise<object>}
 */
async function handlePDFDownload(url, filename, tabId = null) {
  try {
    console.log('Background downloading PDF:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    
    // Stream response to track progress
    const contentLength = parseInt(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      
      // Send progress update to content script if possible
      if (tabId && contentLength) {
        const percent = Math.round((received / contentLength) * 100);
        chrome.tabs.sendMessage(tabId, {
          type: 'DOWNLOAD_PROGRESS',
          percent
        }).catch(() => {});
      }
    }
    
    const blob = new Blob(chunks, { type: 'application/pdf' });
    const arrayBuffer = await blob.arrayBuffer();
    
    const base64 = await arrayBufferToBase64(arrayBuffer);
    
    // Ensure 100 % progress dispatched
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'DOWNLOAD_PROGRESS',
        percent: 100
      }).catch(() => {});
    }
    
    return {
      success: true,
      data: base64,
      size: blob.size,
      type: blob.type
    };
    
  } catch (error) {
    console.error('Background PDF download failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert ArrayBuffer to base64 string safely (handles large files)
 * @param {ArrayBuffer} buffer - ArrayBuffer to convert
 * @returns {Promise<string>} - Base64 string
 */
async function arrayBufferToBase64(buffer) {
  // Always use FileReader approach for safety - avoids all stack overflow issues
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result;
          if (typeof result === 'string' && result.includes(',')) {
            const base64 = result.split(',')[1]; // Remove data:mime;base64, prefix
            resolve(base64);
          } else {
            reject(new Error('Invalid FileReader result format'));
          }
        } catch (error) {
          reject(new Error('Error processing FileReader result: ' + error.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('FileReader failed to read blob'));
      };
      
      reader.onabort = () => {
        reject(new Error('FileReader operation was aborted'));
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(new Error('Error setting up FileReader: ' + error.message));
    }
  });
}

/**
 * Fetch HTML content for title extraction
 * @param {string} url - URL to fetch
 * @returns {Promise<object>}
 */
async function fetchTitle(url) {
  try {
    console.log('Background fetching title from:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    return {
      success: true,
      html: html
    };
    
  } catch (error) {
    console.error('Background title fetch failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get extension settings
 * @returns {Promise<object>}
 */
async function getSettings() {
  const result = await chrome.storage.local.get('arxiv_settings');
  return result.arxiv_settings || {
    autoCache: true,
    cacheExpiry: 7,
    showNotifications: true,
    version: '1.0.0'
  };
}

/**
 * Set extension settings
 * @param {object} settings - New settings
 * @returns {Promise<void>}
 */
async function setSettings(settings) {
  await chrome.storage.local.set({
    'arxiv_settings': settings
  });
  console.log('Settings updated:', settings);
}

/**
 * Clean up expired cache periodically
 */
async function scheduleCleanup() {
  // Run cleanup every 24 hours
  setInterval(async () => {
    try {
      const settings = await getSettings();
      if (!settings.autoCache) return;
      
      const result = await chrome.storage.local.get(null);
      const now = Date.now();
      const expiry = settings.cacheExpiry * 24 * 60 * 60 * 1000; // Convert days to ms
      
      const keysToRemove = [];
      
      for (const [key, data] of Object.entries(result)) {
        if (key.startsWith('arxiv_cache_') && data.timestamp) {
          if (now - data.timestamp > expiry) {
            keysToRemove.push(key);
          }
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} expired cache entries`);
      }
      
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
}

// Start cleanup scheduler
scheduleCleanup();

// Handle tab updates (for SPA navigation detection)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedSites = [
      'chatgpt.com',
      'chat.openai.com',
      'gemini.google.com',
      'aistudio.google.com'
    ];
    
    const isSupported = supportedSites.some(site => tab.url.includes(site));
    
    if (isSupported) {
      // Inject content script if needed (for dynamic pages)
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          // Check if extension is already loaded
          if (!window.arxivExtension) {
            console.log('Reinitializing arXiv extension after navigation');
            // The content script will handle reinitialization
          }
        }
      }).catch(() => {
        // Ignore errors (script might already be injected)
      });
    }
  }
});

// Handle context menu (right-click) actions
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'arxiv-import' && info.selectionText) {
    // Try to import selected text as arXiv reference
    chrome.tabs.sendMessage(tab.id, {
      type: 'ARXIV_IMPORT',
      input: info.selectionText.trim()
    }).catch(error => {
      console.error('Context menu import failed:', error);
    });
  }
});

// Create context menu when extension starts
chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

function createContextMenu() {
  chrome.contextMenus.create({
    id: 'arxiv-import',
    title: 'Import as arXiv paper',
    contexts: ['selection'],
    documentUrlPatterns: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://gemini.google.com/*',
      'https://aistudio.google.com/*'
    ]
  });
}

// Handle storage changes (for settings sync)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.arxiv_settings) {
    console.log('Settings changed:', changes.arxiv_settings.newValue);
    
    // Notify all content scripts about settings change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (
          tab.url.includes('chatgpt.com') ||
          tab.url.includes('chat.openai.com') ||
          tab.url.includes('gemini.google.com') ||
          tab.url.includes('aistudio.google.com')
        )) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_CHANGED',
            settings: changes.arxiv_settings.newValue
          }).catch(() => {
            // Ignore errors for tabs without content script
          });
        }
      });
    });
  }
});

console.log('arXiv AI Extension background script loaded');
