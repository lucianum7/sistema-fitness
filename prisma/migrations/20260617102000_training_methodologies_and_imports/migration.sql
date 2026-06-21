ALTER TABLE "UserProfile" ADD COLUMN "trainingMethodology" TEXT NOT NULL DEFAULT 'AUTO';

ALTER TABLE "Exercise" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "metCode" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "metDefault" DOUBLE PRECISION;
ALTER TABLE "Exercise" ADD COLUMN "metLabel" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "sourceMet" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX "Exercise_externalId_key" ON "Exercise"("externalId");

ALTER TABLE "Food" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Food" ADD COLUMN "netCarbs100g" DOUBLE PRECISION;
ALTER TABLE "Food" ADD COLUMN "ironMg100g" DOUBLE PRECISION;
ALTER TABLE "Food" ADD COLUMN "calciumMg100g" DOUBLE PRECISION;
ALTER TABLE "Food" ADD COLUMN "vitaminKUg100g" DOUBLE PRECISION;
ALTER TABLE "Food" ADD COLUMN "dataVersion" TEXT;
ALTER TABLE "Food" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX "Food_externalId_key" ON "Food"("externalId");

CREATE TABLE "TrainingProtocol" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL,
    "equipment" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProtocol_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingProtocolItem" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "dayOrder" INTEGER NOT NULL,
    "dayName" TEXT NOT NULL,
    "exerciseOrder" INTEGER NOT NULL,
    "exerciseExternalId" TEXT,
    "exerciseName" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT,
    "durationS" INTEGER,
    "distanceM" DOUBLE PRECISION,
    "restS" INTEGER NOT NULL,
    "rir" TEXT,
    "notes" TEXT,

    CONSTRAINT "TrainingProtocolItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GenerationRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingProtocol_externalId_key" ON "TrainingProtocol"("externalId");
CREATE INDEX "TrainingProtocol_daysPerWeek_level_idx" ON "TrainingProtocol"("daysPerWeek", "level");
CREATE UNIQUE INDEX "TrainingProtocolItem_protocolId_dayOrder_exerciseOrder_key" ON "TrainingProtocolItem"("protocolId", "dayOrder", "exerciseOrder");
CREATE INDEX "TrainingProtocolItem_exerciseExternalId_idx" ON "TrainingProtocolItem"("exerciseExternalId");
CREATE UNIQUE INDEX "GenerationRule_key_key" ON "GenerationRule"("key");

ALTER TABLE "TrainingProtocolItem" ADD CONSTRAINT "TrainingProtocolItem_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "TrainingProtocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
