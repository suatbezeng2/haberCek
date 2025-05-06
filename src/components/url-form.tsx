'use client';

import type { ExtractedContent } from '@/services/content-fetcher';
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL (e.g., http://example.com).' }),
});

type UrlFormProps = {
  onContentExtracted: (content: ExtractedContent | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
};

interface ApiResult extends ExtractedContent {
  error?: string; // For top-level API errors
  webhook_status?: "success" | "failed";
  webhook_error?: string;
}

export function UrlForm({ onContentExtracted, setIsLoading, isLoading }: UrlFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    onContentExtracted(null); // Clear previous content

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: values.url }),
      });

      const result: ApiResult = await response.json();

      if (!response.ok || result.error) {
        // If response status is not OK (e.g. 500) or if the JSON body contains an 'error' field from the API.
        throw new Error(result.error || `Server error: ${response.statusText} (Status: ${response.status})`);
      }
      
      onContentExtracted(result); // This will pass title and content

      let toastTitle = "";
      let toastDescription = `URL: ${values.url.substring(0, 70)}${values.url.length > 70 ? '...' : ''}`;
      let toastVariant: "default" | "destructive" = "default";
      let duration = 5000;

      if (result.webhook_status === "success") {
        toastTitle = "Success!";
        toastDescription += "\nContent extracted and webhook notified successfully.";
        toastVariant = "default";
      } else if (result.webhook_status === "failed") {
        toastTitle = "Partial Success: Webhook Failed";
        toastDescription += `\nContent extracted, but webhook notification failed: ${result.webhook_error || 'Unknown issue.'}`;
        toastVariant = "default"; // Still default as content was extracted, but error is in description
                                  // Alternatively, could use a 'warning' variant if available or 'destructive' if critical
        duration = 9000; // Longer duration for messages with errors
      } else {
        // Should not happen if API is structured correctly, but as a fallback
        toastTitle = "Content Extracted";
        toastDescription += "\nContent extracted. Webhook status unknown.";
      }


      toast({
        title: (
          <div className="flex items-center">
            {result.webhook_status === "failed" ? <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" /> : <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />}
            {toastTitle}
          </div>
        ),
        description: <pre className="whitespace-pre-wrap text-sm">{toastDescription}</pre>,
        variant: toastVariant, 
        duration: duration,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during extraction.';
      console.error('Form submission error:', error);
      onContentExtracted(null);
      toast({
        title: (
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
            Error
          </div>
        ),
        description: errorMessage,
        variant: 'destructive',
        duration: 9000,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full max-w-2xl">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-foreground">Enter URL to Extract Content</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com" 
                  {...field} 
                  className="text-base bg-card border-input focus:ring-accent"
                  aria-label="URL to extract content from"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          disabled={isLoading} 
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent text-base py-3"
          aria-live="polite"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Extracting...
            </>
          ) : (
            'Extract Content & Notify Webhook'
          )}
        </Button>
      </form>
    </Form>
  );
}
