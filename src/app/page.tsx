'use client';

import * as React from 'react';
import { UrlForm } from '@/components/url-form';
import { ContentDisplay } from '@/components/content-display';
import type { ExtractedContent } from '@/services/content-fetcher';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, Loader2 } from "lucide-react"

export default function Home() {
  const [extractedContent, setExtractedContent] = React.useState<ExtractedContent | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [webhookInfo, setWebhookInfo] = React.useState<string>('a preconfigured webhook');

  React.useEffect(() => {
    // This is just for display purposes on the client.
    // The actual MAKE_WEBHOOK_URL is used securely on the server-side in /api/extract/route.ts
    // We avoid exposing the full URL here directly from an env var prefixed with NEXT_PUBLIC_
    // unless it's explicitly intended for public knowledge and non-sensitive.
    // For this example, we'll just state it's preconfigured.
    // If you need to display part of it, ensure it's not sensitive.
    // e.g. const displayUrl = process.env.NEXT_PUBLIC_WEBHOOK_DISPLAY_NAME || "a Make.com webhook";
    // setWebhookInfo(displayUrl);

    // The key information is that the webhook is configured server-side.
  }, []);


  const handleContentExtracted = (content: ExtractedContent | null) => {
    setExtractedContent(content);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 sm:p-12 md:p-24 bg-background">
      <div className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Content Fetcher & Notifier
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Enter a URL to extract its title and text content. The extracted data will be sent to {webhookInfo}.
        </p>
        <Alert className="mt-6 text-left shadow-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="font-semibold">Webhook Configuration Note</AlertTitle>
          <AlertDescription>
            This application sends extracted content to a webhook. The specific webhook URL is configured
            on the server using the `MAKE_WEBHOOK_URL` environment variable. 
            <br /><br />
            For local development, create a `.env.local` file in the root of your project and add your webhook URL:
            <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto font-mono">
              MAKE_WEBHOOK_URL=your_actual_make_webhook_url_here
            </pre>
            If this variable is not set, a default placeholder URL (`https://hook.eu1.make.com/qtd7bn346b6v9o1vhaw4haclt9u1geme`) will be used by the server API.
          </AlertDescription>
        </Alert>
      </div>
      
      <UrlForm 
        onContentExtracted={handleContentExtracted} 
        setIsLoading={setIsLoading}
        isLoading={isLoading}
      />

      {isLoading && (
        <div className="mt-8 text-center text-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin inline-block" />
          <p className="inline-block align-middle">Loading content...</p>
        </div>
      )}

      {extractedContent && !isLoading && (
        <>
          <Separator className="my-8 w-full max-w-2xl" />
          <ContentDisplay extractedContent={extractedContent} />
        </>
      )}
    </main>
  );
}
