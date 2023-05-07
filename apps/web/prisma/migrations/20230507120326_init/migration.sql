-- CreateTable
CREATE TABLE "SymbolConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "json" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastTriggered" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredBy" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    CONSTRAINT "Run_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SymbolConfig" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Submission" (
    "submissionId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "evaluatedAt" DATETIME NOT NULL,
    "visitSubmissionId" INTEGER NOT NULL,
    "colorChange" TEXT,
    "runId" TEXT NOT NULL,
    CONSTRAINT "Submission_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
