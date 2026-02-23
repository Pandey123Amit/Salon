const { Conversation, MessageLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Clean up stale data:
 * - Expire conversations inactive for >24 hours
 * - Delete message logs older than 90 days
 */
async function runCleanup() {
  const now = new Date();

  // Expire stale conversations (>24h inactive)
  const conversationCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const conversationResult = await Conversation.updateMany(
    { isActive: true, lastActivityAt: { $lt: conversationCutoff } },
    { $set: { isActive: false } }
  );

  // Delete old message logs (>90 days)
  const logCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const logResult = await MessageLog.deleteMany({
    createdAt: { $lt: logCutoff },
  });

  const expiredConversations = conversationResult.modifiedCount || 0;
  const deletedLogs = logResult.deletedCount || 0;

  if (expiredConversations > 0 || deletedLogs > 0) {
    logger.info('Cleanup completed', { expiredConversations, deletedLogs });
  }

  return { expiredConversations, deletedLogs };
}

module.exports = { runCleanup };
