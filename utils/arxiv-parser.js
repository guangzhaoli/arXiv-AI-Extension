/**
 * arXiv Parser - Handles parsing arXiv links and IDs
 */
class ArxivParser {
  constructor() {
    // arXiv URL patterns
    this.patterns = {
      // https://arxiv.org/abs/2506.05046
      abs: /arxiv\.org\/abs\/(\d{4}\.\d{4,5})/,
      // https://arxiv.org/pdf/2506.05046.pdf
      pdf: /arxiv\.org\/pdf\/(\d{4}\.\d{4,5})\.pdf/,
      // Direct ID: 2506.05046
      direct: /^(\d{4}\.\d{4,5})$/
    };
  }

  /**
   * Parse input and extract arXiv paper ID
   * @param {string} input - URL or paper ID
   * @returns {object} - {success: boolean, paperId: string, error?: string}
   */
  parse(input) {
    if (!input || typeof input !== 'string') {
      return {
        success: false,
        error: 'Invalid input: please provide a valid arXiv URL or paper ID'
      };
    }

    const trimmedInput = input.trim();

    // Try direct ID pattern first
    const directMatch = trimmedInput.match(this.patterns.direct);
    if (directMatch) {
      return {
        success: true,
        paperId: directMatch[1]
      };
    }

    // Try abstract URL pattern
    const absMatch = trimmedInput.match(this.patterns.abs);
    if (absMatch) {
      return {
        success: true,
        paperId: absMatch[1]
      };
    }

    // Try PDF URL pattern
    const pdfMatch = trimmedInput.match(this.patterns.pdf);
    if (pdfMatch) {
      return {
        success: true,
        paperId: pdfMatch[1]
      };
    }

    return {
      success: false,
      error: 'Invalid arXiv format. Please use format like "2506.05046" or "https://arxiv.org/abs/2506.05046"'
    };
  }

  /**
   * Generate arXiv URLs from paper ID
   * @param {string} paperId - arXiv paper ID
   * @returns {object} - URLs for abstract, PDF, etc.
   */
  generateUrls(paperId) {
    return {
      abstract: `https://arxiv.org/abs/${paperId}`,
      pdf: `https://arxiv.org/pdf/${paperId}.pdf`,
      source: `https://arxiv.org/e-print/${paperId}`
    };
  }

  /**
   * Validate paper ID format
   * @param {string} paperId - arXiv paper ID
   * @returns {boolean}
   */
  isValidPaperId(paperId) {
    return this.patterns.direct.test(paperId);
  }

  /**
   * Extract title from arXiv abstract page (for future use)
   * @param {string} htmlContent - HTML content of abstract page
   * @returns {string} - Paper title
   */
  extractTitle(htmlContent) {
    try {
      const titleMatch = htmlContent.match(/<h1 class="title mathjax">\s*<span class="descriptor">Title:<\/span>\s*(.+?)\s*<\/h1>/s);
      if (titleMatch) {
        return titleMatch[1].replace(/<[^>]*>/g, '').trim();
      }
      return 'arXiv Paper';
    } catch (error) {
      console.error('Error extracting title:', error);
      return 'arXiv Paper';
    }
  }
}

// Make available globally
window.ArxivParser = ArxivParser;
