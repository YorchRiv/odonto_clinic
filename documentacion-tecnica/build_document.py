from pathlib import Path
from datetime import date
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "documentacion-tecnica"
DIAG = WORK / "diagramas"
OUTPUT = ROOT / "Documentacion_Tecnica_OdontoClinic_Final.docx"

NAVY = "123047"
BLUE = "2C6E91"
TEAL = "2A9D8F"
PALE = "EEF5F8"
ALT = "F6F9FA"
GRAY = "5E6B73"
LIGHT = "D9D9D9"
RED = "8F3C3C"
BLACK = "000000"
WHITE = "FFFFFF"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_cell_border(cell, color=LIGHT, size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        el = borders.find(qn(tag))
        if el is None:
            el = OxmlElement(tag)
            borders.append(el)
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), size)
        el.set(qn("w:color"), color)


def repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def cant_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:cantSplit")
    tr_pr.append(el)


def set_repeat_keep(paragraph):
    p_pr = paragraph._p.get_or_add_pPr()
    keep = OxmlElement("w:keepNext")
    p_pr.append(keep)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Página ")
    run.font.size = Pt(8.5)
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    begin_run = OxmlElement("w:r")
    begin_run.append(fld_begin)
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    instr_run = OxmlElement("w:r")
    instr_run.append(instr)
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    sep_run = OxmlElement("w:r")
    sep_run.append(fld_sep)
    text_run = OxmlElement("w:r")
    text = OxmlElement("w:t")
    text.text = "1"
    text_run.append(text)
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    end_run = OxmlElement("w:r")
    end_run.append(fld_end)
    paragraph._p.extend([begin_run, instr_run, sep_run, text_run, end_run])


def add_toc(paragraph):
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    begin_run = OxmlElement("w:r")
    begin_run.append(begin)
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = ' TOC \\o "1-3" \\h \\z \\u '
    instr_run = OxmlElement("w:r")
    instr_run.append(instr)
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    separate_run = OxmlElement("w:r")
    separate_run.append(separate)
    placeholder = OxmlElement("w:t")
    placeholder.text = "Tabla de contenido actualizable"
    result_run = OxmlElement("w:r")
    result_run.append(placeholder)
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    end_run = OxmlElement("w:r")
    end_run.append(end)
    paragraph._p.extend([begin_run, instr_run, separate_run, result_run, end_run])


def set_update_fields(doc):
    settings = doc.settings._element
    update = settings.find(qn("w:updateFields"))
    if update is None:
        update = OxmlElement("w:updateFields")
        settings.append(update)
    update.set(qn("w:val"), "true")


def configure_styles(doc):
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(BLACK)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15
    for name, size, before, after in (("Title", 28, 0, 10), ("Subtitle", 13, 0, 10), ("Heading 1", 17, 14, 8), ("Heading 2", 13.5, 11, 6), ("Heading 3", 11.5, 9, 4)):
        st = styles[name]
        st.font.name = "Arial"
        st.font.size = Pt(size)
        st.font.bold = name != "Subtitle"
        st.font.color.rgb = RGBColor.from_string(BLACK)
        st.paragraph_format.space_before = Pt(before)
        st.paragraph_format.space_after = Pt(after)
        st.paragraph_format.keep_with_next = True
    styles["Title"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_ppr = styles["Title"]._element.get_or_add_pPr()
    title_border = title_ppr.find(qn("w:pBdr"))
    if title_border is not None:
        title_ppr.remove(title_border)
    styles["Subtitle"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    styles["Caption"].font.name = "Arial"
    styles["Caption"].font.size = Pt(9)
    styles["Caption"].font.italic = True
    styles["Caption"].font.color.rgb = RGBColor.from_string(GRAY)
    styles["Caption"].paragraph_format.space_before = Pt(3)
    styles["Caption"].paragraph_format.space_after = Pt(9)
    if "Code" not in styles:
        code = styles.add_style("Code", WD_STYLE_TYPE.PARAGRAPH)
        code.font.name = "Consolas"
        code.font.size = Pt(8.5)
        code.paragraph_format.left_indent = Inches(0.25)
        code.paragraph_format.space_after = Pt(4)


def add_header_footer(doc):
    for sec in doc.sections:
        sec.different_first_page_header_footer = True
        sec.first_page_header.paragraphs[0].text = ""
        sec.first_page_footer.paragraphs[0].text = ""
        sec.header_distance = Inches(0.28)
        sec.footer_distance = Inches(0.28)
        hp = sec.header.paragraphs[0]
        hp.text = "ODONTOCLINIC  |  DOCUMENTACIÓN TÉCNICA"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        for r in hp.runs:
            r.font.name = "Arial"
            r.font.size = Pt(8)
            r.font.bold = True
            r.font.color.rgb = RGBColor.from_string(GRAY)
        fp = sec.footer.paragraphs[0]
        add_page_number(fp)
        for r in fp.runs:
            r.font.name = "Arial"
            r.font.color.rgb = RGBColor.from_string(GRAY)


def set_page(section):
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.72)
    section.bottom_margin = Inches(0.68)
    section.left_margin = Inches(0.78)
    section.right_margin = Inches(0.78)


def p(doc, text="", bold_lead=None, style=None):
    par = doc.add_paragraph(style=style)
    if bold_lead and text.startswith(bold_lead):
        par.add_run(bold_lead).bold = True
        par.add_run(text[len(bold_lead):])
    else:
        par.add_run(text)
    return par


def bullets(doc, items):
    for item in items:
        par = doc.add_paragraph(style="List Bullet")
        par.add_run(item)


def numbered(doc, items):
    for item in items:
        par = doc.add_paragraph(style="List Number")
        par.add_run(item)


def heading(doc, text, level=1, page_break=False):
    if page_break:
        doc.add_page_break()
    return doc.add_heading(text, level=level)


def table(doc, headers, rows, widths=None, font_size=8.3, caption=None):
    if caption:
        cap = doc.add_paragraph(caption, style="Caption")
        cap.alignment = WD_ALIGN_PARAGRAPH.LEFT
        set_repeat_keep(cap)
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    hdr = tbl.rows[0]
    repeat_table_header(hdr)
    for i, h in enumerate(headers):
        c = hdr.cells[i]
        c.text = h
        set_cell_shading(c, NAVY)
        set_cell_border(c)
        set_cell_margins(c)
        c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        for par in c.paragraphs:
            par.alignment = WD_ALIGN_PARAGRAPH.CENTER
            par.paragraph_format.space_after = Pt(0)
            set_repeat_keep(par)
            for r in par.runs:
                r.font.name = "Arial"
                r.font.bold = True
                r.font.color.rgb = RGBColor.from_string(WHITE)
                r.font.size = Pt(font_size)
    for ridx, row in enumerate(rows):
        cells = tbl.add_row().cells
        cant_split(tbl.rows[-1])
        for i, val in enumerate(row):
            c = cells[i]
            c.text = str(val)
            if ridx % 2:
                set_cell_shading(c, ALT)
            set_cell_border(c)
            set_cell_margins(c)
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            for par in c.paragraphs:
                par.paragraph_format.space_after = Pt(0)
                par.paragraph_format.line_spacing = 1.05
                par.alignment = WD_ALIGN_PARAGRAPH.CENTER if len(str(val)) < 18 else WD_ALIGN_PARAGRAPH.LEFT
                for r in par.runs:
                    r.font.name = "Arial"
                    r.font.size = Pt(font_size)
                    r.font.color.rgb = RGBColor.from_string(BLACK)
        if widths:
            for i, width in enumerate(widths):
                cells[i].width = Inches(width)
    if widths:
        for i, width in enumerate(widths):
            hdr.cells[i].width = Inches(width)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return tbl


def add_figure(doc, path, caption, width=6.75):
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.paragraph_format.keep_with_next = True
    run = par.add_run()
    shape = run.add_picture(str(path), width=Inches(width))
    shape._inline.docPr.set("descr", caption)
    shape._inline.docPr.set("title", caption)
    cap = doc.add_paragraph(caption, style="Caption")
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.keep_with_next = False
    return cap


def add_code(doc, lines):
    par = doc.add_paragraph(style="Code")
    par.paragraph_format.left_indent = Inches(0.22)
    par.paragraph_format.right_indent = Inches(0.22)
    par.paragraph_format.space_before = Pt(5)
    par.paragraph_format.space_after = Pt(9)
    par.paragraph_format.line_spacing = 1.15
    p_pr = par._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "F2F4F6")
    p_pr.append(shd)
    for index, line in enumerate(lines):
        run = par.add_run(line)
        run.font.name = "Consolas"
        run.font.size = Pt(8.6)
        if index < len(lines) - 1:
            run.add_break()


