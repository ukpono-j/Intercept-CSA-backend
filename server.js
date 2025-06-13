const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const path = require('path');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Create Uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// CORS configuration
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
    'https://interceptcsa.org',
    'https://intercept-csa-backend.onrender.com',
  ],
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
}));

// Middleware
app.use(express.json());

// Log static file requests
app.use('/Uploads', (req, res, next) => {
  console.log(`Serving static file: ${req.path}`);
  next();
});

// Serve static files with error handling
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  },
  fallthrough: true,
}));

// Handle file not found
app.use('/Uploads', (req, res, next) => {
  res.status(404).send('Image not found');
});

// Routes
console.log('Registering routes...');
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
console.log('Routes registered successfully');

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