// Presence / heartbeat socket module
// Updates last_seen_at for a user across thread memberships and emits presence updates.
// Assumes prisma models: threadMember with fields (thread_id, user_id, last_seen_at)

const PRESENCE_HEARTBEAT_MS = 25_000; // client suggested interval

module.exports = function setupPresence(io, prisma) {
  io.on('connection', (socket) => {
    const { userId } = socket.handshake.auth || {};
    if (!userId) return;

    // Tag socket
    socket.data.userId = userId;

    // Mark online immediately
    markSeen(prisma, userId).catch(() => {});

    // Listen for heartbeat
    socket.on('presence:heartbeat', async () => {
      await markSeen(prisma, userId);
      socket.emit('presence:ack');
    });

    socket.on('disconnect', async () => {
      await markSeen(prisma, userId).catch(() => {});
      // Broadcast offline hint (clients decide with time diff)
      io.emit('presence:update', { user_id: userId, last_seen_at: new Date().toISOString() });
    });
  });
};

async function markSeen(prisma, userId) {
  if (!prisma?.threadMember?.updateMany) return;
  const now = new Date();
  try {
    await prisma.threadMember.updateMany({
      where: { userId: Number(userId) },
      data: { last_seen_at: now }
    });
  } catch (e) {
    // swallow errors (DB might be unavailable in tests)
  }
}
