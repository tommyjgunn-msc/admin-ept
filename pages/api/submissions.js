// pages/api/submissions.js
import { recordSubmission } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const submissionData = req.body;
    
    // Validate required fields
    const requiredFields = ['test_id', 'student_id', 'score', 'completed', 'responses'];
    const missingFields = requiredFields.filter(field => !submissionData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    await recordSubmission(submissionData);
    
    res.status(200).json({ message: 'Submission recorded successfully' });
  } catch (error) {
    console.error('Error handling submission:', error);
    res.status(500).json({ message: 'Failed to record submission' });
  }
}