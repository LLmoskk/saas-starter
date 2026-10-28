export type GenerationInput = {
  prompt: string;
  references: { role: string; key: string; mime: string; size: number }[];
  options?: Record<string, unknown>;
};

export type GenerationStep = {
  id: string;
  kind: "image" | "video";
  model: string;
  /** USD ceiling accepted by Yir for this step. Required before a paid request. */
  maxCost: string;
  build: (context: {
    input: GenerationInput;
    uploaded: { role: string; fileId: string }[];
    previous?: { url: string; mediaType: string };
  }) => {
    type: "text" | "image" | "reference";
    prompt: string;
    references?: { role: string; file_id?: string; url?: string }[];
    parameters?: Record<string, unknown>;
  };
};

export type GenerationFlow = {
  id: string;
  name: string;
  creditCost: number;
  minReferences?: number;
  maxReferences?: number;
  steps: readonly GenerationStep[];
};
