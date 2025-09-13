/*
  Warnings:

  - Added the required column `usuarioId` to the `Cita` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creadoPorId` to the `Paciente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Cita" ADD COLUMN     "usuarioId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."HistoriaClinica" ADD COLUMN     "tipoTratamiento" TEXT;

-- AlterTable
ALTER TABLE "public"."Paciente" ADD COLUMN     "alergias" TEXT,
ADD COLUMN     "creadoPorId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Paciente" ADD CONSTRAINT "Paciente_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cita" ADD CONSTRAINT "Cita_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
