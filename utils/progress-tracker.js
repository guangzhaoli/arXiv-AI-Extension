/**
 * Progress Tracker - Handles progress display for download and upload operations
 */
class ProgressTracker {
  constructor() {
    this.currentOperation = null;
    this.progressElement = null;
    this.callbacks = {
      onProgress: null,
      onComplete: null,
      onError: null
    };
    // Timeout ID used for auto-hide; cleared when progress updates restart
    this.hideTimeout = null;
  }

  /**
   * Initialize progress tracking for an operation
   * @param {string} operation - Operation type ('download', 'upload', 'parse')
   * @param {object} callbacks - Progress callbacks
   */
  start(operation, callbacks = {}) {
    this.currentOperation = operation;
    this.callbacks = { ...this.callbacks, ...callbacks };
    
    // Find or create progress element
    this.progressElement = document.querySelector('#arxiv-progress');
    if (!this.progressElement) {
      console.warn('Progress element not found');
      return;
    }

    this.updateProgress(0, this.getOperationText(operation, 'starting'));
    this.show();
  }

  /**
   * Update progress percentage and text
   * @param {number} percentage - Progress percentage (0-100)
   * @param {string} text - Progress text
   */
  updateProgress(percentage, text) {
    if (!this.progressElement) return;
    // Prevent premature auto-hide while progress is still updating
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    // Ensure the progress element is visible if it was previously hidden
    if (this.progressElement.style.display === 'none') {
      this.show();
    }

    const progressBar = this.progressElement.querySelector('.progress-bar');
    const progressText = this.progressElement.querySelector('.progress-text');

    if (progressBar) {
      progressBar.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
    }

    if (progressText) {
      progressText.textContent = text;
    }

    // Call progress callback
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(percentage, text);
    }
  }

  /**
   * Mark operation as complete
   * @param {string} message - Completion message
   */
  complete(message) {
    this.updateProgress(100, message || this.getOperationText(this.currentOperation, 'completed'));
    
    // Call completion callback
    if (this.callbacks.onComplete) {
      this.callbacks.onComplete(message);
    }

    // Auto-hide after delay; store timeout so it can be cancelled if work continues
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, 1500);
  }

  /**
   * Mark operation as failed
   * @param {string} error - Error message
   */
  error(error) {
    if (!this.progressElement) return;

    const progressBar = this.progressElement.querySelector('.progress-bar');
    const progressText = this.progressElement.querySelector('.progress-text');

    if (progressBar) {
      progressBar.style.backgroundColor = '#ff4444';
      progressBar.style.width = '100%';
    }

    if (progressText) {
      progressText.textContent = error || 'Operation failed';
      progressText.style.color = '#ff4444';
    }

    // Call error callback
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }

    // Auto-hide after delay; store timeout so it can be cancelled if work continues
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, 3000);
  }

  /**
   * Show progress element
   */
  show() {
    if (this.progressElement) {
      this.progressElement.style.display = 'block';
      this.progressElement.classList.add('visible');
    }
  }

  /**
   * Hide progress element
   */
  hide() {
    if (this.progressElement) {
      this.progressElement.style.display = 'none';
      this.progressElement.classList.remove('visible');
      
      // Reset styles
      const progressBar = this.progressElement.querySelector('.progress-bar');
      const progressText = this.progressElement.querySelector('.progress-text');
      
      if (progressBar) {
        progressBar.style.backgroundColor = '#4CAF50';
        progressBar.style.width = '0%';
      }
      
      if (progressText) {
        progressText.style.color = '#333';
      }
    }

    this.currentOperation = null;
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  /**
   * Get operation text based on type and status
   * @param {string} operation - Operation type
   * @param {string} status - Operation status
   * @returns {string}
   */
  getOperationText(operation, status) {
    const texts = {
      parse: {
        starting: 'Parsing arXiv input...',
        progress: 'Parsing arXiv input...',
        completed: 'Parsing completed'
      },
      download: {
        starting: 'Downloading PDF...',
        progress: 'Downloading PDF...',
        completed: 'Download completed'
      },
      upload: {
        starting: 'Uploading to chat...',
        progress: 'Uploading to chat...',
        completed: 'Upload completed'
      },
      cache: {
        starting: 'Checking cache...',
        progress: 'Checking cache...',
        completed: 'Found in cache'
      }
    };

    return texts[operation]?.[status] || `${operation} ${status}`;
  }

  /**
   * Create progress HTML element
   * @returns {string} - HTML string for progress element
   */
  static createProgressHTML() {
    return `
      <div id="arxiv-progress" class="arxiv-progress-container" style="display: none;">
        <div class="progress-content">
          <div class="progress-text">Initializing...</div>
          <div class="progress-bar-container">
            <div class="progress-bar"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Simulate download progress for demo purposes
   * @param {number} duration - Duration in milliseconds
   */
  simulateDownloadProgress(duration = 3000) {
    let progress = 0;
    const interval = 50; // Update every 50ms
    const increment = (100 * interval) / duration;

    const timer = setInterval(() => {
      progress += increment;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);
        this.complete();
      } else {
        this.updateProgress(
          progress, 
          `Downloading PDF... ${Math.round(progress)}%`
        );
      }
    }, interval);

    return timer;
  }

  /**
   * Track file upload progress
   * @param {XMLHttpRequest} xhr - XMLHttpRequest object
   */
  trackUploadProgress(xhr) {
    if (!xhr.upload) return;

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentage = (event.loaded / event.total) * 100;
        this.updateProgress(percentage, `Uploading... ${Math.round(percentage)}%`);
      }
    });

    xhr.upload.addEventListener('load', () => {
      this.complete('Upload completed');
    });

    xhr.upload.addEventListener('error', () => {
      this.error('Upload failed');
    });
  }
}

// Make available globally
window.ProgressTracker = ProgressTracker;
