async function run() {
  try {
    const res = await fetch('http://localhost:3101/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Bakit ginawa ang Infra Watch?",
        conversationId: "test-" + Date.now(),
        surface: "public_chat",
        responseMode: "text"
      })
    });
    
    if (!res.ok) {
      console.error("Error:", res.status, await res.text());
      process.exit(1);
    }
    
    const text = await res.text();
    console.log("RESPONSE:", text);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
