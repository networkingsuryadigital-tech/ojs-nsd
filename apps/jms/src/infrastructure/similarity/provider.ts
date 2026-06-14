/** Similarity provider contract — infrastructure only. */

export type SimilaritySubmitInput = {
  scanId: string;
  filename: string;
  mimeType: string;
  content: Buffer;
};

export type SimilaritySubmitResult =
  | {
      status: "completed";
      score: number;
      reportUrl: string | null;
      externalScanId: string;
    }
  | {
      status: "submitted";
      externalScanId: string;
    }
  | {
      status: "failed";
      error: string;
      retryable: boolean;
    };

export type SimilarityPollResult =
  | {
      status: "completed";
      score: number;
      reportUrl: string | null;
    }
  | {
      status: "processing";
    }
  | {
      status: "failed";
      error: string;
      retryable: boolean;
    };

export interface SimilarityProvider {
  readonly name: string;
  submit(input: SimilaritySubmitInput): Promise<SimilaritySubmitResult>;
  poll(externalScanId: string): Promise<SimilarityPollResult>;
}
