/**
 * Site Configurations - Defines selectors and behaviors for different AI chat platforms
 */
class SiteConfigs {
  constructor() {
    this.configs = {
      'chatgpt.com': {
        name: 'ChatGPT',
        selectors: {
          // Main chat input textarea - more specific for ChatGPT.com
          inputBox: 'textarea[placeholder*="Message"], div[contenteditable="true"], #prompt-textarea, textarea',
          // File upload area or input
          fileInput: 'input[type="file"]',
          // Drop zone for files - prioritize the actual input area
          dropZone: 'div[contenteditable="true"], textarea, form, main',
          // Container for progress display
          progressContainer: 'main',
          // Send button
          sendButton: 'button[data-testid*="send"], button[aria-label*="Send"]',
          // Attachment button
          attachButton: 'button[aria-label*="Attach"], button[data-testid*="attach"]'
        },
        uploadMethod: 'dragDrop',
        triggerCommand: '/arxiv',
        // Special handling for ChatGPT.com
        specialHandling: {
          needsInputFocus: true,
          useTextareaEvents: true,
          triggerChange: true
        },
        isValidContext: () => {
          const isCorrectSite = window.location.hostname === 'chatgpt.com' || window.location.hostname.includes('chatgpt.com');
          if (!isCorrectSite) return false;
          
          // Be more lenient during initialization - check for any of these elements
          const hasAnyElement = document.querySelector('textarea') !== null || 
                               document.querySelector('div[contenteditable="true"]') !== null ||
                               document.querySelector('form') !== null ||
                               document.querySelector('main') !== null ||
                               document.querySelector('[data-testid]') !== null;
          
          return hasAnyElement;
        }
      },

      'chat.openai.com': {
        name: 'ChatGPT',
        selectors: {
          // Main chat input textarea
          inputBox: 'textarea[data-id], #prompt-textarea, textarea[placeholder*="Message"], div[contenteditable="true"][data-id], div[contenteditable="true"]',
          // File upload area or input (multiple selectors for different versions)
          fileInput: 'input[type="file"], input[accept*="pdf"], input[multiple]',
          // Drop zone for files - more comprehensive selectors
          dropZone: 'main, [data-testid], .composer, .chat-container, form, div[role="textbox"]',
          // Container for progress display
          progressContainer: 'main, .chat-container, .conversation-turn',
          // Send button
          sendButton: '[data-testid="send-button"], button[aria-label*="Send"], button[type="submit"]',
          // Attachment button to trigger file input
          attachButton: 'button[aria-label*="Attach"], button[aria-label*="upload"], [data-testid*="attach"], [aria-label*="file"]'
        },
        uploadMethod: 'dragDrop',
        triggerCommand: '/arxiv',
        isValidContext: () => {
          return window.location.hostname === 'chat.openai.com' && 
                 (document.querySelector('textarea') !== null || 
                  document.querySelector('div[contenteditable="true"]') !== null);
        }
      },

      'gemini.google.com': {
        name: 'Gemini',
        selectors: {
          inputBox: 'rich-textarea[placeholder*="Enter a prompt"], .ql-editor[contenteditable="true"], textarea[aria-label*="Enter a prompt"], rich-textarea, .message-input, [data-testid="text-input"]',
          fileInput: 'input[type="file"]',
          dropZone: 'rich-textarea, .ql-editor, .conversation-container, .chat-input-container, main, form',
          progressContainer: '.response-container, .conversation-container, main',
          sendButton: 'button[aria-label*="Send"], [data-testid="send-button"]'
        },
        uploadMethod: 'fileInput',
        triggerCommand: '/arxiv',
        // Special handling for Gemini
        specialHandling: {
          needsScrollToInput: true,
          handleExistingConversation: true
        },
        isValidContext: () => {
          return window.location.hostname.includes('gemini.google.com') && 
                 (window.location.pathname.includes('/chat') || 
                  document.querySelector('rich-textarea') !== null ||
                  document.querySelector('.ql-editor') !== null);
        }
      },

      'aistudio.google.com': {
        name: 'AI Studio',
        selectors: {
          inputBox: 'textarea[placeholder*="Enter your prompt"], textarea[placeholder*="prompt"], .ProseMirror, div[contenteditable="true"], textarea, .message-input, [role="textbox"]',
          fileInput: 'input[type="file"]',
          dropZone: '.file-drop-area, .upload-container, .chat-container, textarea, .ProseMirror, main, form',
          progressContainer: '.chat-container, .conversation, main',
          sendButton: 'button[aria-label*="Send"], [data-testid="send-button"], button[type="submit"]'
        },
        uploadMethod: 'fileInput',
        triggerCommand: '/arxiv',
        // Special handling for AI Studio
        specialHandling: {
          needsInputFocus: true,
          handleProseMirror: true
        },
        isValidContext: () => {
          return window.location.hostname.includes('aistudio.google.com') &&
                 (window.location.pathname.includes('/chat') || 
                  window.location.pathname.includes('/prompt') ||
                  window.location.pathname.includes('/app') ||
                  document.querySelector('textarea') !== null ||
                  document.querySelector('.ProseMirror') !== null ||
                  document.querySelector('div[contenteditable="true"]') !== null);
        }
      }
    };

    this.currentSite = this.detectCurrentSite();
  }

