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

export interface OutfitItem {
  id: string;
  created_at: string;
  outfit_id: string;
  item_name: string; // e.g., "shirt", "pants", "shoes"
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  }; // Normalized coordinates (0-1)
  confidence: number; // Detection confidence score
}

export interface ShoppingLink {
  id: string;
  outfit_item_id: string;
  title: string;
  url: string;
  price?: string;
  retailer: string; // e.g., "Amazon", "Zara"
  image_url?: string;
}

// Frontend types
export interface OutfitWithRating extends Outfit {
  averageRating: number;
  totalRatings: number;
  latestRatings: Rating[];
  // 1-100 scale derived from averageRating (averageRating 1-10 -> score100 10-100)
  score100?: number;
  items?: OutfitItemWithLinks[]; // Detected items with shopping links
}

export interface OutfitItemWithLinks extends OutfitItem {
  shopping_links: ShoppingLink[];
}