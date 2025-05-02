import rateLimit from 'express-rate-limit';

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // 5 submissions per windowMs
  message: 'You have reached the maximum number of submissions for today. Please try again tomorrow.',
  keyGenerator: (req) => req.headers['x-real-ip'] || req.ip,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Apply rate limiting
    await new Promise((resolve, reject) => {
      limiter(req, res, (result) => {
        if (result instanceof Error) {
          reject(result);
        }
        resolve(result);
      });
    });

    const { name, email, message } = req.body;

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    // Here you would typically integrate with your preferred email service
    // For now, we'll just log the submission and return success
    console.log('Form submission:', {
      to: 'omrmoh953@gmail.com',
      from: email,
      name,
      message
    });

    // Get remaining submissions
    const remaining = 5 - (req.rateLimit ? req.rateLimit.current : 0);

    return res.status(200).json({ 
      message: 'Message sent successfully',
      remainingSubmissions: remaining
    });

  } catch (error) {
    if (error.message.includes('rate limit')) {
      return res.status(429).json({ 
        message: 'You have reached the maximum number of submissions for today. Please try again tomorrow.' 
      });
    }
    
    console.error('Error processing submission:', error);
    return res.status(500).json({ message: 'Error sending message. Please try again later.' });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
}; 