// filename: generate_embeddings.js

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = "http://127.0.0.1:54321";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const supabase = createClient(supabaseUrl, supabaseKey);

// Ollama API configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Function to generate embeddings using Ollama's nomic-embed-text:latest model
async function generateEmbedding(text) {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nomic-embed-text:latest',
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Function to parse date in DD-MM-YYYY HH:MM format to ISO format
function parseDate(dateString) {
  const [datePart, timePart] = dateString.split(' ');
  const [day, month, year] = datePart.split('-');

  // Format as YYYY-MM-DD HH:MM:SS (ISO format)
  return `${year}-${month}-${day} ${timePart || '00:00'}:00`;
}

// Function to process CSV and store in Supabase
async function processCSV(filePath) {
  try {
    // Read and parse CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`Processing ${records.length} records...`);

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Parse the date to ISO format
      const isoDate = parseDate(record.DATE_TIME);

      // Create a text representation of the record for embedding
      const content = `Date: ${record.DATE_TIME}, Plant ID: ${record.PLANT_ID}, Source Key: ${record.SOURCE_KEY}, DC Power: ${record.DC_POWER}, AC Power: ${record.AC_POWER}, Daily Yield: ${record.DAILY_YIELD}, Total Yield: ${record.TOTAL_YIELD}`;

      // Check if this record already exists in the database
      const { data: existingData, error: queryError } = await supabase
        .from('solar_data')
        .select('id')
        .eq('plant_id', record.PLANT_ID)
        .eq('source_key', record.SOURCE_KEY)
        .eq('dc_power', parseFloat(record.DC_POWER))
        .eq('ac_power', parseFloat(record.AC_POWER));

      if (queryError) {
        console.error('Error checking for existing record:', queryError);
        continue;
      }

      // If record exists, skip or update
      if (existingData && existingData.length > 0) {
        console.log(`Record ${i + 1}/${records.length} already exists, skipping...`);
        continue;
      }

      // Generate embedding
      const embedding = await generateEmbedding(content);

      // Insert record with embedding into Supabase
      const { error: insertError } = await supabase.from('solar_data').insert({
        date_time: isoDate,  // Use the properly formatted date
        plant_id: record.PLANT_ID,
        source_key: record.SOURCE_KEY,
        dc_power: parseFloat(record.DC_POWER),
        ac_power: parseFloat(record.AC_POWER),
        daily_yield: parseFloat(record.DAILY_YIELD),
        total_yield: parseFloat(record.TOTAL_YIELD),
        content,
        embedding,
      });

      if (insertError) {
        console.error(`Error inserting record ${i + 1}/${records.length}:`, insertError);
      } else {
        console.log(`Processed record ${i + 1}/${records.length}`);
      }

      // Add a small delay to avoid overwhelming the API
      if (i % 10 === 0 && i > 0) {
        console.log(`Pausing for a moment after ${i} records...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('CSV processing completed!');
  } catch (error) {
    console.error('Error processing CSV:', error);
  }
}

// Main function
async function main() {
  const filePath = "../../ML/Plant_1_Generation_Data.csv"

  if (!filePath) {
    console.error('Please provide a CSV file path as an argument.');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // Check if Ollama is running and has the required model
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) {
      throw new Error('Could not connect to Ollama');
    }

    const data = await response.json();
    const hasModel = data.models?.some(model => model.name === 'nomic-embed-text:latest');

    if (!hasModel) {
      console.log('nomic-embed-text:latest model not found. Pulling the model...');
      const pullResponse = await fetch(`${OLLAMA_URL}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'nomic-embed-text:latest',
        }),
      });

      if (!pullResponse.ok) {
        throw new Error('Failed to pull the model');
      }

      console.log('Model pulled successfully!');
    }
  } catch (error) {
    console.error('Error checking Ollama:', error);
    console.error('Make sure Ollama is running and accessible.');
    process.exit(1);
  }

  // Process the CSV file
  await processCSV("../../ML/Plant_1_Generation_Data.csv");
}

main();