def endpoint_rows(prefix, resource):
    plural = {
        "/usuarios": "usuarios",
        "/pacientes": "pacientes",
        "/citas": "citas",
        "/historia-clinica": "historias clínicas",
    }.get(prefix, resource)
    return [
        ("POST", prefix, f"Crea {resource}", "No declarada", "Body Create DTO", "Registro creado por Prisma"),
        ("GET", prefix, f"Lista {plural}", "No declarada", "Sin parámetros efectivos", "Arreglo de registros"),
        ("GET", f"{prefix}/:id", f"Obtiene {resource} por id", "No declarada", "id en ruta", "Registro o null"),
        ("PATCH", f"{prefix}/:id", f"Actualiza {resource}", "No declarada", "id y Update DTO", "Registro actualizado"),
        ("DELETE", f"{prefix}/:id", f"Elimina {resource}", "No declarada", "id en ruta", "Registro eliminado"),
    ]


def data_dictionary(doc, title, rows):
    heading(doc, title, 2)
    table(doc, ["Campo", "Tipo", "Obligatorio", "Clave o regla", "Descripción"], rows,
          widths=[1.2, 1.15, 0.75, 1.15, 2.65], font_size=7.9)


def build():
    doc = Document()
    set_page(doc.sections[0])
    configure_styles(doc)
    set_update_fields(doc)

    # Portada
    for _ in range(4):
        doc.add_paragraph()
    title = doc.add_paragraph(style="Title")
    title.add_run("ODONTOCLINIC")
    subtitle = doc.add_paragraph(style="Subtitle")
    subtitle.add_run("Documentación Técnica del Sistema")
    doc.add_paragraph()
    for line in ("Proyecto de Seminario", "Ingeniería en Sistemas", "Universidad Mariano Gálvez de Guatemala"):
        par = doc.add_paragraph(line)
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
        par.runs[0].font.name = "Arial"
        par.runs[0].font.size = Pt(12)
        par.runs[0].font.bold = line == "Proyecto de Seminario"
    doc.add_paragraph()
    for line in ("Estudiante: [Completar información]", "Carné: [Completar información]", "Docente: [Completar información]", "Sede: [Completar información]", "Fecha: [Completar información]"):
        par = doc.add_paragraph(line)
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
        par.runs[0].font.name = "Arial"
        par.runs[0].font.size = Pt(10.5)
    doc.add_page_break()

    heading(doc, "Control del documento", 1)
    table(doc, ["Campo", "Valor"], [
        ("Nombre del documento", "Documentación Técnica de OdontoClinic"),
        ("Sistema", "OdontoClinic"),
        ("Versión del documento", "1.0"),
        ("Fecha de elaboración", "5 de octubre de 2026"),
        ("Estado", "Documentación técnica del sistema"),
        ("Versiones declaradas del sistema", "Frontend 0.0.0; backend 0.0.1"),
    ], widths=[2.1, 4.6], font_size=9.2)
    p(doc, "Este documento presenta la estructura, el funcionamiento y la configuración técnica verificable de OdontoClinic. Las consideraciones y recomendaciones se distinguen de las capacidades implementadas para conservar la precisión técnica.")

    heading(doc, "Tabla de contenido", 1, page_break=True)
    toc = doc.add_paragraph()
    add_toc(toc)
    p(doc, "En Microsoft Word, seleccione la tabla y use Actualizar campo para recalcular títulos y páginas después de editar el documento.")

    heading(doc, "1 Introducción", 1, page_break=True)
    p(doc, "OdontoClinic es una aplicación web orientada a la gestión clínica odontológica. Permite administrar usuarios, pacientes y citas; consultar información histórica construida a partir de las citas; y generar reportes exportables. Su arquitectura combina un frontend Angular, una API desarrollada con NestJS y una capa de persistencia implementada con Prisma sobre PostgreSQL.")
    p(doc, "La presente documentación explica la organización y el funcionamiento del sistema a partir del código disponible. También registra consideraciones técnicas y oportunidades de mejora relacionadas con integración, autenticación, autorización, validación, pruebas y despliegue, sin atribuir al proyecto capacidades que no estén implementadas.")

    heading(doc, "2 Objetivo de la documentación", 1)
    p(doc, "El objetivo de esta documentación es facilitar la comprensión, instalación, mantenimiento y continuidad del desarrollo de OdontoClinic. Para ello describe la arquitectura, los módulos funcionales, el frontend, el backend, el modelo de datos, los contratos HTTP, la autenticación, los roles, la configuración, la ejecución local y las referencias de despliegue disponibles. Asimismo, proporciona una base técnica para soporte futuro y presenta oportunidades de fortalecimiento separadas de las funciones que el sistema ofrece actualmente.")

    heading(doc, "3 Alcance del sistema", 1)
    heading(doc, "3.1 Funcionalidades implementadas", 2)
    bullets(doc, [
        "Inicio de sesión con correo y contraseña, emisión de un JWT y almacenamiento de la respuesta en localStorage.",
        "Dashboard con métricas derivadas de pacientes y citas de una fecha seleccionada.",
        "Agenda con vistas diaria, semanal y mensual; alta, edición, cambio de estado y eliminación de citas.",
        "Alta, consulta, edición, filtrado, paginación y eliminación condicionada de pacientes.",
        "Consulta de perfil de paciente e historial construido con citas asociadas.",
        "Reportes de pacientes, citas e historial clínico agregados en el navegador y exportables a CSV, XLSX y PDF.",
        "Gestión de usuarios desde la interfaz, con roles ADMIN, DOCTOR y RECEPCIONISTA.",
        "API CRUD para usuarios, pacientes, citas e historias clínicas, además de registro, login, perfil y actualización autenticada.",
    ])
    heading(doc, "3.2 Consideraciones sobre la implementación actual", 2)
    bullets(doc, [
        "El frontend denomina historia clínica a una vista de citas y notas; no consume el CRUD backend de HistoriaClinica ni muestra diagnóstico, tratamiento u observaciones persistidos en esa entidad.",
        "El servicio de reportes contiene rutas HTTP hipotéticas dentro de una rama desactivada. El backend no implementa un controlador de reportes; la ruta activa agrega datos en el cliente.",
        "Los parámetros date, search y pacienteId se envían desde el frontend, pero los controladores backend no los reciben ni procesan. La aplicación vuelve a filtrar en el cliente.",
        "Existe un RolesGuard y un decorador Roles, pero ningún controlador los aplica.",
        "El campo refreshToken existe en el esquema, pero el frontend lo utiliza como identificador del doctor asignado a una recepcionista. No existe una operación de renovación de JWT.",
    ])
    heading(doc, "3.3 Componentes existentes sin integración funcional demostrada", 2)
    bullets(doc, [
        "Las clases de entidad TypeScript de Usuario, Paciente, Cita e HistoriaClinica están vacías.",
        "frontend/src/app/pacientes/temp.service.ts es una copia incompleta que no aparece importada por la aplicación compilada.",
        "backend/dev.db tiene tamaño cero; el esquema activo configura PostgreSQL y no referencia ese archivo.",
        "GET / y sus pruebas conservan la respuesta de plantilla Hello World!.",
    ])

    heading(doc, "4 Descripción general del sistema", 1)
    p(doc, "El flujo habitual comienza cuando el usuario inicia sesión y accede al dashboard. Desde la navegación principal puede consultar y administrar pacientes, programar o actualizar citas, revisar el historial disponible, generar reportes y, de acuerdo con las opciones visibles para su rol, gestionar usuarios y su perfil.")
    p(doc, "Este flujo se implementa mediante una aplicación Angular basada en componentes standalone. Las rutas funcionales utilizan authGuard, que comprueba la existencia de access_token en localStorage. Los servicios de dominio consumen la API con HttpClient mediante una URL configurada directamente en el frontend, y un interceptor agrega el encabezado Authorization Bearer cuando encuentra un token.")
    p(doc, "NestJS recibe las solicitudes en controladores por recurso y delega en servicios que ejecutan operaciones Prisma. Prisma obtiene la conexión PostgreSQL desde DATABASE_URL. La API no establece un prefijo global, por lo que los paths documentados parten de la raíz del servidor.")

    heading(doc, "5 Arquitectura del sistema", 1, page_break=True)
    p(doc, "OdontoClinic utiliza una arquitectura cliente servidor. Angular proporciona la capa de presentación y comunicación HTTP; NestJS organiza la API, la autenticación y los servicios de dominio; Prisma traduce las operaciones de los servicios a consultas sobre los modelos; y PostgreSQL conserva los datos y sus relaciones.")
    add_figure(doc, DIAG / "arquitectura.png", "Figura 1. Arquitectura lógica reconstruida desde el código fuente.")
    heading(doc, "5.1 Responsabilidades por capa", 2)
    table(doc, ["Capa", "Responsabilidad verificada", "Evidencia principal"], [
        ("Presentación", "Vistas, formularios, filtros, navegación y exportación de reportes.", "frontend/src/app"),
        ("Cliente HTTP", "Mapeo de modelos, transformación de fechas, filtros locales y consumo REST.", "Servicios Angular por módulo"),
        ("API", "Rutas HTTP, autenticación, servicios CRUD y respuestas de NestJS.", "backend/src"),
        ("Acceso a datos", "PrismaClient global, conexión y operaciones sobre modelos.", "backend/src/prisma"),
        ("Persistencia", "Tablas, enums, restricciones y relaciones PostgreSQL.", "backend/prisma/schema.prisma y migración"),
    ], widths=[1.2, 3.65, 1.95], font_size=8.4)
    heading(doc, "5.2 Consideraciones de la arquitectura actual", 2)
    p(doc, "La implementación distribuye algunas responsabilidades entre cliente y servidor. El frontend aplica filtros de alcance por usuario, resuelve nombres de pacientes con solicitudes adicionales y consolida los reportes en memoria. También mantiene la URL de la API directamente en los servicios. La vista de historia clínica utiliza las citas asociadas, mientras que el backend dispone de una entidad HistoriaClinica independiente. Estas características deben considerarse al extender la arquitectura o trasladar reglas al servidor.")

    heading(doc, "6 Stack tecnológico", 1)
    table(doc, ["Tecnología", "Versión comprobada", "Uso", "Evidencia"], [
        ("Angular", "19.2.25", "SPA y componentes standalone", "frontend/package-lock.json"),
        ("Angular CLI", "19.2.27", "Build, serve y pruebas", "frontend/package-lock.json"),
        ("TypeScript frontend", "5.7.3", "Código del cliente", "frontend/package-lock.json"),
        ("Bootstrap", "5.3.8", "Estilos y modales", "frontend/package-lock.json y index.html"),
        ("RxJS", "7.8.2", "Flujos HTTP y estado asíncrono", "package-lock de ambos componentes"),
        ("ExcelJS", "4.4.0", "Exportación XLSX", "frontend/package-lock.json"),
        ("jsPDF", "3.0.4", "Exportación PDF", "frontend/package-lock.json"),
        ("jsPDF AutoTable", "5.0.8", "Tablas en PDF", "frontend/package-lock.json"),
        ("NestJS", "11.1.6", "API HTTP modular", "backend/package-lock.json"),
        ("Prisma Client", "6.17.1", "ORM y acceso a datos", "backend/package-lock.json"),
        ("PostgreSQL", "No fijada", "Motor definido por el datasource", "backend/prisma/schema.prisma"),
        ("bcrypt", "6.0.0", "Hash y comparación de contraseñas", "backend/package-lock.json"),
        ("Passport JWT", "4.0.1", "Extracción y validación Bearer", "backend/package-lock.json"),
        ("Jest", "30.1.3", "Pruebas backend", "backend/package-lock.json"),
        ("Karma", "6.4.4", "Pruebas frontend", "frontend/package-lock.json"),
    ], widths=[1.25, 1.0, 2.7, 1.85], font_size=7.8)

    heading(doc, "7 Estructura del proyecto", 1)
    p(doc, "El repositorio mantiene frontend y backend como proyectos npm independientes. El package.json raíz solo declara @nestjs/config y no coordina scripts de ambos componentes.")
    add_code(doc, [
        "odonto_clinic/",
        "├─ frontend/",
        "│  ├─ src/app/                 componentes, rutas, guards y servicios",
        "│  ├─ src/assets/              recursos SVG",
        "│  ├─ angular.json             build, test y deploy gh-pages",
        "│  └─ package.json             scripts y dependencias del cliente",
        "├─ backend/",
        "│  ├─ src/auth/                login, JWT, DTOs y guards",
        "│  ├─ src/{usuarios,pacientes,citas,historia-clinica}/",
        "│  ├─ src/prisma/              módulo y servicio Prisma",
        "│  ├─ prisma/                  schema y migración inicial",
        "│  ├─ test/                    prueba e2e de la ruta raíz",
        "│  └─ package.json             scripts y dependencias de la API",
        "└─ package.json                dependencia raíz sin scripts",
    ])

    heading(doc, "8 Arquitectura del Frontend", 1, page_break=True)
    p(doc, "El frontend usa bootstrapApplication y componentes standalone. app.config.ts registra el router, HttpClient con AuthInterceptor y coalescencia de eventos. Las rutas login, dashboard, agenda, pacientes, historia clínica, reportes, configuración y perfil se declaran en app.routes.ts.")
    heading(doc, "8.1 Rutas", 2)
    table(doc, ["Ruta", "Componente", "Carga", "Protección"], [
        ("/login", "LoginComponent", "Lazy", "loginGuard evita mostrarla si existe token"),
        ("/dashboard", "DashboardComponent", "Directa", "authGuard"),
        ("/agenda", "AgendaComponent", "Directa", "authGuard"),
        ("/pacientes", "PacientesComponent", "Directa", "authGuard"),
        ("/pacientes/:id", "PacientePerfilComponent", "Lazy", "authGuard"),
        ("/historia-clinica", "HistoriaClinicaComponent", "Directa", "authGuard"),
        ("/reportes", "ReportesComponent", "Directa", "authGuard"),
        ("/configuracion", "ConfiguracionComponent", "Directa", "authGuard; no guard de rol"),
        ("/perfil", "PerfilComponent", "Lazy", "authGuard"),
        ("**", "Redirección", "-", "Envía a /dashboard"),
    ], widths=[1.35, 2.0, 0.8, 2.65], font_size=8.1)
    heading(doc, "8.2 Servicios y comunicación", 2)
    table(doc, ["Servicio", "Responsabilidad", "API activa"], [
        ("AuthService", "Login, logout, token y usuario actual", "https://odonto-clinic.onrender.com"),
        ("AgendaService", "CRUD de citas, fechas, filtros y nombres de pacientes", "Misma URL"),
        ("PacientesService", "CRUD, mapeo de fechas y alcance por usuario", "Misma URL"),
        ("HistoriaClinicaService", "Combina paciente con citas filtradas", "Misma URL"),
        ("UsuariosService", "Gestión de usuarios", "Misma URL"),
        ("ReportesService", "Agrega datos en el cliente", "No usa /reportes mientras useClientAggregation sea true"),
    ], widths=[1.6, 3.4, 2.0], font_size=8.2)
    heading(doc, "8.3 Estado y almacenamiento", 2)
    p(doc, "La aplicación usa signals y computed para estado de interfaz. La autenticación se guarda como JSON bajo la clave user de localStorage. El interceptor lee access_token de esa estructura. Los almacenes mock dentalpro_pacientes_v1 y dentalpro_usuarios_v1 permanecen en servicios, pero useMock está configurado en false.")
    heading(doc, "8.4 Manejo de errores frontend", 2)
    p(doc, "Los componentes gestionan errores mediante callbacks de subscribe y mensajes de interfaz. Algunos servicios utilizan catchError para retornar arreglos vacíos o valores undefined. HistoriaClinicaService aplica un timeout de 10 segundos y, ante un error, devuelve una estructura de paciente y citas vacías; este comportamiento permite mantener la vista operativa, aunque reduce la información disponible para diagnóstico.")

    heading(doc, "9 Arquitectura del Backend", 1)
    p(doc, "AppModule importa UsuariosModule, PacientesModule, CitasModule, HistoriaClinicaModule y AuthModule. PrismaModule es global y expone PrismaService. Cada módulo CRUD organiza el flujo desde Controller hacia Service y PrismaService. La implementación trabaja directamente con PrismaService, sin una capa repository adicional.")
    table(doc, ["Módulo", "Controlador", "Servicio", "Persistencia"], [
        ("Auth", "AuthController", "AuthService", "Usuario mediante Prisma"),
        ("Usuarios", "UsuariosController", "UsuariosService", "Usuario"),
        ("Pacientes", "PacientesController", "PacientesService", "Paciente"),
        ("Citas", "CitasController", "CitasService", "Cita"),
        ("Historia clínica", "HistoriaClinicaController", "HistoriaClinicaService", "HistoriaClinica"),
        ("Prisma", "-", "PrismaService", "Conexión y desconexión del cliente"),
    ], widths=[1.2, 1.65, 1.8, 2.25], font_size=8.4)
    heading(doc, "9.1 Configuración técnica actual del backend", 2)
    bullets(doc, [
        "NestFactory crea AppModule y escucha PORT o 3000.",
        "CORS permite http://localhost:4200, https://yorchriv.github.io y https://odonto-clinic.onrender.com, con credenciales y métodos CRUD.",
        "La configuración actual no registra ValidationPipe global, prefijo global, Swagger, Helmet, rate limiting ni un filtro global de excepciones.",
    ])

    heading(doc, "10 Módulos funcionales", 1)
    modules = [
        ("10.1 Autenticación", [
            ("Finalidad", "Validar credenciales, emitir JWT y proporcionar datos del usuario autenticado."),
            ("Componentes y servicios", "LoginComponent, AuthService de Angular, AuthController, AuthService de NestJS, JwtStrategy y JwtAuthGuard."),
            ("Endpoints", "POST /auth/register, POST /auth/login, GET /auth/profile y PUT /auth/update/:id."),
            ("Entidad asociada", "Usuario."),
            ("Flujo funcional", "El formulario envía credenciales; el backend valida estado y contraseña con bcrypt, firma el token y devuelve la identidad al frontend."),
        ]),
        ("10.2 Dashboard", [
            ("Finalidad", "Presentar métricas operativas y accesos rápidos después del inicio de sesión."),
            ("Componentes y servicios", "DashboardComponent, AgendaService y PacientesService."),
            ("Endpoints", "Consume las consultas de citas y pacientes; no dispone de un endpoint propio."),
            ("Entidades asociadas", "Paciente y Cita."),
            ("Flujo funcional", "El componente combina respuestas de los servicios y calcula conteos según la fecha seleccionada."),
        ]),
        ("10.3 Agenda y citas", [
            ("Finalidad", "Programar, consultar, actualizar, finalizar y cancelar citas."),
            ("Componentes y servicios", "AgendaComponent, AgendaService, CitasController y CitasService."),
            ("Endpoints", "CRUD de /citas."),
            ("Entidad asociada", "Cita, relacionada con Paciente y Usuario."),
            ("Flujo funcional", "La interfaz prepara fecha, hora, paciente y usuario; envía la solicitud y aplica filtros por usuario y periodo en el cliente."),
        ]),
        ("10.4 Pacientes", [
            ("Finalidad", "Administrar datos personales, estado y alergias de los pacientes."),
            ("Componentes y servicios", "PacientesComponent, PacientePerfilComponent, PacientesService, PacientesController y PacientesService de NestJS."),
            ("Endpoints", "CRUD de /pacientes."),
            ("Entidad asociada", "Paciente, con relaciones hacia Usuario, Cita e HistoriaClinica."),
            ("Flujo funcional", "La interfaz valida y transforma los datos, asigna creadoPorId y consume la API; el backend persiste mediante Prisma."),
        ]),
        ("10.5 Historia clínica", [
            ("Finalidad", "Consultar antecedentes asociados al paciente y disponer de un modelo persistente para información clínica."),
            ("Componentes y servicios", "HistoriaClinicaComponent, HistoriaClinicaService de Angular, HistoriaClinicaController y servicio backend."),
            ("Endpoints", "CRUD de /historia-clinica; la vista actual consulta pacientes y citas en lugar de consumir ese CRUD."),
            ("Entidad asociada", "HistoriaClinica, relacionada con Paciente y Cita."),
            ("Flujo funcional", "La interfaz selecciona un paciente y construye el historial con citas y notas; diagnóstico, tratamiento y observaciones de la entidad backend no se muestran actualmente."),
        ]),
        ("10.6 Reportes", [
            ("Finalidad", "Consolidar información de pacientes, citas e historial y exportarla."),
            ("Componentes y servicios", "ReportesComponent y ReportesService."),
            ("Endpoints", "No existe controlador backend de reportes; el flujo activo reutiliza servicios de pacientes, citas e historia."),
            ("Entidades asociadas", "Paciente y Cita; datos de historia construidos por el frontend."),
            ("Flujo funcional", "ReportesService agrega datos en el navegador y permite exportar CSV, XLSX y PDF."),
        ]),
        ("10.7 Usuarios y perfil", [
            ("Finalidad", "Gestionar cuentas, roles, datos de perfil y asignación operativa de recepcionistas."),
            ("Componentes y servicios", "ConfiguracionComponent, PerfilComponent, UsuariosService de Angular, UsuariosController y UsuariosService de NestJS."),
            ("Endpoints", "CRUD de /usuarios y PUT /auth/update/:id."),
            ("Entidad asociada", "Usuario."),
            ("Flujo funcional", "La configuración administra cuentas; el perfil actualiza datos y contraseña. El campo refreshToken se utiliza en la interfaz como identificador del doctor asignado."),
        ]),
    ]
    for title, details in modules:
        heading(doc, title, 2)
        table(doc, ["Elemento", "Descripción"], details, widths=[1.55, 5.25], font_size=8.4)

    heading(doc, "11 Autenticación y autorización", 1)
    add_figure(doc, DIAG / "autenticacion.png", "Figura 2. Secuencia exitosa de inicio de sesión.", width=4.0)
    heading(doc, "11.1 Mecanismo de autenticación", 2)
    numbered(doc, [
        "LoginComponent valida email y contraseña con Angular Validators.",
        "AuthService envía POST /auth/login.",
        "AuthService del backend busca Usuario por email, verifica activo y ejecuta bcrypt.compare.",
        "JwtService firma un payload con email, sub, rol, nombre y apellido; el login establece expiresIn en 24h.",
        "El frontend guarda la respuesta completa en localStorage y navega a /dashboard.",
        "AuthInterceptor adjunta el token como Bearer a solicitudes posteriores.",
    ])
    heading(doc, "11.2 Cobertura actual de autenticación en el backend", 2)
    p(doc, "JwtAuthGuard está aplicado únicamente a GET /auth/profile y PUT /auth/update/:id. La segunda ruta permite actualizar al propio usuario o a cualquier usuario cuando req.user.rol es ADMIN. Los controladores de usuarios, pacientes, citas e historia clínica no declaran UseGuards.")
    heading(doc, "11.3 Expiración, refresh y logout", 2)
    p(doc, "El token emitido por login expira en 24 horas. AuthModule también declara signOptions de 7 días, pero login reemplaza ese valor al firmar. No existe endpoint de refresh. El campo refreshToken se devuelve al cliente, pero no participa en renovación; el frontend lo interpreta como id de doctor. Logout solo elimina la clave user de localStorage.")

    heading(doc, "12 Roles y permisos", 1)
    p(doc, "Los roles persistidos son ADMIN, DOCTOR y RECEPCIONISTA. La matriz distingue comportamiento de interfaz y control del servidor. Una restricción aplicada solo en el frontend no constituye autorización backend.")
    table(doc, ["Funcionalidad", "ADMIN", "DOCTOR", "RECEPCIONISTA", "Control aplicado en backend"], [
        ("Ver navegación de usuarios", "Visible", "Oculta", "Oculta", "La ruta /configuracion requiere sesión en el frontend, sin validación específica de rol en el servidor"),
        ("Crear usuario desde UI", "Visible", "No visible", "No visible", "POST /auth/register no declara autenticación"),
        ("Editar usuario desde configuración", "Disponible", "Acceso técnicamente posible por navegación directa", "Acceso técnicamente posible por navegación directa", "PATCH /usuarios/:id no declara guard"),
        ("Eliminar usuario", "Visible", "Oculto", "Oculto", "DELETE /usuarios/:id no declara guard"),
        ("Consultar pacientes", "Filtra por creador propio", "Filtra por creador propio", "Doctor asignado o propia cuenta", "GET /pacientes devuelve todos"),
        ("Gestionar citas", "Agenda propia", "Agenda propia", "Agenda del doctor registrada en refreshToken", "El CRUD /citas no declara guard"),
        ("Eliminar cita", "Permitido en UI", "Permitido en UI", "Bloqueado en UI", "DELETE /citas/:id no declara guard"),
        ("Eliminar paciente", "Permitido si no tiene citas", "Permitido si no tiene citas", "Bloqueado UI", "DELETE /pacientes/:id no verifica rol ni citas"),
        ("Actualizar /auth/update/:id", "Cualquier id", "Solo propio id", "Solo propio id", "JwtAuthGuard y comprobación explícita"),
    ], widths=[1.45, 1.0, 1.1, 1.25, 2.0], font_size=7.4)

    heading(doc, "13 API REST", 1)
    p(doc, "La API expone 25 rutas. Salvo las dos rutas marcadas con JWT, los controladores no declaran autenticación. Los DTOs CRUD sin decoradores funcionan como formas TypeScript, no como validación runtime demostrada.")
    heading(doc, "13.1 Raíz y autenticación", 2)
    table(doc, ["Método", "Endpoint", "Descripción", "Autenticación", "Entrada", "Respuesta observada"], [
        ("GET", "/", "Respuesta de plantilla", "No", "Ninguna", "Hello World!"),
        ("POST", "/auth/register", "Registra usuario y hashea contraseña", "No", "RegisterDto", "Usuario sin password"),
        ("POST", "/auth/login", "Valida credenciales y emite token", "No", "LoginDto", "access_token, user y message"),
        ("GET", "/auth/profile", "Obtiene identidad seleccionada", "JWT", "Bearer token", "id, email, nombre, apellido y rol"),
        ("PUT", "/auth/update/:id", "Actualiza usuario", "JWT", "id y UpdateUserDto", "Usuario sin password"),
    ], widths=[0.55, 1.35, 1.65, 0.9, 1.1, 1.35], font_size=7.4)
    for sec, prefix, resource in [
        ("13.2 Usuarios", "/usuarios", "usuario"),
        ("13.3 Pacientes", "/pacientes", "paciente"),
        ("13.4 Citas", "/citas", "cita"),
        ("13.5 Historia clínica", "/historia-clinica", "historia clínica"),
    ]:
        heading(doc, sec, 2)
        table(doc, ["Método", "Endpoint", "Descripción", "Autenticación", "Entrada", "Respuesta"], endpoint_rows(prefix, resource),
              widths=[0.55, 1.45, 1.45, 0.95, 1.25, 1.25], font_size=7.4)
    heading(doc, "13.6 Cuerpos principales", 2)
    table(doc, ["DTO", "Campos"], [
        ("RegisterDto", "email, password, nombre, apellido, rol, refreshToken opcional"),
        ("LoginDto", "email, password"),
        ("CreateUsuarioDto", "nombre, apellido, email, password, rol, refreshToken, lastLogin, activo"),
        ("CreatePacienteDto", "nombres, apellidos, dpi, telefono, email, direccion, fechaNacimiento, estado, alergias, creadoPorId"),
        ("CreateCitaDto", "pacienteId, usuarioId, fecha, hora, motivo, estado, notas"),
        ("CreateHistoriaClinicaDto", "citaId, pacienteId, descripcion, diagnostico, tratamiento, observaciones"),
    ], widths=[1.7, 5.0], font_size=8.2)

    heading(doc, "14 Base de datos", 1)
    p(doc, "Prisma configura un datasource PostgreSQL mediante DATABASE_URL. La migración inicial crea tres enums y cuatro tablas. Las claves foráneas usan ON DELETE RESTRICT y ON UPDATE CASCADE. No se declaran índices adicionales fuera de las restricciones únicas de email, dpi y citaId.")
    table(doc, ["Modelo", "Propósito verificable", "Relaciones"], [
        ("Usuario", "Cuenta, rol, credenciales y estado", "Crea pacientes y atiende citas"),
        ("Paciente", "Datos personales y clínicos básicos", "Creador, citas e historias"),
        ("Cita", "Fecha, hora, motivo, estado y notas", "Paciente, usuario e historia opcional"),
        ("HistoriaClinica", "Descripción, diagnóstico, tratamiento y observaciones", "Una cita única y un paciente"),
    ], widths=[1.45, 3.0, 2.25], font_size=8.4)
    heading(doc, "14.1 Enums", 2)
    table(doc, ["Enum", "Valores"], [
        ("Rol", "ADMIN, DOCTOR, RECEPCIONISTA"),
        ("EstadoPaciente", "ACTIVO, INACTIVO"),
        ("EstadoCita", "CONFIRMADA, PENDIENTE, NUEVA, FINALIZADA, CANCELADA, DISPONIBLE"),
    ], widths=[1.5, 5.2], font_size=8.5)

    heading(doc, "15 Diccionario de datos", 1)
    data_dictionary(doc, "15.1 Usuario", [
        ("id", "Int", "Sí", "PK, autoincrement", "Identificador del usuario."),
        ("nombre", "String", "Sí", "-", "Nombre."), ("apellido", "String", "Sí", "-", "Apellido."),
        ("email", "String", "Sí", "Único", "Correo usado por login."),
        ("password", "String", "Sí", "-", "Hash en el flujo de registro; no hay restricción DB de formato."),
        ("rol", "Rol", "Sí", "Default RECEPCIONISTA", "Rol persistido."),
        ("refreshToken", "String", "No", "-", "Valor opcional asociado al usuario."),
        ("lastLogin", "DateTime", "No", "-", "Fecha prevista para registrar el último acceso."),
        ("activo", "Boolean", "Sí", "Default true", "Habilita o bloquea login y validación JWT."),
        ("creadoEn", "DateTime", "Sí", "Default now", "Fecha de creación."),
        ("actualizadoEn", "DateTime", "Sí", "updatedAt", "Fecha actualizada por Prisma."),
    ])
    p(doc, "Observaciones de implementación. El frontend utiliza actualmente refreshToken como identificador del doctor asignado a una recepcionista; no existe un flujo de renovación JWT. El campo lastLogin está definido en el modelo, pero el código actual no lo actualiza.")
    data_dictionary(doc, "15.2 Paciente", [
        ("id", "Int", "Sí", "PK, autoincrement", "Identificador."),
        ("nombres", "String", "Sí", "-", "Nombres del paciente."), ("apellidos", "String", "Sí", "-", "Apellidos."),
        ("dpi", "String", "No", "Único", "Identificador documental opcional."),
        ("telefono", "String", "Sí", "-", "Teléfono."), ("email", "String", "No", "-", "Correo opcional."),
        ("direccion", "String", "No", "-", "Dirección opcional."),
        ("fechaNacimiento", "DateTime", "No", "-", "Fecha de nacimiento."),
        ("estado", "EstadoPaciente", "Sí", "Default ACTIVO", "Estado del paciente."),
        ("alergias", "String", "No", "-", "Texto libre sobre alergias."),
        ("creadoPorId", "Int", "Sí", "FK Usuario", "Usuario creador."),
        ("creadoEn", "DateTime", "Sí", "Default now", "Fecha de creación."),
        ("actualizadoEn", "DateTime", "Sí", "updatedAt", "Última actualización."),
    ])
    data_dictionary(doc, "15.3 Cita", [
        ("id", "Int", "Sí", "PK, autoincrement", "Identificador."),
        ("pacienteId", "Int", "Sí", "FK Paciente", "Paciente asociado."),
        ("usuarioId", "Int", "Sí", "FK Usuario", "Usuario asociado a la agenda."),
        ("fecha", "DateTime", "Sí", "-", "Fecha y hora construidas por el frontend."),
        ("hora", "String", "Sí", "-", "Hora separada en HH:MM desde el frontend."),
        ("motivo", "String", "Sí", "-", "Motivo de consulta."),
        ("estado", "EstadoCita", "Sí", "Default NUEVA", "Estado operativo."),
        ("notas", "String", "No", "-", "Notas libres."),
        ("creadoEn", "DateTime", "Sí", "Default now", "Fecha de creación."),
        ("actualizadoEn", "DateTime", "Sí", "updatedAt", "Última actualización."),
    ])
    data_dictionary(doc, "15.4 HistoriaClinica", [
        ("id", "Int", "Sí", "PK, autoincrement", "Identificador."),
        ("citaId", "Int", "Sí", "FK Cita, único", "Vincula como máximo una historia a cada cita."),
        ("pacienteId", "Int", "Sí", "FK Paciente", "Paciente asociado."),
        ("descripcion", "String", "No", "-", "Descripción clínica libre."),
        ("diagnostico", "String", "No", "-", "Diagnóstico libre."),
        ("tratamiento", "String", "No", "-", "Tratamiento libre."),
        ("observaciones", "String", "No", "-", "Observaciones libres."),
        ("creadoEn", "DateTime", "Sí", "Default now", "Fecha de creación."),
        ("actualizadoEn", "DateTime", "Sí", "updatedAt", "Última actualización."),
    ])

    heading(doc, "16 Modelo entidad relación", 1)
    add_figure(doc, DIAG / "modelo_er.png", "Figura 3. Modelo entidad relación derivado de schema.prisma y la migración inicial.", width=5.8)
    p(doc, "La unicidad de HistoriaClinica.citaId establece una relación Cita 1 a HistoriaClinica 0..1. Paciente y Usuario mantienen relaciones uno a muchos con citas; Usuario también mantiene una relación uno a muchos con pacientes creados.")

    heading(doc, "17 Flujos principales del sistema", 1)
    flows = [
        ("17.1 Inicio de sesión", [
            ("1", "Actor", "El usuario introduce correo y contraseña."),
            ("2", "Interfaz", "LoginComponent valida los campos con Angular Validators."),
            ("3", "Servicio frontend", "AuthService prepara la solicitud de autenticación."),
            ("4", "Solicitud HTTP", "POST /auth/login envía LoginDto."),
            ("5", "Controller y service", "AuthController delega en AuthService, que busca el usuario, verifica activo y compara la contraseña con bcrypt."),
            ("6", "Prisma y base de datos", "Prisma consulta el modelo Usuario en PostgreSQL."),
            ("7", "Respuesta", "JwtService firma el token; el frontend guarda la respuesta en localStorage y navega al dashboard."),
        ]),
        ("17.2 Alta de paciente", [
            ("1", "Actor", "Un usuario con sesión abierta completa el formulario del paciente."),
            ("2", "Interfaz", "PacientesComponent valida los campos disponibles."),
            ("3", "Servicio frontend", "PacientesService transforma la fecha y añade creadoPorId desde el usuario local."),
            ("4", "Solicitud HTTP", "POST /pacientes envía CreatePacienteDto."),
            ("5", "Controller y service", "PacientesController delega la creación a PacientesService."),
            ("6", "Prisma y base de datos", "prisma.paciente.create inserta el registro en PostgreSQL."),
            ("7", "Respuesta", "La API devuelve el paciente creado y la interfaz actualiza su listado."),
        ]),
        ("17.3 Programación de cita", [
            ("1", "Actor", "El usuario selecciona un paciente y completa fecha, hora y motivo."),
            ("2", "Interfaz", "AgendaComponent comprueba que exista un paciente seleccionado."),
            ("3", "Servicio frontend", "AgendaService determina usuarioId desde el usuario actual o desde refreshToken para recepcionistas y transforma la fecha."),
            ("4", "Solicitud HTTP", "POST /citas envía CreateCitaDto."),
            ("5", "Controller y service", "CitasController delega en CitasService."),
            ("6", "Prisma y base de datos", "Prisma persiste la cita y sus claves foráneas."),
            ("7", "Respuesta", "La API devuelve el registro y el frontend consulta los datos del paciente para completar su nombre."),
        ]),
        ("17.4 Consulta de historia", [
            ("1", "Actor", "El usuario selecciona un paciente en HistoriaClinicaComponent."),
            ("2", "Servicio frontend", "HistoriaClinicaService solicita /pacientes/:id y /citas."),
            ("3", "API", "PacientesController y CitasController devuelven los datos consultados mediante sus servicios."),
            ("4", "Prisma y base de datos", "Prisma obtiene Paciente y Cita desde PostgreSQL."),
            ("5", "Procesamiento cliente", "El servicio filtra las citas por paciente y doctor, normaliza fecha y hora y agrupa los resultados."),
            ("6", "Respuesta visual", "La vista presenta un historial basado en citas y notas. Este flujo no consulta /historia-clinica."),
        ]),
        ("17.5 Generación de reporte", [
            ("1", "Actor", "El usuario selecciona tipo de reporte y filtros."),
            ("2", "Interfaz", "ReportesComponent prepara los parámetros."),
            ("3", "Servicio frontend", "ReportesService opera con useClientAggregation en true."),
            ("4", "Solicitudes HTTP", "El servicio reutiliza PacientesService, AgendaService o HistoriaClinicaService."),
            ("5", "Procesamiento cliente", "Las filas se consolidan y filtran en memoria."),
            ("6", "Resultado", "El reporte se presenta en pantalla y puede exportarse como CSV, XLSX o PDF."),
        ]),
    ]
    for title, steps in flows:
        heading(doc, title, 2)
        table(doc, ["Paso", "Capa o participante", "Acción"], steps, widths=[0.55, 1.65, 4.6], font_size=8.2)

    heading(doc, "18 Seguridad", 1)
    heading(doc, "18.1 Controles implementados", 2)
    table(doc, ["Control", "Implementación comprobada", "Alcance"], [
        ("Hash de contraseña", "bcrypt con costo 10 en registro y actualizaciones que pasan por AuthService o UsuariosService.update", "No se aplica en UsuariosService.create"),
        ("JWT", "Bearer token, expiración comprobada y usuario activo en JwtStrategy", "Solo rutas que usan JwtAuthGuard"),
        ("Guard frontend", "Comprueba existencia de access_token", "No valida firma ni expiración"),
        ("CORS", "Lista explícita de tres orígenes y métodos", "Configuración global Nest"),
        ("Validadores declarativos", "class-validator en LoginDto, RegisterDto y UpdateUserDto", "Sin ValidationPipe global demostrado"),
        ("Restricciones DB", "Claves, foráneas, enums y únicos", "PostgreSQL mediante migración"),
        ("CSV", "Prefija celdas que empiezan con = + - @", "Exportación CSV de reportes"),
    ], widths=[1.4, 3.7, 1.7], font_size=8.1)
    heading(doc, "18.2 Consideraciones de seguridad", 2)
    table(doc, ["Aspecto", "Implementación actual", "Consideración técnica", "Mejora recomendada"], [
        ("Autorización de endpoints", "Los CRUD de usuarios, pacientes, citas e historia clínica no aplican UseGuards.", "La autorización depende principalmente de controles del frontend.", "Aplicar JwtAuthGuard y reglas de rol en el servidor."),
        ("Respuesta de usuarios", "GET /usuarios usa findMany sin una selección que excluya campos sensibles.", "La respuesta puede incluir password y refreshToken.", "Definir DTOs de salida o select explícito."),
        ("Creación de usuarios", "UsuariosService.create persiste el DTO directamente y lo registra en consola.", "Ese flujo no aplica hash a password y puede registrar datos sensibles.", "Unificar la creación con el flujo seguro de registro y retirar logs sensibles."),
        ("Configuración JWT", "JwtStrategy contempla un valor alternativo y AuthModule usa una configuración distinta.", "La firma puede depender de valores no alineados cuando falta JWT_SECRET.", "Exigir JWT_SECRET y centralizar la configuración."),
        ("Alcance de datos", "Los servicios Angular filtran creadoPorId y usuarioId.", "Un cliente distinto podría omitir esos filtros.", "Aplicar filtros autorizados en consultas Prisma."),
        ("Almacenamiento del token", "La respuesta de autenticación se guarda en localStorage.", "El token queda accesible al contexto JavaScript de la aplicación.", "Evaluar cookies HttpOnly o reforzar controles frente a XSS."),
        ("Validación de DTO", "Existen decoradores en DTOs de autenticación, sin ValidationPipe global.", "Los decoradores no se aplican automáticamente a todas las solicitudes.", "Registrar ValidationPipe y ampliar validación a DTOs CRUD."),
        ("Uso de refreshToken", "El frontend lo interpreta como identificador de doctor.", "El nombre no corresponde a su uso operativo y dificulta incorporar renovación JWT.", "Crear una relación explícita doctor recepcionista."),
        ("Consistencia de roles", "UpdateUserDto declara ASISTENTE en lugar de RECEPCIONISTA.", "La diferencia afectaría la validación si el pipe se activa.", "Alinear el enum con Prisma y el frontend."),
        ("Diagnóstico de errores", "HistoriaClinicaService retorna estructuras vacías mediante catchError.", "La vista conserva continuidad, pero pierde detalle sobre la causa.", "Registrar el error de forma segura y mostrar un estado diferenciable."),
    ], widths=[1.25, 2.15, 1.85, 1.75], font_size=7.3)

    heading(doc, "19 Configuración del sistema", 1)
    table(doc, ["Archivo", "Configuración relevante"], [
        ("frontend/angular.json", "Build production/development, assets, Bootstrap CSS, Karma y builder angular-cli-ghpages."),
        ("frontend/tsconfig.json", "TypeScript estricto, target ES2022 y strictTemplates."),
        ("backend/nest-cli.json", "sourceRoot src y borrado de dist antes de compilar."),
        ("backend/tsconfig.json", "NodeNext, target ES2023, decoradores y salida dist."),
        ("backend/src/main.ts", "CORS y PORT con default 3000."),
        ("backend/prisma/schema.prisma", "PostgreSQL, DATABASE_URL, modelos y enums."),
    ], widths=[2.2, 4.5], font_size=8.4)
    p(doc, "El repositorio actual no incluye archivos .env ni .env.example. Los valores sensibles deben proporcionarse fuera del control de versiones.")

    heading(doc, "20 Variables de entorno", 1)
    table(doc, ["Variable", "Componente", "Propósito", "Obligatoria según código"], [
        ("DATABASE_URL", "Backend Prisma", "Cadena de conexión PostgreSQL", "Sí para conectar y migrar"),
        ("JWT_SECRET", "Backend Auth", "Firma y validación de JWT", "La implementación contempla un valor alternativo; en producción debe exigirse explícitamente"),
        ("PORT", "Backend", "Puerto de escucha", "No; default 3000"),
    ], widths=[1.3, 1.4, 2.5, 1.6], font_size=8.3)

    heading(doc, "21 Instalación y ejecución local", 1)
    heading(doc, "21.1 Prerrequisitos verificables", 2)
    bullets(doc, [
        "Node.js y npm; el repositorio no fija versión mediante engines, .nvmrc o archivo equivalente.",
        "Una instancia PostgreSQL accesible mediante DATABASE_URL.",
        "Un navegador compatible para el frontend; las pruebas Karma están configuradas para Chrome.",
    ])
    heading(doc, "21.2 Backend", 2)
    add_code(doc, [
        "cd backend",
        "npm install",
        "npx prisma generate",
        "npx prisma migrate dev --name init",
        "npm run start:dev",
    ])
    p(doc, "Los comandos Prisma aparecen comentados en schema.prisma. Antes de iniciar se deben proporcionar DATABASE_URL y JWT_SECRET sin registrar sus valores en Git.")
    heading(doc, "21.3 Frontend", 2)
    add_code(doc, [
        "cd frontend",
        "npm install",
        "npm start",
    ])
    p(doc, "El servidor de desarrollo Angular usa normalmente http://localhost:4200, origen permitido por CORS. Sin embargo, los servicios activos apuntan a https://odonto-clinic.onrender.com; las URLs locales aparecen comentadas. El repositorio no implementa una configuración environment para alternar endpoints sin editar código.")
    heading(doc, "21.4 Build", 2)
    add_code(doc, ["cd backend && npm run build", "cd frontend && npm run build"])

    heading(doc, "22 Scripts disponibles", 1)
    heading(doc, "22.1 Frontend", 2)
    table(doc, ["Script", "Comando", "Uso"], [
        ("start", "ng serve", "Servidor de desarrollo"), ("build", "ng build", "Build de producción por defecto"),
        ("watch", "ng build --watch --configuration development", "Compilación observada"), ("test", "ng test", "Karma/Jasmine"),
    ], widths=[1.2, 3.5, 2.0], font_size=8.4)
    heading(doc, "22.2 Backend", 2)
    table(doc, ["Script", "Comando", "Uso"], [
        ("build", "nest build", "Compilar API"), ("start", "nest start", "Inicio normal"),
        ("start:dev", "nest start --watch", "Desarrollo"), ("start:debug", "nest start --debug --watch", "Depuración"),
        ("start:prod", "node dist/main", "Ejecutar build"), ("lint", "eslint ... --fix", "Lint con cambios automáticos"),
        ("test", "jest", "Unitarias"), ("test:e2e", "jest --config ./test/jest-e2e.json", "E2E"),
        ("test:cov", "jest --coverage", "Cobertura"), ("format", "prettier --write ...", "Formateo"),
    ], widths=[1.1, 3.65, 1.95], font_size=8.1)

    heading(doc, "23 Despliegue", 1)
    p(doc, "angular.json configura angular-cli-ghpages como builder de despliegue. El frontend consume una URL onrender.com para la API y main.ts autoriza un origen github.io. Estas referencias permiten identificar parcialmente la infraestructura utilizada. El repositorio no incluye workflows, Dockerfiles, render.yaml, configuración de dominio, comandos de release ni documentación suficiente para reconstruir un despliegue completo y repetible.")
    p(doc, "El README del backend conserva recomendaciones genéricas del template NestJS, incluida una opción Mau. Esa referencia pertenece a la plantilla y no permite afirmar que OdontoClinic se despliegue mediante ese servicio.")

    heading(doc, "24 Manejo de errores", 1)
    p(doc, "NestJS utiliza excepciones estándar en autenticación, como UnauthorizedException y ConflictException. En los CRUD, Prisma y el manejador predeterminado de Nest transforman los errores. La configuración actual no incorpora filtros personalizados ni un contrato uniforme de respuesta de error.")
    p(doc, "El frontend muestra mensajes específicos en login y formularios, pero varias comparaciones buscan err.message locales que no necesariamente coinciden con respuestas HTTP. catchError se usa para degradar algunas consultas a arreglos vacíos, y los componentes registran ciertos errores con console.error.")

    heading(doc, "25 Validaciones", 1)
    table(doc, ["Capa", "Validación observada", "Limitación"], [
        ("Formularios Angular", "required, email, minlength y selección de paciente", "Solo cliente"),
        ("DTO auth", "IsEmail, IsString, IsNotEmpty, MinLength, IsEnum e IsOptional", "Sin ValidationPipe global"),
        ("DTO CRUD", "Tipos TypeScript y enums locales", "Sin decoradores class-validator"),
        ("Servicios", "Duplicado de email, usuario activo, password y propiedad de update auth", "No cubre CRUD público"),
        ("Prisma/PostgreSQL", "Tipos, no nulos, únicos, claves foráneas y enums", "No expresa todas las reglas de interfaz"),
    ], widths=[1.4, 3.3, 2.1], font_size=8.2)

    heading(doc, "26 Pruebas", 1)
    p(doc, "El repositorio contiene 23 archivos .spec.ts y una prueba e2e. La mayoría de las pruebas verifican que un componente, controlador o servicio pueda crearse. La prueba unitaria de AppController y la prueba e2e comprueban la respuesta Hello World!.")
    table(doc, ["Validación ejecutada", "Resultado el 5 de octubre de 2026", "Detalle"], [
        ("Frontend npm run build", "Aprobada", "Generó dist/odonto_clinik; mostró advertencias CommonJS y selectores CSS de Bootstrap."),
        ("Frontend npm test -- --watch=false", "No ejecutada", "Karma inició, pero no encontró Chrome en la ruta configurada."),
        ("Backend npm run build", "No ejecutada", "El comando nest no estaba disponible porque las dependencias backend no estaban instaladas."),
        ("Backend npm test -- --runInBand", "No ejecutada", "El comando jest no estaba disponible por la misma condición."),
    ], widths=[2.0, 1.35, 3.45], font_size=8.1)
    p(doc, "Los resultados corresponden al entorno utilizado durante la elaboración de esta documentación y no implican necesariamente un fallo del sistema. El build frontend confirma que el grafo importado de la aplicación compila en ese entorno; las pruebas no ejecutadas requieren completar las dependencias o herramientas indicadas.")

    heading(doc, "27 Dependencias principales", 1)
    table(doc, ["Componente", "Dependencias relevantes", "Finalidad"], [
        ("Frontend", "@angular/*, rxjs, zone.js", "Framework, enrutamiento, formularios y reactividad"),
        ("Frontend UI", "bootstrap", "Estilos y comportamiento de modales"),
        ("Frontend reportes", "exceljs, file-saver, jspdf, jspdf-autotable", "Exportaciones"),
        ("Backend", "@nestjs/common, core, platform-express, config", "API y configuración"),
        ("Backend auth", "@nestjs/jwt, passport, passport-jwt, bcrypt", "JWT y contraseñas"),
        ("Backend datos", "@prisma/client, prisma", "ORM, cliente y migraciones"),
        ("Validación", "class-validator, class-transformer", "Decoradores DTO; falta activar pipe global"),
    ], widths=[1.35, 3.1, 2.35], font_size=8.3)

    heading(doc, "28 Consideraciones de mantenimiento", 1)
    bullets(doc, [
        "Mantener sincronizados schema.prisma, migraciones, DTOs y modelos frontend; hoy existen enums inconsistentes.",
        "Centralizar la URL de API para evitar editar varios servicios al cambiar de ambiente.",
        "Planificar la sustitución del uso semántico de refreshToken, que actualmente almacena una relación de asignación clínica.",
        "Recordar que los reportes dependen de múltiples consultas del cliente y del filtrado local.",
        "Considerar que HistoriaClinica de base de datos y la vista basada en citas son implementaciones diferentes en el estado actual.",
        "Los README son plantillas de Angular y NestJS y no describen por completo la configuración real.",
        "Antes de actualizar dependencias de reportes, repetir el build porque Angular reporta optimizaciones CommonJS.",
    ])

    heading(doc, "29 Aspectos técnicos pendientes de fortalecimiento", 1)
    table(doc, ["Aspecto", "Estado actual"], [
        ("Autorización no centralizada", "Los filtros de alcance y bloqueos por rol están en Angular; los CRUD backend no declaran guards."),
        ("Consultas no filtradas en servidor", "Los controladores listan todos los registros y no consumen query params."),
        ("Historia clínica incompleta de extremo a extremo", "La entidad existe, pero el frontend usa citas."),
        ("Configuración por ambiente ausente", "Las URLs están codificadas y no hay environments ni .env.example."),
        ("Cobertura de pruebas", "La mayoría comprueba creación; no cubre reglas, autenticación ni CRUD."),
        ("Despliegue reproducible", "No hay CI/CD ni un manifiesto de despliegue para el backend."),
        ("Contrato de errores no uniforme", "Mezcla excepciones Nest, Prisma y valores vacíos en frontend."),
    ], widths=[2.2, 4.6], font_size=8.4)

    heading(doc, "30 Recomendaciones técnicas", 1)
    table(doc, ["Prioridad", "Recomendación", "Resultado esperado"], [
        ("Alta", "Aplicar JwtAuthGuard global o por controlador y RolesGuard con una matriz de permisos definida en backend.", "Autorización independiente del cliente"),
        ("Alta", "Eliminar POST /usuarios o hacerlo equivalente al registro seguro; excluir password y refreshToken de respuestas y logs.", "Reducir exposición de credenciales"),
        ("Alta", "Exigir JWT_SECRET sin valor alternativo y rotar cualquier valor usado fuera del gestor de secretos.", "Firma coherente y no predecible"),
        ("Alta", "Activar ValidationPipe con whitelist, transform y forbidNonWhitelisted; añadir decoradores a DTOs CRUD.", "Validación runtime consistente"),
        ("Media", "Crear una relación explícita doctor recepcionista en Prisma y reservar refreshToken para autenticación o eliminarlo.", "Modelo semántico claro"),
        ("Media", "Mover filtros de usuario, fecha, búsqueda y paciente a consultas Prisma autorizadas.", "Menor exposición y mejor rendimiento"),
        ("Media", "Integrar el módulo HistoriaClinica en el frontend o retirar el CRUD hasta definir el flujo clínico.", "Consistencia funcional"),
        ("Media", "Centralizar API base URL en environments y agregar .env.example sin secretos.", "Ejecución local y despliegue repetibles"),
        ("Evolutiva", "Agregar pruebas de AuthService, guards, permisos, DTOs, CRUD, filtros y escenarios e2e con base aislada.", "Cobertura de reglas relevantes"),
        ("Evolutiva", "Añadir CI que instale con npm ci, genere Prisma, compile y ejecute pruebas.", "Validación automática del repositorio"),
        ("Evolutiva", "Agregar logging estructurado sin datos sensibles y un filtro uniforme de excepciones.", "Diagnóstico operativo seguro"),
        ("Evolutiva", "Evaluar cookies HttpOnly o controles XSS reforzados para el token según el modelo de despliegue.", "Menor exposición del token"),
    ], widths=[0.85, 4.05, 1.9], font_size=7.8)

    heading(doc, "31 Información pendiente de documentación", 1)
    bullets(doc, [
        "Credenciales y procedimientos de provisión de los ambientes, que no deben almacenarse en el repositorio.",
        "Versión operativa de Node.js y PostgreSQL aprobada para producción.",
        "Procedimiento exacto de despliegue de frontend y backend, dominios, responsables y rollback.",
        "Política institucional de roles y permisos que deba aplicar el backend.",
        "Definición funcional de historia clínica, diagnóstico y tratamiento en la interfaz.",
        "Política de respaldo, retención, cifrado y recuperación de la base de datos.",
        "Requisitos legales y de privacidad aplicables a datos personales y clínicos.",
        "Datos académicos de portada: estudiante, docente, sede y otros campos institucionales.",
    ])

    heading(doc, "32 Conclusiones técnicas", 1)
    p(doc, "OdontoClinic proporciona una base funcional para la gestión odontológica mediante una aplicación Angular conectada a una API NestJS. El sistema administra usuarios, roles, pacientes y citas, ofrece autenticación con JWT, genera reportes en distintos formatos y persiste cuatro modelos relacionados con Prisma y PostgreSQL. Su organización modular permite reconocer con claridad las responsabilidades del frontend, la API y la capa de datos.")
    p(doc, "El estado actual también presenta consideraciones que deben tenerse en cuenta durante el mantenimiento. La cobertura de autenticación del backend se concentra en dos rutas, mientras que los CRUD restantes no declaran guards; la vista de historia clínica se construye con citas en lugar de consumir la entidad HistoriaClinica; y refreshToken cumple una función operativa diferente de la que su nombre sugiere. La validación global, la cobertura de pruebas y la configuración reproducible de ambientes también pueden ampliarse.")
    p(doc, "OdontoClinic dispone de una base funcional y modular que puede continuar fortaleciéndose mediante autorización y validación en el servidor, pruebas automatizadas, configuración por ambiente y procedimientos de despliegue reproducibles. Estas mejoras permitirían conservar las funciones ya implementadas y facilitar una evolución técnica más segura y mantenible.")

    heading(doc, "Anexo A Trazabilidad de evidencia", 1)
    table(doc, ["Afirmación", "Archivos que la demuestran"], [
        ("Angular standalone con router e interceptor", "frontend/src/main.ts; app/app.config.ts; app/app.routes.ts"),
        ("API NestJS modular", "backend/src/app.module.ts y módulos de dominio"),
        ("PostgreSQL con Prisma", "backend/prisma/schema.prisma; migration.sql"),
        ("JWT Bearer", "backend/src/auth/auth.module.ts; strategies/jwt.strategy.ts; guards/jwt-auth.guard.ts"),
        ("Rutas que aplican JwtAuthGuard", "backend/src/auth/auth.controller.ts; búsqueda de UseGuards en backend/src"),
        ("Roles persistidos", "schema.prisma enum Rol; frontend configuracion.service.ts"),
        ("Reportes agregados en cliente", "frontend/src/app/reportes/reportes.service.ts"),
        ("Historia frontend basada en citas", "frontend/src/app/historia-clinica/historia-clinica.service.ts"),
        ("URL API codificada", "auth.service.ts y servicios de dominio frontend"),
        ("Variables de entorno", "schema.prisma; auth.module.ts; jwt.strategy.ts; main.ts"),
        ("Pruebas existentes", "archivos *.spec.ts; backend/test/app.e2e-spec.ts; package.json"),
        ("Deploy gh-pages configurado", "frontend/angular.json"),
    ], widths=[2.7, 4.1], font_size=8.2)

    heading(doc, "Anexo B Resumen cuantitativo del proyecto", 1)
    summary_table = table(doc, ["Elemento", "Cantidad o estado"], [
        ("Archivos del repositorio excluyendo dependencias y artefactos", "134"),
        ("Archivos TypeScript backend", "50"),
        ("Archivos TypeScript frontend", "36"),
        ("Componentes frontend no test", "10"),
        ("Servicios frontend no test", "7"),
        ("Controladores backend", "6"),
        ("Módulos backend", "7"),
        ("Servicios backend", "7"),
        ("Endpoints HTTP", "25"),
        ("Modelos Prisma", "4"),
        ("Archivos spec", "23"),
        ("Build frontend", "Aprobado con advertencias"),
        ("Build y pruebas backend", "No ejecutables sin dependencias instaladas"),
    ], widths=[4.8, 2.0], font_size=8.0)
    for row in summary_table.rows:
        for cell in row.cells:
            set_cell_margins(cell, top=50, bottom=50)
    final_paragraph = doc.paragraphs[-1]
    if not final_paragraph.text.strip():
        final_paragraph._element.getparent().remove(final_paragraph._element)

    # Propiedades, encabezados y salida
    doc.core_properties.title = "Documentación Técnica de OdontoClinic"
    doc.core_properties.subject = "Documentación técnica del sistema OdontoClinic"
    doc.core_properties.author = "[Completar información]"
    doc.core_properties.keywords = "OdontoClinic, Angular, NestJS, Prisma, PostgreSQL"
    add_header_footer(doc)
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build()
