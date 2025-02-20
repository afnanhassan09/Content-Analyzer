require("dotenv").config();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is securely loaded
});

async function moderateContent(content, type) {
  try {
    let messages = [
      {
        role: "system",
        content: `You are a content moderation AI. Analyze the given ${
          type === "file" ? "image" : "text"
        } and classify it as "Safe", "Warning", or "Harmful". 
        Provide a moderation score from 0 to 100 (0 = completely safe, 100 = extremely harmful). 
        Also, give a reason for your classification.
        
        **IMPORTANT:** Respond ONLY in the following JSON format:
        {
          "classification": "Safe",
          "moderationScore": 0,
          "reason": "Your explanation here."
        }`,
      },
    ];

    if (type === "file") {
      // Send image URL for analysis
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Analyze this image:" },
          { type: "image_url", image_url: { url: content } },
        ],
      });
    } else {
      // Send text content for analysis
      messages.push({
        role: "user",
        content: `Analyze this content: "${content}"`,
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      temperature: 0.2,
    });

    const aiResponse = response.choices[0].message.content;
    return JSON.parse(aiResponse);
  } catch (error) {
    console.error("OpenAI Moderation Error:", error);
    throw new Error("Failed to analyze content.");
  }
}

// Example usage:
// (async () => {
//   try {
//     const result = await moderateContent("file", "https://your-image-url.com/image.jpg");
//     console.log("Parsed Result:", result);
//   } catch (error) {
//     console.error("Error:", error);
//   }
// })();

module.exports = moderateContent;
