/* Simple test to check 9Router connectivity */
import fetch from 'node-fetch';

async function test9Router() {
  const baseUrl = 'http://localhost:20128/v1';

  console.log(`Testing connection to 9Router at ${baseUrl}`);

  try {
    // Test basic connection
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
      },
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Connection error:', error.message);
    console.error('Error details:', error.code, error.errno);
  }
}

test9Router();