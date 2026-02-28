import os
import sys
import json
import logging
import ijson
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as palm

from utils import clean_document, create_metadata
from pinecone_client import index

load_dotenv()

GOOGLE_AI_API_KEY = os.getenv("GOOGLE_AI_API_KEY")
if not GOOGLE_AI_API_KEY:
    logging.error("GOOGLE_AI_API_KEY is not set in .env")
    sys.exit(1)
palm.configure(api_key=GOOGLE_AI_API_KEY)

# Set the size of the batch for upserts.
BATCH_SIZE = 50


def generate_embedding(text):
    """
    Generate an embedding using Google’s Generative AI model.
    """
    response = palm.Embedding.create(
        model="models/gemini-embedding-001",
        content=text
    )
    # Expecting the response to contain an 'embedding' field.
    if not response or not hasattr(response, "embedding") or not hasattr(response.embedding, "values"):
        raise ValueError("Invalid embedding response.")
    return response.embedding.values


def upsert_batch(batch):
    """
    Upsert a batch of vectors to Pinecone using the real client.
    """
    logging.info(f"Upserting batch of {len(batch)} vectors to Pinecone.")
    response = index.upsert(vectors=batch)
    logging.info(f"Upsert response: {response}")


def process_file_streaming(file_path, vector_batch):
    """
    Process the JSON file as a stream and add cleaned vector data to vector_batch.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        parser = ijson.items(f, "item")
        for doc in parser:
            try:
                clean_doc = clean_document(doc)
                addr = clean_doc.get("address", {})
                if (
                        clean_doc["city"] == "Unknown" or
                        clean_doc["state"] == "Unknown" or
                        addr.get("streetAddress", "Unknown") == "Unknown" or
                        addr.get("zipcode", "Unknown") == "Unknown" or
                        clean_doc["zpid"] == 0
                ):
                    logging.warning("Skipping record with missing fields: zpid=%s", clean_doc["zpid"])
                    continue

                text = (
                    f"Property at {clean_doc['address']['streetAddress']}, "
                    f"{clean_doc['address']['city']}, {clean_doc['address']['state']} "
                    f"({clean_doc['address']['zipcode']}). Price: ${clean_doc['price']}. "
                    f"Beds: {clean_doc['bedrooms']}, Baths: {clean_doc['bathrooms']}, "
                    f"Built in {clean_doc['yearBuilt']}. {clean_doc['description']}"
                )

                logging.info("Generating embedding for property at: %s", clean_doc['address']['streetAddress'])
                embedding = generate_embedding(text)

                vector = {
                    "id": str(clean_doc["zpid"]),
                    "values": embedding,
                    "metadata": create_metadata(clean_doc)
                }
                vector_batch.append(vector)

                if len(vector_batch) >= BATCH_SIZE:
                    upsert_batch(vector_batch[:BATCH_SIZE])
                    del vector_batch[:BATCH_SIZE]
            except Exception as e:
                logging.error("Error processing record: %s", e)

    return vector_batch


def upsert_properties():
    """
    Process a series of JSON files, generate embeddings, and upsert the data into Pinecone.
    """
    # List the JSON files to process. Adjust paths as needed.
    files = [
        "Zillow-March2025-dataset_part0.json",
        "Zillow-March2025-dataset_part1.json",
        "Zillow-March2025-dataset_part2.json",
        "Zillow-March2025-dataset_part3.json",
    ]
    vector_batch = []

    for file_name in files:
        file_path = Path(__file__).resolve().parent / file_name
        logging.info("Processing file: %s", file_path)
        try:
            vector_batch = process_file_streaming(file_path, vector_batch)
        except Exception as e:
            logging.error("Error processing file %s: %s", file_name, e)

    # Upsert any remaining vectors.
    if vector_batch:
        upsert_batch(vector_batch)
        logging.info("Upserted final batch of remaining vectors.")

    logging.info("Data upsert completed.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        upsert_properties()
    except Exception as err:
        logging.error("Error in upserting properties data: %s", err)
        sys.exit(1)
