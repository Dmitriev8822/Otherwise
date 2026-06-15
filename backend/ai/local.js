const { requestOpenAiCompatible } = require('./openrouter');

async function requestLocal({ config, messages, responseShape }) {
  return requestOpenAiCompatible({
    config: { ...config, apiKey: 'local' },
    messages,
    responseShape
  });
}

module.exports = { requestLocal };
