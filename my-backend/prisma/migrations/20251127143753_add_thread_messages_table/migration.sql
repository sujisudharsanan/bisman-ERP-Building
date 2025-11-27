-- CreateTable
CREATE TABLE "thread_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'text',
    "attachments" JSONB,
    "replyToId" TEXT,
    "reactions" JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "readBy" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_thread_messages_thread" ON "thread_messages"("threadId");

-- CreateIndex
CREATE INDEX "idx_thread_messages_sender" ON "thread_messages"("senderId");

-- CreateIndex
CREATE INDEX "idx_thread_messages_created" ON "thread_messages"("createdAt");

-- CreateIndex
CREATE INDEX "idx_thread_messages_type" ON "thread_messages"("type");

-- CreateIndex
CREATE INDEX "idx_thread_messages_deleted" ON "thread_messages"("isDeleted");

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (self-referential for replies)
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "thread_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
