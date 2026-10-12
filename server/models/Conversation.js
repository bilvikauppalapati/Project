const mongoose = require('mongoose');

/**
 * A chat thread between an adopter and a shelter (optionally about one animal).
 * Individual messages are in the Message collection; this keeps a summary for the inbox list.
 */
const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: Date,
    },
    // Unread count per participant: { "<userId>": 3 }. Reset to 0 when that user opens the chat.
    unread: { type: Map, of: Number, default: () => ({}) },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
