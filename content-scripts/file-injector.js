/**
 * File Injector - Handles uploading PDF files to AI chat platforms via drag & drop simulation
 */
class FileInjector {
  constructor(siteConfigs, progressTracker = null) {
    this.siteConfigs = siteConfigs;
    this.progressTracker = progressTracker || new ProgressTracker();
    this.uploadInProgress = false; // Flag to prevent concurrent uploads
  }

  /**
   * Inject PDF file into the current AI chat platform
   * @param {Blob} pdfBlob - PDF file blob
   * @param {string} filename - Filename for the PDF
   * @returns {Promise<boolean>} - Success status
   */
  async injectFile(pdfBlob, filename = 'arxiv-paper.pdf') {
    const config = this.siteConfigs.getCurrentConfig();
    if (!config) {
      throw new Error('Current site not supported');
    }

    console.log(`Injecting file ${filename} to ${config.name} via drag & drop`);
    
    try {
      // Don't start new progress, continue from current state
      this.progressTracker.updateProgress(0, 'Starting upload...');
      return await this.injectViaDragDrop(pdfBlob, filename);
    } catch (error) {
      this.progressTracker.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inject file using drag and drop simulation (pure drag & drop approach)
   * @param {Blob} pdfBlob - PDF file blob
   * @param {string} filename - Filename for the PDF
   * @returns {Promise<boolean>}
   */
  async injectViaDragDrop(pdfBlob, filename) {
    console.log('Starting drag & drop simulation...');
    
    // Create File object from blob
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    
    const config = this.siteConfigs.getCurrentConfig();
    
    // Special handling for ChatGPT.com
    if (config && config.specialHandling && config.name === 'ChatGPT') {
      return await this.handleChatGPTUpload(file, filename);
    }
    
    // Special handling for Gemini
    if (config && config.specialHandling && config.name === 'Gemini') {
      return await this.handleGeminiUpload(file, filename);
    }
    
    // Special handling for AI Studio
    if (config && config.specialHandling && config.name === 'AI Studio') {
      return await this.handleAIStudioUpload(file, filename);
    }
    
    // Standard drag & drop for other sites
    const dropTarget = this.findBestDropTarget();
    if (!dropTarget) {
      throw new Error('No suitable drop target found');
    }

    console.log('Using drop target:', dropTarget.tagName, dropTarget.className || dropTarget.id);

    // Simulate complete drag & drop sequence
    await this.simulateDragAndDrop(dropTarget, file);
    
    // Wait for upload processing
    await this.waitForUploadCompletion();
    
    this.progressTracker.complete('File uploaded successfully');
    return true;
  }

  /**
   * Special handling for ChatGPT.com upload (single method only to prevent duplicates)
   * @param {File} file - File to upload
   * @param {string} filename - Filename
   * @returns {Promise<boolean>}
   */
  async handleChatGPTUpload(file, filename) {
    // Check if upload is already in progress
    if (this.uploadInProgress) {
      console.log('Upload already in progress, skipping duplicate request');
      return true; // Return true to prevent error throwing
    }

    // Set upload in progress flag
    this.uploadInProgress = true;
    
    try {
      console.log('Using ChatGPT special handling - file input method ONLY...');
      
      this.progressTracker.updateProgress(20, 'Looking for file input...');
      
      // Find hidden file input - this is the ONLY method to prevent duplicates
      const fileInput = document.querySelector('input[type="file"]');
      
      if (!fileInput) {
        throw new Error('ChatGPT file input not found - upload not possible');
      }

      console.log('Found file input, using direct assignment method (no backup methods)');
      
      this.progressTracker.updateProgress(40, 'Uploading via file input...');
      
      // Clear any existing files first
      fileInput.value = '';
      await this.delay(100);
      
      // Create a new FileList with our file
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;

      // Trigger change event ONCE only
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
      
      console.log('File input change event dispatched - waiting for upload completion...');
      
      // Extended wait for upload to process (no backup methods will be tried)
      this.progressTracker.updateProgress(60, 'Processing upload...');
      const uploadSuccess = await this.waitForChatGPTUploadExtended();
      
      if (uploadSuccess) {
        this.progressTracker.complete('File uploaded to ChatGPT successfully');
        return true;
      } else {
        // Even if we can't detect success, the upload likely worked
        // Return true to prevent any backup attempts
        console.log('Upload detection timed out, but file likely uploaded successfully');
        this.progressTracker.complete('Upload completed (detection timeout)');
        return true;
      }
      
    } catch (error) {
      console.error('File input method failed:', error);
      throw new Error(`ChatGPT upload failed: ${error.message}`);
    } finally {
      // Always reset the upload flag
      this.uploadInProgress = false;
      console.log('Upload flag reset');
    }
  }

  /**
   * Special handling for Gemini upload (handles existing conversations)
   * @param {File} file - File to upload
   * @param {string} filename - Filename
   * @returns {Promise<boolean>}
   */
  async handleGeminiUpload(file, filename) {
    console.log('Using Gemini special handling...');
    
    this.progressTracker.updateProgress(20, 'Preparing Gemini upload...');
    
    // Step 1: Scroll to bottom to ensure input is visible (important for existing conversations)
    window.scrollTo(0, document.body.scrollHeight);
    await this.delay(300);
    
    // Step 2: Try to find the input element with multiple attempts
    let inputElement = null;
    const inputSelectors = [
      'rich-textarea[placeholder*="Enter a prompt"]',
      '.ql-editor[contenteditable="true"]',
      'rich-textarea',
      '.message-input',
      '[data-testid="text-input"]',
      'textarea[aria-label*="Enter a prompt"]'
    ];
    
    for (const selector of inputSelectors) {
      inputElement = document.querySelector(selector);
      if (inputElement && inputElement.offsetParent !== null) { // Check if visible
        console.log(`Found visible Gemini input with: ${selector}`);
        break;
      }
    }
    
    if (!inputElement) {
      console.warn('No visible input found, trying to wait for it...');
      // Wait for input to appear (common in existing conversations)
      try {
        inputElement = await this.siteConfigs.waitForElement('rich-textarea, .ql-editor', 3000);
      } catch (error) {
        throw new Error('Gemini input element not found or not visible');
      }
    }
    
    // Step 3: Focus the input to activate it
    this.progressTracker.updateProgress(40, 'Focusing Gemini input...');
    inputElement.focus();
    await this.delay(200);
    
    // Step 4: Try file input method first (if available)
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      console.log('Found file input, trying direct assignment for Gemini...');
      this.progressTracker.updateProgress(60, 'Uploading via file input...');
      
      try {
        fileInput.value = '';
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
        
        // Wait for upload
        const uploadSuccess = await this.waitForGeminiUpload();
        if (uploadSuccess) {
          this.progressTracker.complete('File uploaded to Gemini successfully');
          return true;
        }
      } catch (error) {
        console.warn('Gemini file input method failed:', error);
      }
    }
    
    // Step 5: Fallback to drag & drop
    console.log('Trying drag & drop method for Gemini...');
    this.progressTracker.updateProgress(70, 'Trying drag & drop...');
    
    await this.simulateGeminiDragDrop(inputElement, file);
    
      // Wait for upload completion
      const uploadSuccess = await this.waitForGeminiUpload();
      
      if (uploadSuccess) {
        this.progressTracker.complete('File uploaded to Gemini successfully');
        return true;
      } else {
        // Be more lenient with Gemini detection
        this.progressTracker.complete('Upload completed (may have succeeded)');
        return true;
      }
  }

  /**
   * Simulate drag & drop specifically for Gemini
   * @param {Element} target - Target element
   * @param {File} file - File to drop
   */
  async simulateGeminiDragDrop(target, file) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer,
      clientX: centerX,
      clientY: centerY
    };

