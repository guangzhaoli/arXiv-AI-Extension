/**
 * Chat Detector - Monitors chat input for /arxiv command and triggers the modal
 */
class ChatDetector {
  constructor(siteConfigs) {
    this.siteConfigs = siteConfigs;
    this.isListening = false;
    this.inputElement = null;
    this.observer = null;
    this.keyboardHandler = null;
    this.modalVisible = false;
  }

  /**
   * Start monitoring the chat input
   */
  start() {
    if (this.isListening) {
      console.log('Chat detector already running');
      return;
    }

    if (!this.siteConfigs.isValidContext()) {
      console.log('Invalid context for chat detection');
      return;
    }

    console.log('Starting chat detector...');
    this.findAndAttachToInput();
    this.setupMutationObserver();
    this.isListening = true;
  }

  /**
   * Stop monitoring the chat input
   */
  stop() {
    if (!this.isListening) return;

    console.log('Stopping chat detector...');
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.proseMirrorObserver) {
      this.proseMirrorObserver.disconnect();
      this.proseMirrorObserver = null;
    }

    if (this.inputElement && this.keyboardHandler) {
      this.inputElement.removeEventListener('keydown', this.keyboardHandler);
      this.inputElement.removeEventListener('input', this.keyboardHandler);
      this.inputElement.removeEventListener('keyup', this.keyboardHandler);
      this.inputElement.removeEventListener('paste', this.keyboardHandler);
    }

