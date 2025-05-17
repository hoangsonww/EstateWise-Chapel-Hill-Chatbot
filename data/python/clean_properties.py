import os
import sys
import logging
from dotenv import load_dotenv
from pymongo import MongoClient
from utils import clean_document

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    logging.error("MONGO_URI is not set in .env")
    sys.exit(1)

try:
    client = MongoClient(MONGO_URI)
    db = client.get_default_database()
    properties_collection = db["properties"]
    logging.info("Connected to MongoDB")
except Exception as e:
    logging.error("Error connecting to MongoDB: %s", e)
    sys.exit(1)


def clean_properties():
    try:
        docs = list(properties_collection.find({}))
        total_docs = len(docs)
        logging.info(f"Found {total_docs} documents.")
        updated_count = 0

        for doc in docs:
            cleaned = clean_document(doc)
            result = properties_collection.update_one({"_id": doc["_id"]}, {"$set": cleaned})
            if result.modified_count:
                updated_count += 1
                if updated_count % 100 == 0:
                    logging.info(f"{updated_count} documents updated so far.")
        logging.info(f"Data cleaning completed. Total updated: {updated_count} documents.")
    except Exception as err:
        logging.error("Error during cleaning: %s", err)
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    clean_properties()
