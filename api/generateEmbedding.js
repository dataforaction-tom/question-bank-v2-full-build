const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  console.log('Received request:', req.body);
  if (req.method === 'POST') {
    try {
      const { question } = req.body;
      console.log('Question received for embedding:', question);

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
      }

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question,
      });

      console.log('OpenAI embedding response:', response);
      const [{ embedding }] = response.data;

      const categories = ["Poverty", "Health", "Advice", "Education", "Environment", "Philanthropy", "Wellbeing", "Technology", "Citizenship", "Neighbourhoods"];
      const prompt = `Question: "${question}"\nCategorize this question into one of the following categories: ${categories.join(", ")}. If you cannot find a category that closely matches the question you should attempt to create a new category. Always use the most specific category that matches the question. Always use British English. Never use multiple categories or include a backslash. Category: \n`;
      console.log('Category prompt:', prompt);
      
      const categoryResponse = await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: prompt,
        max_tokens: 50
      });

      console.log('Category response:', categoryResponse);
      const category = categoryResponse.choices[0].text.trim();
      console.log("Category:", category);

      res.status(200).json({ embedding, category });
    } catch (error) {
      console.error('Error in API route:', error);
      res.status(500).json({ message: 'Failed to generate embedding or category', error: error.toString() });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
};
