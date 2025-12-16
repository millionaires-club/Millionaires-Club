import { callGemini } from './services/geminiService.ts';

async function testGemini() {
  console.log('Testing Gemini API...\n');
  
  const prompt = 'Say hello and confirm you are working correctly in one short sentence.';
  const response = await callGemini(prompt);
  
  console.log('Response:', response);
}

testGemini();
