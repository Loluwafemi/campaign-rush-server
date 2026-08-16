-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClickStatus" AS ENUM ('VALID', 'DUPLICATE', 'BOT');

-- CreateTable
CREATE TABLE "hosts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ogImageUrl" TEXT,
    "targetGroupUrl" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "refCode" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "country" TEXT,
    "status" "ClickStatus" NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "click_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_audit_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hosts_email_key" ON "hosts"("email");

-- CreateIndex
CREATE INDEX "events_hostId_idx" ON "events"("hostId");

-- CreateIndex
CREATE INDEX "events_status_expiresAt_idx" ON "events"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "participants_refCode_key" ON "participants"("refCode");

-- CreateIndex
CREATE INDEX "participants_eventId_idx" ON "participants"("eventId");

-- CreateIndex
CREATE INDEX "participants_eventId_score_idx" ON "participants"("eventId", "score");

-- CreateIndex
CREATE INDEX "click_logs_eventId_clickedAt_idx" ON "click_logs"("eventId", "clickedAt");

-- CreateIndex
CREATE INDEX "click_logs_participantId_clickedAt_idx" ON "click_logs"("participantId", "clickedAt");

-- CreateIndex
CREATE INDEX "event_audit_logs_eventId_timestamp_idx" ON "event_audit_logs"("eventId", "timestamp");

-- CreateIndex
CREATE INDEX "event_audit_logs_actionType_idx" ON "event_audit_logs"("actionType");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_logs" ADD CONSTRAINT "click_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_logs" ADD CONSTRAINT "click_logs_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_audit_logs" ADD CONSTRAINT "event_audit_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
