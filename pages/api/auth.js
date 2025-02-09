// pages/api/auth.js
import { verifyAdminCredentials } from '../../utils/googleSheets';

export default async function handler(req, res) {
  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'method_not_allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    const { username, password } = req.body;

    // Input validation with specific messages
    if (!username && !password) {
      return res.status(400).json({
        error: 'missing_credentials',
        message: 'Both username and password are required'
      });
    }

    if (!username) {
      return res.status(400).json({
        error: 'missing_username',
        message: 'Username is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        error: 'missing_password',
        message: 'Password is required'
      });
    }

    // Attempt admin authentication
    console.log('Admin authentication attempt:', { username });
    const admin = await verifyAdminCredentials(username, password);

    if (!admin) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid username or password'
      });
    }

    // Successful authentication
    return res.status(200).json(admin);

  } catch (error) {
    console.error('Admin authentication error:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Handle Google Sheets connection errors specifically
    if (error.message?.includes('Google Sheets')) {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Authentication service is temporarily unavailable'
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}