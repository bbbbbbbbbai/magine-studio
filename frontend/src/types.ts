export type GenerationStatus = "pending" | "processing" | "completed" | "failed";
export type AspectRatio = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

export interface Generation {
  id: string;
  prompt: string;
  enhanced_prompt: string | null;
  negative_prompt: string | null;
  style: string;
  aspect_ratio: AspectRatio;
  width: number;
  height: number;
  seed: number | null;
  status: GenerationStatus;
  provider: string;
  model: string;
  image_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GenerationCreate {
  prompt: string;
  negative_prompt?: string | null;
  style: string;
  aspect_ratio: AspectRatio;
  enhance_prompt: boolean;
  seed?: number | null;
}

export interface GenerationList {
  items: Generation[];
  total: number;
  limit: number;
  offset: number;
}

export interface PublicConfig {
  app_name: string;
  llm_model: string;
  llm_configured: boolean;
  image_provider: string;
  image_model: string;
  supported_ratios: AspectRatio[];
}
