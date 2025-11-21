-- Create outfit_items table
CREATE TABLE outfit_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  bounding_box JSONB NOT NULL, -- {x: number, y: number, width: number, height: number}
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1)
);

-- Create shopping_links table
CREATE TABLE shopping_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outfit_item_id UUID NOT NULL REFERENCES outfit_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  price TEXT,
  retailer TEXT NOT NULL,
  image_url TEXT
);

-- Add indexes for performance
CREATE INDEX idx_outfit_items_outfit_id ON outfit_items(outfit_id);
CREATE INDEX idx_shopping_links_outfit_item_id ON shopping_links(outfit_item_id);
CREATE INDEX idx_outfit_items_item_name ON outfit_items(item_name);
