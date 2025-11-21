// This function strictly uses the native window.Summarizer API
// and returns undefined if it's not available or if summarization fails.
export async function getSummary(textToSummarize: string): Promise<string | undefined> {
  if ((window as any).Summarizer) {
    try {
      const summarizer = await (window as any).Summarizer.create({
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

