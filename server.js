const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const path = require('path');
const cors = require('cors');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'https://intercept-csa-backendrender.com',
    'https://intercept-csa-frontend-cgw2g9seo-ukponojs-projects.vercel.app',
    'https://intercept-csa-frontend.vercel.app',
    'https://intercept-csa-admin.vercel.app',
    'http://interceptcsa.org/',
    'https://intercept-csa-backend.onrender.com'
  ],
  methods: ['GET', 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include OPTIONS for preflight
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow custom headers
  credentials: true,
}));
app.use(express.json());

// Log static file requests
app.use('/Uploads', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] Requested: ${req.originalUrl}`);
  next();
});

// Serve static files with error handling
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    console.log(`[${new Date().toISOString()}] Serving: ${filePath}`);
    if (filePath.endsWith('.jpg') || filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  },
  fallthrough: true,
}));

// Handle file not found
app.use('/Uploads', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] File not found: ${req.originalUrl}`);
  res.status(404).send('Image not found');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));

// Scheduled task to publish scheduled posts
const Blog = require('./models/Blog');
const Activity = require('./models/Activity');
cron.schedule('*/1 * * * *', async () => {
  try {
    const now = new Date();
    const blogs = await Blog.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
    });
    for (const blog of blogs) {
      blog.status = 'published';
      blog.scheduledAt = null;
      await blog.save();
      await Activity.create({
        action: 'Blog post published',
        user: blog.author || 'System',
        type: 'blog',
        details: `Published blog: ${blog.title}`,
      });
    }
    if (blogs.length > 0) {
      console.log(`Published ${blogs.length} scheduled blog(s)`);
    }
  } catch (err) {
    console.error('Error in scheduled post task:', err.message);
  }
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Set server timeout (60 seconds)
server.setTimeout(60000);