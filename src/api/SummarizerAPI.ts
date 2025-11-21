interface SummarizerOptions {
  sharedContext?: string;
  type?: 'tldr';
  length?: 'short' | 'medium' | 'long';
}

interface Summarizer {
  summarize(text: string): Promise<string>;
}

declare global {
  interface Window {
    Summarizer?: {
      create(options: SummarizerOptions): Promise<Summarizer>;
    };
  }
}

// This function strictly uses the native window.Summarizer API
// and returns undefined if it's not available or if summarization fails.
export async function getSummary(textToSummarize: string): Promise<string | undefined> {
  if (window.Summarizer) {
    try {
      const summarizer = await window.Summarizer.create({
        sharedContext: "A summary of an LED display configuration for easy identification in history.",
        type: "tldr",
        length: "short",
      });
      const summary = await summarizer.summarize(textToSummarize);
      return summary;
    } catch (e) {
      console.error("Native Summarizer API failed:", e);
      return undefined;
    }
  } else {
    console.warn("window.Summarizer API not available.");
    return undefined;
  }
}


