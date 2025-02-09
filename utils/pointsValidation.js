// utils/pointsValidation.js
export function validateTestPoints(test) {
    switch(test.type) {
      case 'writing': {
        // Writing tests should always be 50 points
        if (test.total_points !== 50) {
          throw new Error('Writing tests must be exactly 50 points');
        }
        break;
      }
      
      case 'reading':
      case 'listening': {
        // Calculate total from questions
        const calculatedTotal = test.content.reduce((total, section) => 
          total + section.questions.reduce((sectionTotal, question) => 
            sectionTotal + question.points, 0), 0);
        
        if (calculatedTotal !== test.total_points) {
          throw new Error(`Point total mismatch: stored ${test.total_points}, calculated ${calculatedTotal}`);
        }
  
        // Validate individual question points
        test.content.forEach((section, sIndex) => {
          section.questions.forEach((question, qIndex) => {
            if (question.points < 1) {
              throw new Error(`Invalid points (${question.points}) for question ${qIndex + 1} in section ${sIndex + 1}`);
            }
          });
        });
        break;
      }
    }
  
    return true;
  }