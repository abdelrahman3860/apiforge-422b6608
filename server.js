const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// API key auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['x-api-key'];
  if (process.env.API_KEY && (!key || key !== process.env.API_KEY)) {
    return res.status(401).json({ success: false, error: 'Invalid or missing API key' });
  }
  next();
});

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Endpoint to generate SEO metadata
app.post('/generate-seo-metadata', async (req, res) => {
  try {
    const { productName, productDescription } = req.body;

    // Input validation
    if (!productName || !productDescription) {
      return res.status(400).json({
        success: false,
        error: 'Product name and description are required',
      });
    }

    const prompt = `Generate SEO-optimized metadata for a product named "${productName}" with the description: "${productDescription}". Provide a meta title, meta description, and 5 keyword tags.`;

    const response = await openai.createCompletion({
      model: 'gpt-3.5-turbo',
      prompt,
      max_tokens: 200,
      temperature: 0.7,
    });

    const metadata = response.data.choices[0].text.trim().split('\n');
    const seoMetadata = {};

    metadata.forEach((line) => {
      if (line.startsWith('Meta Title:')) {
        seoMetadata.metaTitle = line.replace('Meta Title:', '').trim();
      } else if (line.startsWith('Meta Description:')) {
        seoMetadata.metaDescription = line.replace('Meta Description:', '').trim();
      } else if (line.startsWith('Keyword Tags:')) {
        seoMetadata.keywordTags = line.replace('Keyword Tags:', '').trim().split(',').map((tag) => tag.trim());
      }
    });

    if (!seoMetadata.metaTitle || !seoMetadata.metaDescription || !seoMetadata.keywordTags) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate SEO metadata',
      });
    }

    return res.json({
      success: true,
      data: seoMetadata,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});