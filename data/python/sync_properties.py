import os
import sys
import csv
import logging
from dotenv import load_dotenv
from pymongo import MongoClient

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

CSV_FILE = "properties_sync.csv"


def sync_to_csv():
    try:
        properties = list(properties_collection.find({}))
        if not properties:
            logging.info("No properties found in the database.")
            return

        with open(CSV_FILE, "w", newline="", encoding="utf-8") as csvfile:
            # Get header keys from the first document
            header = sorted(properties[0].keys())
            writer = csv.DictWriter(csvfile, fieldnames=header)
            writer.writeheader()

            for prop in properties:
                # Convert _id to str for CSV compatibility
                if "_id" in prop:
                    prop["_id"] = str(prop["_id"])
                writer.writerow(prop)
        logging.info(f"Synced {len(properties)} properties to {CSV_FILE}")
    except Exception as err:
        logging.error("Error during sync: %s", err)
    finally:
        client.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    sync_to_csv()
