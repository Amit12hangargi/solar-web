-- filename: setup_vector_db.sql

-- Enable the vector extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the solar_data table with vector support
CREATE TABLE IF NOT EXISTS solar_data (
  id SERIAL PRIMARY KEY,
  date_time TIMESTAMP,  -- This will accept ISO format dates
  plant_id VARCHAR(50),
  source_key VARCHAR(50),
  dc_power FLOAT,
  ac_power FLOAT,
  daily_yield FLOAT,
  total_yield FLOAT,
  content TEXT,
  embedding VECTOR(768),  -- nomic-embed-text typically uses 768 dimensions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to match similar vectors
CREATE OR REPLACE FUNCTION match_solar_data(query_embedding VECTOR(768), match_threshold FLOAT, match_count INT)
RETURNS TABLE(
  id INTEGER,
  date_time TIMESTAMP,
  plant_id VARCHAR(50),
  source_key VARCHAR(50),
  dc_power FLOAT,
  ac_power FLOAT,
  daily_yield FLOAT,
  total_yield FLOAT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    solar_data.id,
    solar_data.date_time,
    solar_data.plant_id,
    solar_data.source_key,
    solar_data.dc_power,
    solar_data.ac_power,
    solar_data.daily_yield,
    solar_data.total_yield,
    solar_data.content,
    1 - (solar_data.embedding <=> query_embedding) AS similarity
  FROM solar_data
  WHERE 1 - (solar_data.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Create an index for faster similarity searches
CREATE INDEX IF NOT EXISTS solar_data_embedding_idx ON solar_data USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a composite index for faster duplicate checking
CREATE INDEX IF NOT EXISTS solar_data_composite_idx ON solar_data (plant_id, source_key, dc_power, ac_power);
