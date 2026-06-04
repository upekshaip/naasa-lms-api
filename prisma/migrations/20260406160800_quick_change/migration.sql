-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_mediaFolderId_fkey";

-- DropForeignKey
ALTER TABLE "MediaFolder" DROP CONSTRAINT "MediaFolder_parentId_fkey";

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_mediaFolderId_fkey" FOREIGN KEY ("mediaFolderId") REFERENCES "MediaFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
