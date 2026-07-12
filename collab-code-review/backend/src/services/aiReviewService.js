const AppError = require('../utils/AppError');

/**
 * Fallback local parser to generate dynamic code reviews if no API keys are provided.
 */
const generateMockReview = (code, language) => {
  const bugs = [];
  const codeSmells = [];
  const securityIssues = [];
  const lines = code.split('\n');

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    // Scan for potential security issues
    if (lineText.includes('password') && (lineText.includes('=') || lineText.includes(':')) && /['"`][a-zA-Z0-9_.-]{4,}['"`]/.test(lineText)) {
      securityIssues.push({
        line: lineNum,
        issue: 'Potential hardcoded password or credentials detected.',
        severity: 'high'
      });
    }
    if (lineText.includes('eval(')) {
      securityIssues.push({
        line: lineNum,
        issue: 'Use of eval() detected. This represents a critical remote code execution vulnerability.',
        severity: 'high'
      });
    }

    // Scan for bugs
    if (lineText.includes('==') && !lineText.includes('===') && (language === 'javascript' || language === 'typescript')) {
      bugs.push({
        line: lineNum,
        issue: 'Use of non-strict equality (==). Prefer strict equality (===) to avoid type coercion bugs.',
        severity: 'low'
      });
    }
    if (lineText.includes('catch') && (lineText.includes('{}') || lineText.includes('catch(err) {}') || lineText.includes('catch (e) {}'))) {
      bugs.push({
        line: lineNum,
        issue: 'Empty catch block. Unhandled exceptions can crash the server silently or lead to unstable application state.',
        severity: 'medium'
      });
    }

    // Scan for code smells
    if (lineText.includes('console.log')) {
      codeSmells.push({
        line: lineNum,
        issue: 'Console logging in production code.',
        suggestion: 'Replace console.log with a proper winston logger or remove debug logs.'
      });
    }
    if (lineText.includes('TODO') || lineText.includes('FIXME')) {
      codeSmells.push({
        line: lineNum,
        issue: 'Unresolved task markers (TODO/FIXME) present in codebase.',
        suggestion: 'Complete the pending implementation or track it in your ticket tracker.'
      });
    }
    if (lineText.length > 100) {
      codeSmells.push({
        line: lineNum,
        issue: 'Line length exceeds 100 characters, reducing code readability.',
        suggestion: 'Break line down or extract variables/functions to keep lines concise.'
      });
    }
  });

  // Calculate score
  let score = 100;
  score -= (bugs.length * 10);
  score -= (securityIssues.length * 20);
  score -= (codeSmells.length * 5);
  score = Math.max(20, Math.min(100, score));

  // Add dummy general comments if code is clean
  if (bugs.length === 0 && codeSmells.length === 0 && securityIssues.length === 0) {
    codeSmells.push({
      line: 1,
      issue: 'Initial review summary.',
      suggestion: 'Code structure looks clean and matches best practices. Consider adding comprehensive unit tests to protect imports.'
    });
    score = 95;
  }

  return {
    bugs,
    codeSmells,
    securityIssues,
    overallQualityScore: score
  };
};

/**
 * Request Code Review from OpenAI.
 */
const requestOpenAIReview = async (code, language, apiKey) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an expert senior code reviewer. You must inspect the code and return only a JSON object containing lists of bugs, codeSmells, securityIssues, and an overallQualityScore.'
        },
        {
          role: 'user',
          content: `Please review this ${language} code and return valid JSON in this schema:
{
  "bugs": [
    {"line": 10, "issue": "Index out of bounds danger", "severity": "high"}
  ],
  "codeSmells": [
    {"line": 5, "issue": "Deeply nested loops", "suggestion": "Refactor nested loop into a helper map"}
  ],
  "securityIssues": [
    {"line": 15, "issue": "SQL injection vector due to raw concatenation", "severity": "high"}
  ],
  "overallQualityScore": 85
}

Code:
\`\`\`${language}
${code}
\`\`\``
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API responded with code ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const rawJSON = result.choices[0].message.content;
  return JSON.parse(rawJSON);
};

/**
 * Request Code Review from Anthropic.
 */
const requestAnthropicReview = async (code, language, apiKey) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `You are an expert senior code reviewer. Review the following ${language} code.
Return a raw JSON object (and nothing else, no markdown fences, no extra text) with this format:
{
  "bugs": [
    {"line": 10, "issue": "Detailed bug description", "severity": "high"}
  ],
  "codeSmells": [
    {"line": 5, "issue": "Code smell description", "suggestion": "Refactoring suggestion"}
  ],
  "securityIssues": [
    {"line": 15, "issue": "Security threat details", "severity": "medium"}
  ],
  "overallQualityScore": 75
}

Code:
${code}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API responded with code ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text = result.content[0].text;
  
  // Extract json block if Claude returned markdown fences
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}') + 1;
  const jsonString = text.substring(jsonStart, jsonEnd);
  
  return JSON.parse(jsonString);
};

/**
 * Perform LLM code review.
 */
const getCodeReview = async (code, language) => {
  const openAIApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!code || !code.trim()) {
    throw new AppError('No code provided for review', 400);
  }

  try {
    if (openAIApiKey) {
      return await requestOpenAIReview(code, language, openAIApiKey);
    } else if (anthropicApiKey) {
      return await requestAnthropicReview(code, language, anthropicApiKey);
    } else {
      // Fallback to static mock analysis
      return generateMockReview(code, language);
    }
  } catch (err) {
    // If external API fails, gracefully fallback to mock or bubble up
    console.error('LLM API review failed, using fallback mock generator:', err.message);
    return generateMockReview(code, language);
  }
};

module.exports = {
  getCodeReview,
};
