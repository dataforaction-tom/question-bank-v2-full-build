import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { question } = req.body;
      console.log('Question received for embedding:', question);

      const response = await openai.createEmbedding({
        model: "text-embedding-3-small",
        input: question,
      });

      console.log('OpenAI response:', response.data);
      const [{ embedding }] = response.data.data;

      const categories = ["Poverty", "Health", "Advice", "Education", "Environment"];
      const prompt = `Question: "${question}"\nCategorize this question into one of the following categories: ${categories.join(", ")}. If you cannot find a category that closely matches the question you should attempt to create a new category. Category: \n`;
      console.log(prompt);
      
      const categoryResponse = await openai.createCompletion({
        model: "gpt-3.5-turbo-instruct",
        prompt: prompt,
        max_tokens: 50
      });

      console.log('Category response:', categoryResponse.data);
      const category = categoryResponse.data.choices[0].text.trim();
      console.log("Category:", category);

      res.status(200).json({ embedding, category });
    } catch (error) {
      console.error('Error generating embedding:', error);
      res.status(500).json({ message: 'Failed to generate embedding', error: error.toString() });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
}
