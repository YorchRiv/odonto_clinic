/*
  Warnings:

  - You are about to drop the column `fecha` on the `Cita` table. All the data in the column will be lost.
  - Added the required column `fechaFin` to the `Cita` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fechaInicio` to the `Cita` table without a default value. This is not possible if the table is not empty.
  - Added the required column `apellido` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Cita" DROP COLUMN "fecha",
ADD COLUMN     "fechaFin" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fechaInicio" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Usuario" ADD COLUMN     "apellido" TEXT NOT NULL;
