/**
 * Detect if text is a confirmation question (expecting yes/no).
 */
function isConfirmationQuestion(text) {
  const confirmPatterns = [
    /confirm\s*kar/i,
    /book\s*kar/i,
    /pakka\s*hai/i,
    /proceed\s*kar/i,
    /shall\s*i\s*(book|confirm)/i,
    /want\s*to\s*(confirm|book|proceed)/i,
    /\bconfirm\b.*\?/i,
    /\bcancel\b.*\?/i,
  ];
  return confirmPatterns.some((p) => p.test(text));
}

/**
 * Extract numbered items from text (e.g., "1. Haircut\n2. Facial").
 * Returns array of { id, title, description } or null if no pattern found.
 */
function extractNumberedItems(text) {
  const lines = text.split('\n');
  const items = [];

  for (const line of lines) {
    const match = line.match(/^\s*(\d+)[.)]\s*(.+)/);
    if (match) {
      const fullText = match[2].trim();
      // Split on " — " or " - " for title/description
      const parts = fullText.split(/\s*[—–-]\s*/);
      items.push({
        id: `item_${match[1]}`,
        title: parts[0].substring(0, 24), // WhatsApp button title limit
        description: parts.slice(1).join(' — ').substring(0, 72) || undefined,
      });
    }
  }

  return items.length >= 2 ? items : null;
}

/**
 * Format LLM text response into WhatsApp-compatible message structures.
 *
 * @param {string} text - The LLM's text response
 * @returns {Object} WhatsApp message structure
 */
function formatForWhatsApp(text) {
  if (!text) {
    return { type: 'text', body: '' };
  }

  // 1. Check for confirmation question → buttons
  if (isConfirmationQuestion(text)) {
    return {
      type: 'button',
      body: text,
      buttons: [
        { id: 'confirm_yes', title: 'Haan, Book Karo' },
        { id: 'confirm_no', title: 'Nahi, Cancel' },
      ],
    };
  }

  // 2. Check for numbered items
  const items = extractNumberedItems(text);
  if (items) {
    // Strip numbered items from body to use as header text
    const headerLine = text.split('\n').find((l) => !l.match(/^\s*\d+[.)]/));
    const header = headerLine ? headerLine.trim() : '';

    if (items.length <= 3) {
      // 2-3 items → buttons
      return {
        type: 'button',
        body: text,
        buttons: items.slice(0, 3).map((item) => ({
          id: item.id,
          title: item.title,
        })),
      };
    }

    // 4+ items → list
    return {
      type: 'list',
      body: header || text.split('\n')[0],
      buttonText: 'Options Dekhein',
      sections: [
        {
          title: 'Options',
          rows: items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
          })),
        },
      ],
    };
  }

  // 3. Default → plain text
  return { type: 'text', body: text };
}

module.exports = { formatForWhatsApp };
