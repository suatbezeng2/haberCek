/**
 * Represents the extracted content from a URL.
 */
export interface ExtractedContent {
  /**
   * The title of the content.
   */
  title: string;
  /**
   * The text content extracted from the URL.
   */
  content: string;
}

// We need to import JSDOM for server-side HTML parsing.
// This check ensures JSDOM is only imported/used in a Node.js environment.
let JSDOM: typeof import('jsdom').JSDOM | undefined;
if (typeof window === 'undefined') {
  import('jsdom').then(jsdomModule => {
    JSDOM = jsdomModule.JSDOM;
  }).catch(err => {
    console.error("Failed to load JSDOM module. Ensure 'jsdom' is installed.", err);
  });
}


/**
 * Asynchronously fetches the content (title and text) from a given URL.
 * This function performs actual fetching and parsing of HTML content.
 *
 * @param url The URL to fetch content from.
 * @returns A promise that resolves to an ExtractedContent object containing the title and text.
 * @throws Error if the URL is invalid, fetching fails, or content parsing fails.
 */
export async function fetchContent(url: string): Promise<ExtractedContent> {
  console.log(`Fetching content for URL: ${url}`);

  if (!JSDOM) {
    // This case should ideally not be hit on the server if JSDOM is installed.
    // It might be hit if called on the client-side where JSDOM is not meant to run.
    throw new Error("JSDOM is not available. Content extraction requires a server-side Node.js environment with 'jsdom' installed, or the module failed to load.");
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch (error) {
    console.error('Invalid URL format:', url, error);
    throw new Error('Invalid URL format. Please provide a valid URL.');
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Some websites might block requests without a common User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      console.error(`HTTP error fetching URL ${url}. Status: ${response.status}`);
      throw new Error(`Failed to fetch content from URL. Server responded with status: ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const title = document.querySelector('title')?.textContent?.trim() || 'No Title Found';
    
    // Attempt to get content from common main content selectors first
    let mainContentElement = 
        document.querySelector('main') || 
        document.querySelector('article') ||
        document.querySelector('[role="main"]');

    const bodyElement = mainContentElement || document.body;
    
    // Remove script, style, and other non-content elements to avoid their text
    bodyElement.querySelectorAll('script, style, noscript, iframe, header, footer, nav, aside, form, button, input, select, textarea, [aria-hidden="true"], [hidden]').forEach(el => el.remove());

    let cleanedContent = bodyElement.textContent || "";
    
    // Remove specified phrases
    const phrasesToRemove: RegExp[] = [
      /URL Copied/gi,
      /Editör/gi,
      /Bir e-posta göndermek/gi,
      /4 saat önce/gi, // Note: if "4" or "saat" can change, a more general regex is needed
      /Son güncelleme: Mayıs 6, 2025/gi, // Note: if date changes, a more general regex is needed
      /1 dakika okuma süresi/gi, // Note: if "1" or "dakika" can change, a more general regex is needed
      /Paylaş Facebook LinkedIn WhatsApp Telegram E-Posta ile paylaş Yazdır/gi, // Combined for efficiency if they always appear together
      /Paylaş/gi, // Individual terms if they appear separately
      /Facebook/gi,
      /LinkedIn/gi,
      /WhatsApp/gi,
      /Telegram/gi,
      /E-Posta ile paylaş/gi,
      /Yazdır/gi,
    ];

    for (const phraseRegex of phrasesToRemove) {
      cleanedContent = cleanedContent.replace(phraseRegex, '');
    }
    
    // Basic cleaning: remove multiple newlines and leading/trailing whitespace
    cleanedContent = cleanedContent.replace(/\n\s*\n+/g, '\n').trim();
    // Replace multiple spaces with a single space, and trim again
    cleanedContent = cleanedContent.replace(/\s\s+/g, ' ').trim();
    
    // Ensure content is not overly long, simple truncation
    const MAX_CONTENT_LENGTH = 10000; // Max characters for content
    if (cleanedContent.length > MAX_CONTENT_LENGTH) {
        cleanedContent = cleanedContent.substring(0, MAX_CONTENT_LENGTH) + "... (truncated)";
    }

    return {
      title: title,
      content: cleanedContent || 'No discernible text content extracted.',
    };
  } catch (error) {
    console.error(`Error fetching or parsing content from ${url}:`, error);
    if (error instanceof Error) {
      // Check for specific fetch-related errors
      if (error.message.includes('Failed to fetch') || error.message.toLowerCase().includes('networkerror')) { 
        throw new Error(`Network error while fetching URL: ${error.message}. Ensure the server can access this URL and the URL is correct.`);
      }
      throw new Error(`Failed to process URL "${url}": ${error.message}`);
    }
    throw new Error(`An unknown error occurred while processing URL "${url}".`);
  }
}

