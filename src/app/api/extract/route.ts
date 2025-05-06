import { type NextRequest, NextResponse } from 'next/server';
import { fetchContent, type ExtractedContent } from '@/services/content-fetcher';
import { sendToWebhook } from '@/services/webhook-notifier';

// Ensure this matches the documentation and intended default
const DEFAULT_WEBHOOK_URL = 'https://hook.eu1.make.com/qtd7bn346b6v9o1vhaw4haclt9u1geme';
const USER_CONFIGURED_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
const WEBHOOK_URL = USER_CONFIGURED_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

if (!USER_CONFIGURED_WEBHOOK_URL) {
  console.warn(`MAKE_WEBHOOK_URL environment variable is not set. Using default webhook URL: ${DEFAULT_WEBHOOK_URL}. Please ensure you have set this variable in your environment (e.g., .env.local or hosting provider settings) if you intend to use a custom webhook.`);
} else {
  console.log(`Using configured MAKE_WEBHOOK_URL: ${WEBHOOK_URL}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required and must be a string' }, { status: 400 });
    }

    let extractedContent: ExtractedContent;
    try {
      extractedContent = await fetchContent(url);
    } catch (error) {
      console.error(`Error fetching content from URL ${url}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract content from URL. An unknown error occurred.';
      return NextResponse.json({ error: errorMessage, sourceUrl: url }, { status: 500 });
    }

    try {
      console.log(`Attempting to send extracted content to webhook: ${WEBHOOK_URL}`);
      await sendToWebhook(WEBHOOK_URL, {
        sourceUrl: url,
        title: extractedContent.title,
        content: extractedContent.content,
        timestamp: new Date().toISOString(),
      });
       return NextResponse.json({...extractedContent, webhook_status: "success"}, { status: 200 });
    } catch (webhookError)
    {
      console.error(`Error sending to webhook (${WEBHOOK_URL}) for URL ${url}:`, webhookError);
      const webhookErrorMessage = webhookError instanceof Error ? webhookError.message : 'Webhook notification failed due to an unknown error.';
      // Log this prominently for monitoring.
      console.warn(`Webhook notification failed for URL ${url}, but content was extracted. Error: ${webhookErrorMessage}`);
      
      // Return success for content extraction (200 OK), but include a warning about the webhook.
      // The client can use this information to inform the user.
      return NextResponse.json(
        { 
          ...extractedContent, 
          webhook_status: "failed", 
          webhook_error: `Webhook notification failed: ${webhookErrorMessage}` 
        }, 
        { status: 200 } 
        // Alternatively, consider HTTP 207 Multi-Status if the partial failure is significant.
        // For this case, 200 with details is often sufficient.
      );
    }
  } catch (error) {
    // This catches errors from request.json() or other unexpected issues.
    console.error('Unhandled error in /api/extract:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

