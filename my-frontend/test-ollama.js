// Test Ollama connection with the exact format
const OLLAMA_URL = process.env.OLLAMA_URL || 'https://ned-throatless-secondarily.ngrok-free.dev';

async function testOllama() {
  console.log('Testing Ollama at:', OLLAMA_URL);
  console.log('Model: llama3:latest\n');

  const messages = [
    { role: "user", content: "hello ollama" }
  ];

  try {
    // Test /api/chat endpoint
    console.log('📤 Sending request to /api/chat...');
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        messages: messages,
        stream: false
      })
    });

    console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Response received:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('\n❌ Error response:', text);
    }
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
  }
}

testOllama();
