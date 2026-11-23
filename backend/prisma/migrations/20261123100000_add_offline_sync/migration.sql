CREATE TABLE "SyncMutation" (
    "revision" BIGSERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "operationId" UUID NOT NULL,
    "deviceId" UUID,
    "scope" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncMutation_pkey" PRIMARY KEY ("revision")
);

CREATE UNIQUE INDEX "SyncMutation_actorId_operationId_key" ON "SyncMutation"("actorId", "operationId");
CREATE INDEX "SyncMutation_scope_revision_idx" ON "SyncMutation"("scope", "revision");
