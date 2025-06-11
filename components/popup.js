/**
 * Popup Script for arXiv AI Extension
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadExtensionStats();
  setupEventListeners();
});

/**
 * Load and display extension statistics
 */
async function loadExtensionStats() {
  const loadingEl = document.getElementById('loading');
  const mainContentEl = document.getElementById('main-content');
  
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('Could not get current tab');
    }
    
    // Check if current site is supported
    const supportedSites = [
      'chatgpt.com',
      'chat.openai.com',
      'gemini.google.com',
      'aistudio.google.com'
    ];
    
    const isSupported = supportedSites.some(site => tab.url.includes(site));
    const currentSite = isSupported ? getSiteName(tab.url) : 'Not supported';
    
    // Try to get stats from content script
    let stats = {
      currentSite: currentSite,
      cacheEntries: 0,
      cacheSize: '0 MB',
      isListening: false
    };
    
    if (isSupported) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATS' });
        if (response && response.success) {
          stats = response.stats;
        }
      } catch (error) {
        console.log('Could not get stats from content script:', error);
        // Extension might not be loaded yet
      }
    }
    
    // Update UI with stats
    updateStatsDisplay(stats);
    updateStatusDisplay(isSupported && stats.isListening);
    
    // Hide loading, show content
    loadingEl.style.display = 'none';
    mainContentEl.style.display = 'block';
    
  } catch (error) {
    console.error('Error loading extension stats:', error);
    showError('Failed to load extension status');
  }
}

/**
 * Update statistics display
 * @param {object} stats - Extension statistics
 */
function updateStatsDisplay(stats) {
  document.getElementById('current-site').textContent = stats.currentSite;
  document.getElementById('cache-count').textContent = stats.cacheEntries;
  document.getElementById('cache-size').textContent = stats.cacheSize;
}

/**
 * Update status display
 * @param {boolean} isActive - Whether extension is active
 */
function updateStatusDisplay(isActive) {
  const statusEl = document.getElementById('status');
  const statusTextEl = statusEl.querySelector('.status-text');
  
  if (isActive) {
    statusEl.classList.remove('inactive');
    statusTextEl.textContent = 'Active - Ready to detect /arxiv';
  } else {
    statusEl.classList.add('inactive');
    statusTextEl.textContent = 'Inactive - Go to supported AI site';
  }
}

/**
 * Setup event listeners for popup buttons
 */
function setupEventListeners() {
  // Clear cache button
  document.getElementById('clear-cache').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) return;
      
      // Try to clear cache via content script
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_CACHE' });
      
      if (response && response.success) {
        showSuccess(`Cleared ${response.count} cached papers`);
        // Refresh stats
        await loadExtensionStats();
      } else {
        // Fallback: clear cache directly
        const result = await clearCacheDirectly();
        showSuccess(`Cleared ${result.count} cached papers`);
        await loadExtensionStats();
      }
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Try direct cache clear as fallback
      try {
        const result = await clearCacheDirectly();
        showSuccess(`Cleared ${result.count} cached papers`);
        await loadExtensionStats();
      } catch (fallbackError) {
        showError('Failed to clear cache');
      }
    }
  });
  
  // Test import button
  document.getElementById('test-import').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) return;
      
      // Check if current site is supported
      const supportedSites = [
        'chatgpt.com',
        'chat.openai.com',
        'gemini.google.com',
        'aistudio.google.com'
      ];
      
      const isSupported = supportedSites.some(site => tab.url.includes(site));
      
      if (!isSupported) {
        showError('Please go to ChatGPT, Gemini, or AI Studio first');
        return;
      }
      
      // Test with a sample arXiv paper
      const testPaperId = '2506.05046';
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'ARXIV_IMPORT',
        input: testPaperId
      });
      
      if (response && response.success) {
        showSuccess('Test import successful!');
      } else {
        showError(response?.error || 'Test import failed');
      }
      
    } catch (error) {
      console.error('Error testing import:', error);
      showError('Test import failed - make sure you\'re on a supported site');
    }
  });
}

/**
 * Clear cache directly using storage API
 * @returns {Promise<{count: number}>}
 */
async function clearCacheDirectly() {
  const allData = await chrome.storage.local.get(null);
  const cacheKeys = Object.keys(allData).filter(key => key.startsWith('arxiv_cache_'));
  
  if (cacheKeys.length > 0) {
    await chrome.storage.local.remove(cacheKeys);
  }
  
  return { count: cacheKeys.length };
}

/**
 * Get site name from URL
 * @param {string} url - Site URL
 * @returns {string} - Friendly site name
 */
function getSiteName(url) {
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'ChatGPT';
  if (url.includes('gemini.google.com')) return 'Gemini';
  if (url.includes('aistudio.google.com')) return 'AI Studio';
  return 'Unknown';
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
  showNotification(message, 'success');
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  showNotification(message, 'error');
}

/**
 * Show notification message
 * @param {string} message - Message to show
 * @param {string} type - Message type ('success' or 'error')
 */
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add styles
  Object.assign(notification.style, {
    position: 'fixed',
    top: '10px',
    left: '10px',
    right: '10px',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    zIndex: '1000',
    animation: 'slideDown 0.3s ease-out'
  });
  
  if (type === 'success') {
    Object.assign(notification.style, {
      background: '#d1fae5',
      color: '#065f46',
      border: '1px solid #a7f3d0'
    });
  } else if (type === 'error') {
    Object.assign(notification.style, {
      background: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fecaca'
    });
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideUp 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-20px);
    }
  }
`;
document.head.appendChild(style);