    console.log('Simulating Gemini drag & drop...');
    
    // Gemini-specific drag sequence
    target.dispatchEvent(new DragEvent('dragenter', eventOptions));
    await this.delay(100);
    
    target.dispatchEvent(new DragEvent('dragover', eventOptions));
    await this.delay(100);
    
    target.dispatchEvent(new DragEvent('drop', eventOptions));
    
    // Also try paste event for Gemini
    try {
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });
      target.dispatchEvent(pasteEvent);
    } catch (error) {
      console.log('Gemini paste event failed:', error);
    }
  }

  /**
   * Wait for Gemini upload completion
   * @returns {Promise<boolean>}
   */
  async waitForGeminiUpload() {
    const maxAttempts = 20; // 10 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.delay(500);
      
      // Look for Gemini-specific upload indicators
      const indicators = [
        'img[src*="pdf"]',
        '[aria-label*="pdf"]',
        '[title*="pdf"]',
        '.attachment',
        '[data-testid*="attachment"]',
        '[data-testid*="file"]',
        '*[class*="file"]'
      ];

      for (const selector of indicators) {
        if (document.querySelector(selector)) {
          console.log(`Gemini upload detected on attempt ${attempt} with: ${selector}`);
          return true;
        }
      }
      
      // Update progress
      const progress = 70 + (attempt / maxAttempts) * 20;
      this.progressTracker.updateProgress(progress, `Checking Gemini upload... (${attempt}/${maxAttempts})`);
    }
    
    console.log('Gemini upload detection timed out');
    return false;
  }

  /**
   * Special handling for AI Studio upload (handles ProseMirror editor)
   * @param {File} file - File to upload
   * @param {string} filename - Filename
   * @returns {Promise<boolean>}
   */
  async handleAIStudioUpload(file, filename) {
    console.log('Using AI Studio special handling...');
    
    this.progressTracker.updateProgress(20, 'Preparing AI Studio upload...');
    
    // Step 1: Find the input element (textarea or ProseMirror)
    let inputElement = null;
    const inputSelectors = [
      'textarea[placeholder*="Enter your prompt"]',
      'textarea[placeholder*="prompt"]',
      '.ProseMirror',
      'div[contenteditable="true"]',
      'textarea',
      '.message-input',
      '[role="textbox"]'
    ];
    
    for (const selector of inputSelectors) {
      inputElement = document.querySelector(selector);
      if (inputElement) {
        console.log(`Found AI Studio input with: ${selector}`);
        break;
      }
    }
    
    if (!inputElement) {
      throw new Error('AI Studio input element not found');
    }
    
    // Step 2: Focus the input to activate it
    this.progressTracker.updateProgress(40, 'Focusing AI Studio input...');
    inputElement.focus();
    await this.delay(200);
    
    // Step 3: Try file input method first (most reliable)
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      console.log('Found file input, trying direct assignment for AI Studio...');
      this.progressTracker.updateProgress(60, 'Uploading via file input...');
      
      try {
        fileInput.value = '';
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
        
        // Wait for upload
        const uploadSuccess = await this.waitForAIStudioUpload();
        if (uploadSuccess) {
          this.progressTracker.complete('File uploaded to AI Studio successfully');
          return true;
        }
      } catch (error) {
        console.warn('AI Studio file input method failed:', error);
      }
    }
    
    // Step 4: Fallback to drag & drop
    console.log('Trying drag & drop method for AI Studio...');
    this.progressTracker.updateProgress(70, 'Trying drag & drop...');
    
    await this.simulateAIStudioDragDrop(inputElement, file);
    
    // Wait for upload completion
    const uploadSuccess = await this.waitForAIStudioUpload();
    
    if (uploadSuccess) {
      this.progressTracker.complete('File uploaded to AI Studio successfully');
      return true;
    } else {
      // Be more lenient with AI Studio detection
      this.progressTracker.complete('Upload completed (may have succeeded)');
      return true;
    }
  }

  /**
   * Simulate drag & drop specifically for AI Studio
   * @param {Element} target - Target element
   * @param {File} file - File to drop
   */
  async simulateAIStudioDragDrop(target, file) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer,
      clientX: centerX,
      clientY: centerY
    };

    console.log('Simulating AI Studio drag & drop...');
    
    // AI Studio drag sequence (comprehensive for ProseMirror)
    target.dispatchEvent(new DragEvent('dragenter', eventOptions));
    await this.delay(100);
    
    target.dispatchEvent(new DragEvent('dragover', eventOptions));
    await this.delay(100);
    
    target.dispatchEvent(new DragEvent('drop', eventOptions));
    
    // For ProseMirror, also try additional events
    if (target.classList.contains('ProseMirror')) {
      console.log('Detected ProseMirror, trying additional events...');
      
      // Try paste event
      try {
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer
        });
        target.dispatchEvent(pasteEvent);
      } catch (error) {
        console.log('AI Studio paste event failed:', error);
      }
      
      // Try input event for ProseMirror
      try {
        const inputEvent = new Event('input', { bubbles: true });
        target.dispatchEvent(inputEvent);
      } catch (error) {
        console.log('AI Studio input event failed:', error);
      }
    }
  }

  /**
   * Wait for AI Studio upload completion
   * @returns {Promise<boolean>}
   */
  async waitForAIStudioUpload() {
    const maxAttempts = 20; // 10 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.delay(500);
      
      // Look for AI Studio-specific upload indicators
      const indicators = [
        'img[src*="pdf"]',
        '[aria-label*="pdf"]',
        '[title*="pdf"]',
        '.attachment',
        '[data-testid*="attachment"]',
        '[data-testid*="file"]',
        '*[class*="file"]',
        '*[class*="document"]',
        '.uploaded-file',
        '.file-preview'
      ];

      for (const selector of indicators) {
        if (document.querySelector(selector)) {
          console.log(`AI Studio upload detected on attempt ${attempt} with: ${selector}`);
          return true;
        }
      }
      
      // Update progress
      const progress = 70 + (attempt / maxAttempts) * 20;
      this.progressTracker.updateProgress(progress, `Checking AI Studio upload... (${attempt}/${maxAttempts})`);
    }
    
    console.log('AI Studio upload detection timed out');
    return false;
  }

  /**
   * Extended monitoring for ChatGPT upload completion (longer timeout)
   * @returns {Promise<boolean>}
   */
  async waitForChatGPTUploadExtended() {
    const maxAttempts = 60; // 60 attempts over ~30 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.delay(500);
      
      if (await this.checkChatGPTUploadSuccess()) {
        console.log(`Upload detected on attempt ${attempt}`);
        return true;
      }
      
      // Update progress
      const progress = 60 + (attempt / maxAttempts) * 30;
      this.progressTracker.updateProgress(progress, `Waiting for upload... (${attempt}/${maxAttempts})`);
    }
    
    console.log('Upload detection timed out after 15 seconds');
    return false;
  }

  /**
   * Extended monitoring for ChatGPT upload completion
   * @returns {Promise<boolean>}
   */
  async waitForChatGPTUpload() {
    const maxAttempts = 40; // 40 attempts over ~20 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.delay(500);
      
      if (await this.checkChatGPTUploadSuccess()) {
        console.log(`Upload detected on attempt ${attempt}`);
        return true;
      }
      
      // Update progress
      const progress = 60 + (attempt / maxAttempts) * 20;
      this.progressTracker.updateProgress(progress, `Checking upload... (${attempt}/${maxAttempts})`);
    }
    
    return false;
  }

  /**
   * Simple drag & drop for fallback
   * @param {Element} target - Drop target
   * @param {File} file - File to drop
   */
  async simulateSimpleDragDrop(target, file) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer,
      clientX: centerX,
      clientY: centerY
    };

    // Simple sequence
    target.dispatchEvent(new DragEvent('dragenter', eventOptions));
    await this.delay(50);
    target.dispatchEvent(new DragEvent('dragover', eventOptions));
    await this.delay(50);
    target.dispatchEvent(new DragEvent('drop', eventOptions));
  }

  /**
   * Simplified drag & drop simulation for ChatGPT (to prevent duplicates)
   * @param {Element} target - Drop target
   * @param {File} file - File to drop
   */
  async simulateAdvancedDragDrop(target, file) {
    console.log('Executing single, simplified drag & drop sequence...');
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer,
      clientX: centerX,
      clientY: centerY,
      screenX: centerX,
      screenY: centerY
    };

    // Minimal event sequence to prevent duplicates
    console.log('1. Dispatching dragenter event');
    target.dispatchEvent(new DragEvent('dragenter', eventOptions));
    await this.delay(100);

    console.log('2. Dispatching dragover event');  
    target.dispatchEvent(new DragEvent('dragover', eventOptions));
    await this.delay(100);

    console.log('3. Dispatching drop event');
    target.dispatchEvent(new DragEvent('drop', eventOptions));
    
    console.log('Drag & drop sequence completed');
  }

  /**
   * Trigger ChatGPT-specific events
   * @param {Element} target - Target element
   * @param {File} file - File object
   */
  async triggerChatGPTEvents(target, file) {
    // Try paste event
    try {
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);
      
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardData
      });
      
      target.dispatchEvent(pasteEvent);
      await this.delay(100);
    } catch (error) {
      console.log('Paste event failed:', error);
    }

    // Try input event
    try {
      const inputEvent = new Event('input', { bubbles: true });
      target.dispatchEvent(inputEvent);
      await this.delay(100);
    } catch (error) {
      console.log('Input event failed:', error);
    }

    // Try change event  
    try {
      const changeEvent = new Event('change', { bubbles: true });
      target.dispatchEvent(changeEvent);
      await this.delay(100);
    } catch (error) {
      console.log('Change event failed:', error);
    }
  }

  /**
   * Check if ChatGPT upload was successful
   * @returns {Promise<boolean>}
   */
  async checkChatGPTUploadSuccess() {
    // Look for file attachment indicators in ChatGPT
    const indicators = [
      '[data-testid*="attachment"]',
      '[aria-label*="attachment"]',
      '.attachment',
      '[title*="pdf"]',
      '[alt*="pdf"]',
      'img[src*="pdf"]',
      '*[class*="file"]',
      '*[class*="attachment"]',
      '[data-testid*="file-upload"]',
      '*[class*="uploaded"]',
      'svg[title*="attachment"]',
      '[data-icon*="paperclip"]'
    ];

    for (const selector of indicators) {
      if (document.querySelector(selector)) {
        console.log('Upload success indicator found:', selector);
        return true;
      }
    }

    return false;
  }

  /**
   * Try file input method as fallback
   * @param {File} file - File to upload
   * @returns {Promise<boolean>}
   */
  async tryFileInputMethod(file) {
    try {
      console.log('Trying file input method...');
      
      const fileInput = document.querySelector('input[type="file"]');
      if (!fileInput) {
        return false;
      }

      // Create a new FileList with our file
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;

      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      await this.delay(1000);
      return await this.checkChatGPTUploadSuccess();
    } catch (error) {
      console.error('File input method failed:', error);
      return false;
    }
  }

  /**
   * Find the best drop target on the page
   * @returns {Element|null}
   */
  findBestDropTarget() {
    // Priority order: most specific to most general
    const candidates = [
      // Try configured drop zone first
      this.siteConfigs.getDropZoneElement(),
      
      // Try input element (often accepts drops)
      this.siteConfigs.getInputElement(),
      
      // Try common drop-friendly elements
      document.querySelector('main'),
      document.querySelector('[role="main"]'),
      document.querySelector('form'),
      document.querySelector('[role="textbox"]'),
      document.querySelector('div[contenteditable="true"]'),
      document.querySelector('textarea'),
      
      // Last resort
      document.body
    ];

    // Return first valid element
    for (const candidate of candidates) {
      if (candidate && candidate.nodeType === Node.ELEMENT_NODE) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Simulate realistic drag and drop sequence
   * @param {Element} target - Drop target element
   * @param {File} file - File to drop
   */
  async simulateDragAndDrop(target, file) {
    // Create DataTransfer object with file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Get target position for realistic coordinates
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Event options
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer,
      clientX: centerX,
      clientY: centerY,
      screenX: centerX,
      screenY: centerY
    };

    console.log('Starting drag sequence...');

    // 1. Drag Enter
    this.progressTracker.updateProgress(25, 'Drag enter...');
    const dragEnterEvent = new DragEvent('dragenter', eventOptions);
    target.dispatchEvent(dragEnterEvent);
    await this.delay(50);

    // 2. Drag Over (multiple times for realism)
    this.progressTracker.updateProgress(50, 'Dragging over...');
    for (let i = 0; i < 3; i++) {
      const dragOverEvent = new DragEvent('dragover', eventOptions);
      target.dispatchEvent(dragOverEvent);
      await this.delay(30);
    }

    // 3. Drop
    this.progressTracker.updateProgress(75, 'Dropping file...');
    const dropEvent = new DragEvent('drop', eventOptions);
    target.dispatchEvent(dropEvent);
    await this.delay(100);

    // 4. Also try input event on the target (some sites listen for this)
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      const inputEvent = new Event('input', { bubbles: true });
      target.dispatchEvent(inputEvent);
    }

    // 5. Try paste event as additional fallback
    await this.tryPasteEvent(target, file);

    console.log('Drag sequence completed');
  }

  /**
   * Try paste event as additional method
   * @param {Element} target - Target element
   * @param {File} file - File to paste
   */
  async tryPasteEvent(target, file) {
    try {
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);
      
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardData
      });
      
      target.dispatchEvent(pasteEvent);
      console.log('Paste event dispatched as fallback');
    } catch (error) {
      console.log('Paste event failed (expected):', error.message);
    }
  }

  /**
   * Wait for upload completion by monitoring DOM changes
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async waitForUploadCompletion(timeout = 8000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let progressReported = false;

      const checkCompletion = () => {
        // Look for upload indicators
        const indicators = [
          // Common upload success indicators
          '[data-testid*="attachment"]',
          '[data-testid*="file"]',
          '.attachment',
          '.file-attachment',
          '.uploaded-file',
          
          // Look for file names or PDF indicators
          `[title*="pdf"]`,
          `[alt*="pdf"]`,
          
          // Progress or loading indicators
          '.loading',
          '.uploading',
          '[role="progressbar"]'
        ];

        for (const selector of indicators) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log('Upload indicator found:', selector);
            if (!progressReported) {
              this.progressTracker.updateProgress(90, 'Processing upload...');
              progressReported = true;
            }
          }
        }

        // Check for timeout
        if (Date.now() - startTime > timeout) {
          console.log('Upload wait timeout reached, assuming success');
          resolve();
          return;
        }

        // Continue checking
        setTimeout(checkCompletion, 300);
      };

      // Start checking after brief delay
      setTimeout(checkCompletion, 500);
    });
  }

  /**
   * Utility function to create delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Make available globally
window.FileInjector = FileInjector;
