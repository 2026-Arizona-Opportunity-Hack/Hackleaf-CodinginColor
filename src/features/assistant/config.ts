export function demoAIEnabled(){return process.env.AI_DEMO_ENABLED==='true'&&!!process.env.OPENAI_API_KEY?.trim();}
