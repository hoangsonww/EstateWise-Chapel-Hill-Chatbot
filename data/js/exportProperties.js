require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const { Parser } = require("json2csv");

const propertySchema = new mongoose.Schema({}, { strict: false });
const Property = mongoose.model("Property", propertySchema, "properties");

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not defined in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    exportToCSV();
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB", err);
    process.exit(1);
  });

async function exportToCSV() {
  try {
    const properties = await Property.find({}).lean();
    if (!properties || properties.length === 0) {
      console.log("No property data found");
      return;
    }

    // Define CSV fields – adjust as needed.
    const fields = [
      "zpid",
      "city",
      "state",
      "homeStatus",
      "address.streetAddress",
      "address.city",
      "address.state",
      "address.zipcode",
      "bedrooms",
      "bathrooms",
      "price",
      "yearBuilt",
      "latitude",
      "longitude",
      "livingArea",
      "homeType",
      "listingDataSource",
      "description",
    ];
    const opts = { fields };

    // Convert JSON to CSV.
    const parser = new Parser(opts);
    const csv = parser.parse(properties);

    // Write CSV data to file.
    fs.writeFileSync("properties_export.csv", csv);
    console.log("Exported properties to properties_export.csv");
  } catch (error) {
    console.error("Error exporting properties", error);
  } finally {
    mongoose.connection.close();
  }
}
