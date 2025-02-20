const AWS = require("aws-sdk");

require("dotenv").config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const uploadFile = async (fileBuffer, fileName, contentType) => {
  console.log("Uploading image");

  try {
    // Extract file extension
    const fileExtension = fileName.split(".").pop().toLowerCase();

    // Allowed image formats
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];

    // Validate file type
    if (
      !allowedExtensions.includes(fileExtension) ||
      !allowedMimeTypes.includes(contentType)
    ) {
      throw new Error("Invalid file type. Only images are allowed.");
    }

    // Upload to S3
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `images/${Date.now()}_${fileName}`, // Store in an 'images/' folder with a timestamp
      Body: fileBuffer,
      ContentType: contentType,
    };

    const data = await s3.upload(params).promise();
    console.log("Image uploaded successfully! URL: ", data.Location);
    return data.Location;
  } catch (err) {
    console.error("Error uploading image:", err.message);
    throw err;
  }
};

module.exports = uploadFile;
