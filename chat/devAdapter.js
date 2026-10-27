function createDevAdapter() {
  let onMessage = null;

  return {
    start(messageHandler) {
      onMessage = messageHandler;
    },

    stop() {
      onMessage = null;
    },

    submitMessage({ user, text } = {}) {
      const author = String(user || '').trim().replace(/^@/, '');
      const message = String(text || '').trim();

      if (!onMessage) return { accepted: false, reason: 'The dev chat adapter is not running.' };
      if (!author || author.length > 25) return { accepted: false, reason: 'Enter a username with 1–25 characters.' };
      if (!message || message.length > 500) return { accepted: false, reason: 'Enter a message with 1–500 characters.' };

      const result = onMessage({ user: author, text: message });
      return { accepted: true, result };
    },
  };
}

module.exports = { createDevAdapter };