  /**
   * Detect which AI site we're currently on
   * @returns {string|null} - Site key or null if not supported
   */
  detectCurrentSite() {
    const hostname = window.location.hostname;
    
    for (const [siteKey, config] of Object.entries(this.configs)) {
      if (hostname.includes(siteKey)) {
        console.log(`Detected AI site: ${config.name}`);
        return siteKey;
      }
    }
    
    console.log('Current site not supported for arXiv extension');
    return null;
  }

  /**
   * Get configuration for current site
   * @returns {object|null} - Site configuration or null
   */
  getCurrentConfig() {
    return this.currentSite ? this.configs[this.currentSite] : null;
  }

  /**
   * Check if current site and context is valid for the extension
   * @returns {boolean}
   */
  isValidContext() {
    const config = this.getCurrentConfig();
    if (!config) return false;
    
    try {
      return config.isValidContext();
    } catch (error) {
      console.error('Error checking context validity:', error);
      return false;
    }
  }

  /**
   * Find the main input element on the current site
   * @returns {Element|null}
   */
  getInputElement() {
    const config = this.getCurrentConfig();
    if (!config) return null;

    const selectors = config.selectors.inputBox.split(', ');
    
    for (const selector of selectors) {
      const element = document.querySelector(selector.trim());
      if (element) {
        console.log(`Found input element with selector: ${selector}`);
        return element;
      }
    }

    // If we reach here nothing was found immediately
    const siteName = config.name;
    if (siteName === 'AI Studio') {
      // AI Studio 页面常在 SPA 切换后异步渲染输入框，避免反复打印警告
      console.debug('AI Studio: input element not yet available (will retry later)');
    } else {
      console.warn('Input element not found for current site');
    }
    return null;
  }

  /**
   * Find file input element for uploading
   * @returns {Element|null}
   */
  getFileInputElement() {
    const config = this.getCurrentConfig();
    if (!config) return null;

    const element = document.querySelector(config.selectors.fileInput);
    if (!element) {
      console.warn('File input element not found');
    }
    return element;
  }

  /**
   * Find drop zone element for drag and drop upload
   * @returns {Element|null}
   */
  getDropZoneElement() {
    const config = this.getCurrentConfig();
    if (!config) return null;

    const selectors = config.selectors.dropZone.split(', ');
    
    for (const selector of selectors) {
      const element = document.querySelector(selector.trim());
      if (element) {
        console.log(`Found drop zone with selector: ${selector}`);
        return element;
      }
    }

    console.warn('Drop zone element not found');
    return null;
  }

  /**
   * Find container for progress display
   * @returns {Element|null}
   */
  getProgressContainer() {
    const config = this.getCurrentConfig();
    if (!config) return null;

    const selectors = config.selectors.progressContainer.split(', ');
    
    for (const selector of selectors) {
      const element = document.querySelector(selector.trim());
      if (element) {
        return element;
      }
    }

    // Fallback to body
    return document.body;
  }

  /**
   * Get preferred upload method for current site
   * @returns {string} - 'dragDrop' or 'fileInput'
   */
  getUploadMethod() {
    const config = this.getCurrentConfig();
    return config ? config.uploadMethod : 'fileInput';
  }

  /**
   * Get trigger command for current site
   * @returns {string}
   */
  getTriggerCommand() {
    const config = this.getCurrentConfig();
    return config ? config.triggerCommand : '/arxiv';
  }

  /**
   * Check if input contains trigger command
   * @param {string} inputText - Text from input element
   * @returns {boolean}
   */
  containsTriggerCommand(inputText) {
    const command = this.getTriggerCommand();
    return inputText.trim().toLowerCase().includes(command.toLowerCase());
  }

  /**
   * Remove trigger command from input text
   * @param {string} inputText - Text from input element
   * @returns {string} - Cleaned text
   */
  removeTriggerCommand(inputText) {
    const command = this.getTriggerCommand();
    return inputText.replace(new RegExp(command, 'gi'), '').trim();
  }

  /**
   * Wait for element to appear in DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element>}
   */
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
}

// Make available globally
window.SiteConfigs = SiteConfigs;
