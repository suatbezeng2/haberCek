import type { ExtractedContent } from '@/services/content-fetcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type ContentDisplayProps = {
  extractedContent: ExtractedContent | null;
};

export function ContentDisplay({ extractedContent }: ContentDisplayProps) {
  if (!extractedContent) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mt-8 shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground break-words">
          {extractedContent.title || 'No Title Found'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full p-4 border rounded-md bg-background">
          <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {extractedContent.content || 'No Content Extracted.'}
          </p>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
