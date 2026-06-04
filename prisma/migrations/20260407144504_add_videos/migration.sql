-- CreateTable
CREATE TABLE "Videos" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "videoId" VARCHAR(255) NOT NULL,
    "videoKey" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Videos_teacherId_idx" ON "Videos"("teacherId");

-- AddForeignKey
ALTER TABLE "Videos" ADD CONSTRAINT "Videos_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("teacherId") ON DELETE RESTRICT ON UPDATE CASCADE;
