// Database types
export interface Outfit {
  id: string;
  created_at: string;
  image_url: string;
  image_path: string;
  file_hash: string | null;
  username: string; // Required username for outfit uploader
}

export interface Rating {
  id: string;
  created_at: string;
  outfit_id: string;
  score: number;
  feedback: string | null;
  username?: string | null; // Made optional since the column doesn't exist yet
  tags?: string[] | null; // Optional array of tags chosen when rating
}

// Frontend types
export interface OutfitWithRating extends Outfit {
  averageRating: number;
  totalRatings: number;
  latestRatings: Rating[];
  // 1-100 scale derived from averageRating (averageRating 1-10 -> score100 10-100)
  score100?: number;
}