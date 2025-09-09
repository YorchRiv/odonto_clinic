-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('ADMIN', 'DOCTOR', 'RECEPCIONISTA');

-- CreateEnum
CREATE TYPE "public"."EstadoPaciente" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "public"."EstadoCita" AS ENUM ('NUEVA', 'CONFIRMADA', 'PENDIENTE', 'CANCELADA', 'COMPLETADA');

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "public"."Rol" NOT NULL DEFAULT 'RECEPCIONISTA',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Paciente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "ultimaVisita" TIMESTAMP(3),
    "estado" "public"."EstadoPaciente" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Servicio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cita" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "public"."EstadoCita" NOT NULL DEFAULT 'NUEVA',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HistoriaClinica" (
    "id" SERIAL NOT NULL,
    "citaId" INTEGER NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoriaClinica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "public"."Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_identificacion_key" ON "public"."Paciente"("identificacion");

-- CreateIndex
CREATE UNIQUE INDEX "Servicio_nombre_key" ON "public"."Servicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "HistoriaClinica_citaId_key" ON "public"."HistoriaClinica"("citaId");

-- AddForeignKey
ALTER TABLE "public"."Cita" ADD CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "public"."Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cita" ADD CONSTRAINT "Cita_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "public"."Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "public"."Cita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "public"."Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
