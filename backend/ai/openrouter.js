async function requestOpenAiCompatible({ config, messages, responseShape }) {
  if (!config.apiKey || config.apiKey === 'PASTE_API_KEY_HERE') {
    throw new Error('OpenRouter API key is not configured.');
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Иначе MVP'
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`AI provider error: ${response.status} ${details}`);
  }

  const data = await response.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) {
    throw new Error('AI provider returned an empty response.');
  }

  return normalizeJson(content, responseShape);
}

function normalizeJson(content, responseShape) {
  const parsed = JSON.parse(content);
  return responseShape(parsed);
}

module.exports = { requestOpenAiCompatible };
