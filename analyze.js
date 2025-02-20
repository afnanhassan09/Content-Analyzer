const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env file
});

async function testGPTVision() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an AI that can analyze images." },
        {
          role: "user",
          content: [
            { type: "text", text: "What do you see in this image?" },
            { type: "image_url", image_url: { url: "https://studyninja.s3.ap-south-1.amazonaws.com/images/1739907212979_logo.jpg" } },
          ],
        },
      ],
    });

    console.log("Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

testGPTVision();