    this.isListening = false;
    this.inputElement = null;
    this.keyboardHandler = null;
  }

  /**
   * Find and attach to the input element
   */
  findAndAttachToInput() {
    const inputElement = this.siteConfigs.getInputElement();
    
    if (inputElement && inputElement !== this.inputElement) {
      console.log('Found chat input element');
      this.attachToInput(inputElement);
    } else if (!inputElement) {
      const cfg = this.siteConfigs.getCurrentConfig
        ? this.siteConfigs.getCurrentConfig()
        : null;
      if (cfg && cfg.name === 'AI Studio') {
        // AI Studio 页面经常 SPA 切换后延迟渲染输入框，避免反复警告
        console.debug('AI Studio: chat input element not yet available (will retry)');
      } else {
        console.warn('Chat input element not found');
      }
    }
  }

  /**
   * Attach event listeners to the input element
   * @param {Element} inputElement - The input element to monitor
   */
  attachToInput(inputElement) {
    // Remove previous listeners if any
    if (this.inputElement && this.keyboardHandler) {
      this.inputElement.removeEventListener('keydown', this.keyboardHandler);
      this.inputElement.removeEventListener('input', this.keyboardHandler);
      this.inputElement.removeEventListener('keyup', this.keyboardHandler);
      this.inputElement.removeEventListener('paste', this.keyboardHandler);
    }

    this.inputElement = inputElement;
    
    // Create the event handler
    this.keyboardHandler = (event) => this.handleInputEvent(event);
    
    // Listen for multiple event types (especially important for AI Studio's ProseMirror)
    this.inputElement.addEventListener('keydown', this.keyboardHandler);
    this.inputElement.addEventListener('input', this.keyboardHandler);
    this.inputElement.addEventListener('keyup', this.keyboardHandler);
    this.inputElement.addEventListener('paste', this.keyboardHandler);
    
    // Special handling for AI Studio (ProseMirror editor)
    const config = this.siteConfigs.getCurrentConfig();
    if (config && config.name === 'AI Studio') {
      // Also listen for DOMSubtreeModified or MutationObserver for ProseMirror
      this.setupAIStudioSpecialHandling(inputElement);
    }
    
    console.log(`Attached event listeners to ${inputElement.tagName} input element for ${config ? config.name : 'unknown site'}`);
  }

  /**
   * Special handling for AI Studio's ProseMirror editor
   * @param {Element} inputElement - The ProseMirror element
   */
  setupAIStudioSpecialHandling(inputElement) {
    console.log('Setting up AI Studio special handling for ProseMirror...');
    
    // Create a MutationObserver to watch for text changes in ProseMirror
    const proseMirrorObserver = new MutationObserver((mutations) => {
      let textChanged = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          textChanged = true;
        }
      });
      
      if (textChanged) {
        // Simulate an input event
        this.handleInputEvent({ type: 'mutation', target: inputElement });
      }
    });
    
    proseMirrorObserver.observe(inputElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Store the observer for cleanup
    this.proseMirrorObserver = proseMirrorObserver;
  }

  /**
   * Handle input events (keydown and input)
   * @param {Event} event - The input event
   */
  handleInputEvent(event) {
    if (this.modalVisible) return; // Don't trigger if modal is already open

    const inputText = this.getInputText();
    if (!inputText) return;

    // Check for /arxiv command
    if (this.siteConfigs.containsTriggerCommand(inputText)) {
      console.log('Detected /arxiv command in input');
      
      // Prevent default if it's a keydown event
      if (event.type === 'keydown') {
        event.preventDefault();
      }
      
      // Clear the trigger command from input
      this.clearTriggerFromInput();
      
      // Show the arXiv modal
      this.showArxivModal();
    }
  }

  /**
   * Get text from the input element
   * @returns {string} - Input text
   */
  getInputText() {
    if (!this.inputElement) return '';

    // Handle different types of input elements
    if (this.inputElement.tagName.toLowerCase() === 'textarea' || 
        this.inputElement.tagName.toLowerCase() === 'input') {
      return this.inputElement.value || '';
    } else if (this.inputElement.contentEditable === 'true') {
      return this.inputElement.textContent || this.inputElement.innerText || '';
    }

    return '';
  }

  /**
   * Clear the trigger command from the input
   */
  clearTriggerFromInput() {
    if (!this.inputElement) return;

    const currentText = this.getInputText();
    const cleanedText = this.siteConfigs.removeTriggerCommand(currentText);

    // Set the cleaned text back to the input
    if (this.inputElement.tagName.toLowerCase() === 'textarea' || 
        this.inputElement.tagName.toLowerCase() === 'input') {
      this.inputElement.value = cleanedText;
    } else if (this.inputElement.contentEditable === 'true') {
      this.inputElement.textContent = cleanedText;
    }

    // Trigger input event to notify the UI
    const inputEvent = new Event('input', { bubbles: true });
    this.inputElement.dispatchEvent(inputEvent);
  }

  /**
   * Show the arXiv input modal
   */
  showArxivModal() {
    this.modalVisible = true;
    
    // Create modal if it doesn't exist
    if (!document.querySelector('#arxiv-modal')) {
      this.createModal();
    }

    const modal = document.querySelector('#arxiv-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('visible');
      
      // Clear input field and focus (always start fresh)
      const inputField = modal.querySelector('#arxiv-input');
      if (inputField) {
        inputField.value = ''; // Always clear previous input
        setTimeout(() => inputField.focus(), 100);
      }
      
      // Clear any existing error messages
      const existingError = modal.querySelector('.arxiv-error');
      if (existingError) {
        existingError.remove();
      }
    }
  }

  /**
   * Hide the arXiv modal
   */
  hideArxivModal() {
    const modal = document.querySelector('#arxiv-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('visible');
    }
    this.modalVisible = false;
  }

  /**
   * Create the arXiv input modal
   */
  createModal() {
    // Insert progress tracker HTML first
    const progressHTML = ProgressTracker.createProgressHTML();
    document.body.insertAdjacentHTML('beforeend', progressHTML);

    // Create modal HTML
    const modalHTML = `
      <div id="arxiv-modal" class="arxiv-modal">
        <div class="arxiv-modal-content">
          <div class="arxiv-modal-header">
            <h3>Import arXiv Paper</h3>
            <button class="arxiv-modal-close">&times;</button>
          </div>
          <div class="arxiv-modal-body">
            <label for="arxiv-input">Enter arXiv URL or Paper ID:</label>
            <input type="text" id="arxiv-input" placeholder="e.g., https://arxiv.org/abs/2506.05046 or 2506.05046" />
            <div class="arxiv-examples">
              <small>Examples:</small>
              <ul>
                <li><code>2506.05046</code></li>
                <li><code>https://arxiv.org/abs/2506.05046</code></li>
                <li><code>https://arxiv.org/pdf/2506.05046.pdf</code></li>
              </ul>
            </div>
          </div>
          <div class="arxiv-modal-footer">
            <button id="arxiv-cancel" class="arxiv-btn arxiv-btn-secondary">Cancel</button>
            <button id="arxiv-import" class="arxiv-btn arxiv-btn-primary">Import Paper</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.attachModalEventListeners();
  }

  /**
   * Attach event listeners to the modal
   */
  attachModalEventListeners() {
    const modal = document.querySelector('#arxiv-modal');
    const closeBtn = document.querySelector('.arxiv-modal-close');
    const cancelBtn = document.querySelector('#arxiv-cancel');
    const importBtn = document.querySelector('#arxiv-import');
    const input = document.querySelector('#arxiv-input');

    // Close modal events
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideArxivModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideArxivModal());
    }

    // Click outside to close
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          this.hideArxivModal();
        }
      });
    }

    // Import button
    if (importBtn) {
      importBtn.addEventListener('click', () => this.handleImportClick());
    }

    // Enter key to import
    if (input) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          this.handleImportClick();
        } else if (event.key === 'Escape') {
          this.hideArxivModal();
        }
      });
    }
  }

  /**
   * Handle import button click
   */
  async handleImportClick() {
    const input = document.querySelector('#arxiv-input');
    if (!input) return;

    const arxivInput = input.value.trim();
    if (!arxivInput) {
      this.showError('Please enter an arXiv URL or paper ID');
      return;
    }

    try {
      // Close modal immediately after starting the import
      this.hideArxivModal();
      
      // Trigger the arXiv import process (runs in background)
      await window.arxivExtension.importArxivPaper(arxivInput);
    } catch (error) {
      // If there's an error, show it via progress tracker instead of modal
      console.error('arXiv import failed:', error);
      
      // Optionally show error notification
      if (window.arxivExtension && window.arxivExtension.progressTracker) {
        window.arxivExtension.progressTracker.error(error.message);
      }
    }
  }

  /**
   * Show error message in the modal
   * @param {string} message - Error message
   */
  showError(message) {
    // Remove existing error
    const existingError = document.querySelector('.arxiv-error');
    if (existingError) {
      existingError.remove();
    }

    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'arxiv-error';
    errorDiv.textContent = message;

    const modalBody = document.querySelector('.arxiv-modal-body');
    if (modalBody) {
      modalBody.appendChild(errorDiv);
      
      // Auto-hide error after 5 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.remove();
        }
      }, 5000);
    }
  }

  /**
   * Setup mutation observer to detect DOM changes
   */
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      // Check if input element still exists or if new ones appeared
      let shouldRecheckInput = false;

      mutations.forEach((mutation) => {
        // Check for added/removed nodes
        if (mutation.type === 'childList') {
          shouldRecheckInput = true;
        }
      });

      if (shouldRecheckInput) {
        // Debounce the recheck
        clearTimeout(this.recheckTimeout);
        this.recheckTimeout = setTimeout(() => {
          this.findAndAttachToInput();
        }, 500);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Make available globally
window.ChatDetector = ChatDetector;
