require("dotenv").config();
const express = require("express");
const { Storage } = require("@google-cloud/storage");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const storage = new Storage({ keyFilename: "path/to/service-account.json" });
const bucketName = "new-bucket-logo";

app.post("/get-signed-url", async (req, res) => {
  const { fileName, fileType } = req.body;
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  const options = {
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: fileType,
  };

  try {
    const [url] = await file.getSignedUrl(options);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
