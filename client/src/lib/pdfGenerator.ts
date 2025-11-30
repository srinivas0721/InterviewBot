// PDF Report Generator Utility
// client/src/lib/pdfGenerator.ts

import type { SessionResults, DetailedAnswer } from '@/lib/types';

/**
 * Generate a beautiful HTML template for PDF conversion
 */
export function generatePDFHTML(
  results: SessionResults,
  detailedAnswers: DetailedAnswer[]
): string {
  const { session, overallScore, categoryScores, strengths, weaknesses, recommendations } = results;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Interview Report - ${session.company} ${session.role}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 60px 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 4s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .header h1 {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }

    .header .subtitle {
      font-size: 24px;
      opacity: 0.9;
      position: relative;
      z-index: 1;
    }

    .header .date {
      font-size: 16px;
      opacity: 0.8;
      margin-top: 20px;
      position: relative;
      z-index: 1;
    }

    .content {
      padding: 40px;
    }

    .score-card {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 40px;
      border-radius: 15px;
      text-align: center;
      margin-bottom: 40px;
      box-shadow: 0 10px 30px rgba(245, 87, 108, 0.3);
    }

    .score-card h2 {
      font-size: 24px;
      margin-bottom: 15px;
      opacity: 0.9;
    }

    .score-card .score {
      font-size: 72px;
      font-weight: 800;
      line-height: 1;
    }

    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    .section h2 {
      font-size: 28px;
      margin-bottom: 20px;
      color: #667eea;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
      display: flex;
      align-items: center;
    }

    .section h2::before {
      content: '';
      width: 8px;
      height: 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin-right: 15px;
      border-radius: 4px;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .category-item {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
      border-radius: 12px;
      border-left: 5px solid #667eea;
    }

    .category-item .name {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
    }

    .category-item .score {
      font-size: 32px;
      font-weight: 800;
      color: #667eea;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .list-section {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      margin-top: 20px;
    }

    .list-section ul {
      list-style: none;
    }

    .list-section li {
      padding: 12px 0;
      padding-left: 30px;
      position: relative;
      border-bottom: 1px solid #e0e0e0;
    }

    .list-section li:last-child {
      border-bottom: none;
    }

    .list-section.strengths li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
      font-size: 20px;
    }

    .list-section.weaknesses li::before {
      content: '⚠';
      position: absolute;
      left: 0;
      font-size: 18px;
    }

    .list-section.recommendations li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
      font-size: 20px;
    }

    .qa-section {
      margin-top: 20px;
    }

    .qa-item {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 25px;
      page-break-inside: avoid;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .qa-item .question {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      font-weight: 600;
    }

    .qa-item .category-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      margin-bottom: 8px;
    }

    .qa-item .answer {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      line-height: 1.8;
    }

    .qa-item .score-breakdown {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
      margin-bottom: 15px;
    }

    .score-pill {
      text-align: center;
      padding: 10px;
      border-radius: 8px;
      background: #f0f0f0;
    }

    .score-pill .label {
      font-size: 11px;
      color: #666;
      display: block;
      margin-bottom: 4px;
    }

    .score-pill .value {
      font-size: 20px;
      font-weight: 800;
    }

    .score-excellent { color: #10b981; }
    .score-good { color: #667eea; }
    .score-average { color: #f59e0b; }
    .score-poor { color: #ef4444; }

    .feedback-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }

    .feedback-box h4 {
      color: #92400e;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .feedback-box p {
      color: #78350f;
      font-size: 14px;
    }

    .footer {
      background: #1a1a2e;
      color: white;
      padding: 30px;
      text-align: center;
      margin-top: 40px;
    }

    .footer p {
      opacity: 0.8;
      font-size: 14px;
    }

    @media print {
      body {
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Interview Performance Report</h1>
      <div class="subtitle">${session.company} - ${session.role}</div>
      <div class="date">Completed on ${new Date(session.completedAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</div>
    </div>

    <div class="content">
      <div class="score-card">
        <h2>Overall Performance Score</h2>
        <div class="score">${overallScore.toFixed(1)}/10</div>
      </div>

      <div class="section">
        <h2>Category Performance</h2>
        <div class="category-grid">
          ${Object.entries(categoryScores).map(([category, score]) => `
            <div class="category-item">
              <div class="name">${category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
              <div class="score">${(score as number).toFixed(1)}/10</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${(score as number) * 10}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      ${strengths.length > 0 ? `
      <div class="section">
        <h2>Strengths</h2>
        <div class="list-section strengths">
          <ul>
            ${strengths.map(strength => `<li>${strength}</li>`).join('')}
          </ul>
        </div>
      </div>
      ` : ''}

      ${weaknesses.length > 0 ? `
      <div class="section">
        <h2>Areas for Improvement</h2>
        <div class="list-section weaknesses">
          <ul>
            ${weaknesses.map(weakness => `<li>${weakness}</li>`).join('')}
          </ul>
        </div>
      </div>
      ` : ''}

      ${recommendations.length > 0 ? `
      <div class="section">
        <h2>Recommendations</h2>
        <div class="list-section recommendations">
          <ul>
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2>Detailed Question-by-Question Analysis</h2>
        <div class="qa-section">
          ${detailedAnswers.map((item, index) => {
            const answer = item.answer;
            if (!answer) return '';
            
            const getScoreClass = (score: number | undefined) => {
              if (!score) return 'score-poor';
              if (score >= 8) return 'score-excellent';
              if (score >= 6) return 'score-good';
              if (score >= 4) return 'score-average';
              return 'score-poor';
            };

            return `
              <div class="qa-item">
                <div class="category-badge">${item.question.category.toUpperCase()}</div>
                <div class="question">
                  <strong>Question ${index + 1}:</strong> ${item.question.questionText}
                </div>
                <div class="answer">
                  <strong>Your Answer:</strong><br>
                  ${answer.subjectiveAnswer || answer.voiceTranscript || 'No answer provided'}
                </div>
                <div class="score-breakdown">
                  <div class="score-pill">
                    <span class="label">Overall</span>
                    <span class="value ${getScoreClass(answer.score)}">${answer.score?.toFixed(1) || 'N/A'}/10</span>
                  </div>
                  ${answer.evaluationDetails?.clarity ? `
                  <div class="score-pill">
                    <span class="label">Clarity</span>
                    <span class="value ${getScoreClass(answer.evaluationDetails.clarity)}">${answer.evaluationDetails.clarity.toFixed(1)}/10</span>
                  </div>
                  ` : ''}
                  ${answer.evaluationDetails?.depth ? `
                  <div class="score-pill">
                    <span class="label">Depth</span>
                    <span class="value ${getScoreClass(answer.evaluationDetails.depth)}">${answer.evaluationDetails.depth.toFixed(1)}/10</span>
                  </div>
                  ` : ''}
                  ${answer.evaluationDetails?.relevance ? `
                  <div class="score-pill">
                    <span class="label">Relevance</span>
                    <span class="value ${getScoreClass(answer.evaluationDetails.relevance)}">${answer.evaluationDetails.relevance.toFixed(1)}/10</span>
                  </div>
                  ` : ''}
                  ${answer.evaluationDetails?.structure ? `
                  <div class="score-pill">
                    <span class="label">Structure</span>
                    <span class="value ${getScoreClass(answer.evaluationDetails.structure)}">${answer.evaluationDetails.structure.toFixed(1)}/10</span>
                  </div>
                  ` : ''}
                </div>
                ${answer.feedback ? `
                <div class="feedback-box">
                  <h4>Feedback:</h4>
                  <p>${answer.feedback}</p>
                </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Generated by InterviewBot - AI-Powered Interview Practice Platform</p>
      <p>© ${new Date().getFullYear()} InterviewBot. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Convert HTML to PDF and trigger download
 * Uses browser's print functionality with custom styling
 */
export async function downloadPDFReport(
  results: SessionResults,
  detailedAnswers: DetailedAnswer[]
): Promise<void> {
  const htmlContent = generatePDFHTML(results, detailedAnswers);
  
  // Create a blob with the HTML content
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Open in new window for printing
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Clean up
        setTimeout(() => {
          printWindow.close();
          URL.revokeObjectURL(url);
        }, 100);
      }, 500);
    };
  } else {
    // Fallback: download HTML file
    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-report-${results.session.company}-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
