-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "valueString" TEXT,
    "valueQuantity" DOUBLE PRECISION,
    "valueUnit" TEXT,
    "effectiveDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "performerId" TEXT,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Observation_encounterId_idx" ON "Observation"("encounterId");

-- CreateIndex
CREATE INDEX "Observation_patientId_idx" ON "Observation"("patientId");

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "Practitioner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
