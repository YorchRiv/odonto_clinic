from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Manual_Usuario_OdontoClinic.docx"
CAP = ROOT / "manual-usuario" / "capturas"

NAVY = "063B55"
TEAL = "087F8C"
PALE = "EEF4FF"
PALE2 = "F7FAFD"
GRAY = "5F6B7A"
BORDER = "D9D9D9"
BLACK = "000000"

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.5), Inches(11)
sec.top_margin, sec.bottom_margin = Inches(0.72), Inches(0.72)
sec.left_margin, sec.right_margin = Inches(0.78), Inches(0.78)
sec.header_distance, sec.footer_distance = Inches(0.3), Inches(0.3)
sec.different_first_page_header_footer = True

def set_cell_fill(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd'); tcPr.append(shd)
    shd.set(qn('w:fill'), color)

def set_cell_margins(cell, top=90, start=110, bottom=90, end=110):
    tc = cell._tc; tcPr = tc.get_or_add_tcPr()
    tcMar = tcPr.first_child_found_in('w:tcMar')
    if tcMar is None:
        tcMar = OxmlElement('w:tcMar'); tcPr.append(tcMar)
    for m, v in [('top', top), ('start', start), ('bottom', bottom), ('end', end)]:
        node = tcMar.find(qn(f'w:{m}'))
        if node is None: node = OxmlElement(f'w:{m}'); tcMar.append(node)
        node.set(qn('w:w'), str(v)); node.set(qn('w:type'), 'dxa')

def set_table_borders(table, color=BORDER, size='6'):
    tblPr = table._tbl.tblPr
    borders = tblPr.find(qn('w:tblBorders'))
    if borders is None: borders = OxmlElement('w:tblBorders'); tblPr.append(borders)
    for edge in ('top','left','bottom','right','insideH','insideV'):
        tag = borders.find(qn(f'w:{edge}'))
        if tag is None: tag = OxmlElement(f'w:{edge}'); borders.append(tag)
        tag.set(qn('w:val'),'single'); tag.set(qn('w:sz'),size); tag.set(qn('w:color'),color)

def set_repeat_header(row):
    trPr = row._tr.get_or_add_trPr(); el = OxmlElement('w:tblHeader'); el.set(qn('w:val'),'true'); trPr.append(el)

def keep_with_next(p, value=True):
    p.paragraph_format.keep_with_next = value

def no_split(row):
    trPr = row._tr.get_or_add_trPr(); trPr.append(OxmlElement('w:cantSplit'))

def set_font(run, name='Aptos', size=None, bold=None, color=None):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn('w:ascii'), name)
    run._element.get_or_add_rPr().rFonts.set(qn('w:hAnsi'), name)
    if size: run.font.size = Pt(size)
    if bold is not None: run.bold = bold
    if color: run.font.color.rgb = RGBColor.from_string(color)

styles = doc.styles
normal = styles['Normal']; normal.font.name = 'Aptos'; normal.font.size = Pt(10); normal.font.color.rgb = RGBColor.from_string(BLACK)
normal.paragraph_format.space_after = Pt(6); normal.paragraph_format.line_spacing = 1.08
for name, size, before, after in [('Title',34,0,12),('Subtitle',16,0,12),('Heading 1',20,16,8),('Heading 2',13,11,5),('Heading 3',11,9,4)]:
    st=styles[name]; st.font.name='Aptos Display'; st.font.size=Pt(size); st.font.bold=True; st.font.color.rgb=RGBColor.from_string(BLACK)
    st.paragraph_format.space_before=Pt(before); st.paragraph_format.space_after=Pt(after); st.paragraph_format.keep_with_next=True
# Evita que el estilo Title heredado añada una línea decorativa en la portada.
title_ppr = styles['Title']._element.get_or_add_pPr()
title_border = title_ppr.find(qn('w:pBdr'))
if title_border is not None:
    title_ppr.remove(title_border)
styles['Caption'].font.name='Aptos'; styles['Caption'].font.size=Pt(8.5); styles['Caption'].font.italic=True; styles['Caption'].font.color.rgb=RGBColor.from_string(GRAY)
styles['Caption'].paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER; styles['Caption'].paragraph_format.space_after=Pt(9)

header = sec.header
hp = header.paragraphs[0]
hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
r = hp.add_run('ODONTOCLINIC  |  MANUAL DE USUARIO'); set_font(r, size=8, bold=True, color=NAVY)
footer = sec.footer
ft = footer.paragraphs[0]
ft.alignment = WD_ALIGN_PARAGRAPH.CENTER
r=ft.add_run('OdontoClinic  •  Manual de Usuario  •  '); set_font(r,size=8,color=GRAY)
fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); ft._p.append(fld)

def add_page_break(): doc.add_page_break()

def add_heading(text, level=1):
    return doc.add_heading(text, level=level)

def add_body(text, bold_lead=None):
    p=doc.add_paragraph()
    if bold_lead and text.startswith(bold_lead):
        a,b=text.split(bold_lead,1); rr=p.add_run(bold_lead); rr.bold=True; p.add_run(b)
    else: p.add_run(text)
    return p

def add_bullets(items):
    for x in items: doc.add_paragraph(x, style='List Bullet')

def add_steps(items):
    for index, x in enumerate(items, start=1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(.28)
        p.paragraph_format.first_line_indent = Inches(-.22)
        p.paragraph_format.space_after = Pt(3)
        p.add_run(f'{index}. {x}')

def add_note(label, text):
    p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.22); p.paragraph_format.right_indent=Inches(.15)
    r=p.add_run(label.upper()+'. '); set_font(r,bold=True,color=NAVY); p.add_run(text)

def add_table(headers, rows, widths=None, compact=False):
    table=doc.add_table(rows=1, cols=len(headers)); table.alignment=WD_TABLE_ALIGNMENT.CENTER; table.autofit=False
    set_table_borders(table); set_repeat_header(table.rows[0])
    for i,h in enumerate(headers):
        c=table.rows[0].cells[i]; set_cell_fill(c,NAVY); set_cell_margins(c, top=55 if compact else 90, bottom=55 if compact else 90); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=p.add_run(h); set_font(r,size=8 if compact else 8.5,bold=True,color='FFFFFF')
        if widths: c.width=Inches(widths[i])
    for ridx,row in enumerate(rows):
        cells=table.add_row().cells; no_split(table.rows[-1])
        for i,val in enumerate(row):
            c=cells[i]; set_cell_margins(c, top=55 if compact else 90, bottom=55 if compact else 90); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if ridx%2: set_cell_fill(c,PALE2)
            p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(0); r=p.add_run(str(val)); set_font(r,size=8 if compact else 8.5)
            if widths: c.width=Inches(widths[i])
    doc.add_paragraph().paragraph_format.space_after=Pt(1)
    return table

def add_figure(filename, caption, width=6.75):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.keep_with_next=True
    run=p.add_run(); shape=run.add_picture(str(CAP/filename), width=Inches(width))
    docPr=shape._inline.docPr; docPr.set('descr',caption); docPr.set('title',caption)
    c=doc.add_paragraph(caption,style='Caption'); c.paragraph_format.keep_with_next=False

def procedure(title, prereq, steps, result):
    add_heading(title,2)
    add_body('Requisito previo. '+prereq)
    add_steps(steps)
    add_body('Resultado esperado. '+result)

def add_toc():
    p=doc.add_paragraph(); run=p.add_run(); fldChar=OxmlElement('w:fldChar'); fldChar.set(qn('w:fldCharType'),'begin'); run._r.append(fldChar)
    instr=OxmlElement('w:instrText'); instr.set(qn('xml:space'),'preserve'); instr.text=' TOC \\o "1-3" \\h \\z \\u '; run._r.append(instr)
    fldChar2=OxmlElement('w:fldChar'); fldChar2.set(qn('w:fldCharType'),'separate'); run._r.append(fldChar2)
    rr=p.add_run('Tabla de contenido automática'); set_font(rr,color=GRAY)
    end=OxmlElement('w:fldChar'); end.set(qn('w:fldCharType'),'end'); rr._r.append(end)

# Portada
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(70)
r=p.add_run('ODONTOCLINIC'); set_font(r,'Aptos Display',18,True,NAVY)
p=doc.add_paragraph(style='Title'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run('Manual de Usuario')
p=doc.add_paragraph(style='Subtitle'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run('Proyecto de Seminario')
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(20)
for line in ['Ingeniería en Sistemas','Universidad Mariano Gálvez de Guatemala']:
    r=p.add_run(line+'\n'); set_font(r,size=12,bold=line.startswith('Universidad'))
meta=['Estudiante: [Completar información]','Carné: [Completar información]','Docente: [Completar información]','Sede: [Completar información]','Fecha: [Completar información]']
p=doc.add_paragraph(); p.paragraph_format.space_before=Pt(70); p.paragraph_format.left_indent=Inches(1.45)
for line in meta: p.add_run(line+'\n')
add_page_break()

add_heading('Control del documento',1)
add_table(['Campo','Información'],[
('Nombre','Manual de Usuario de OdontoClinic'),('Sistema','OdontoClinic'),('Tipo de documento','Manual de Usuario'),('Versión','1.0'),('Fecha','[Completar]'),('Estado','Documento de usuario')],[2.0,4.4])
add_body('Este manual explica las operaciones disponibles en la interfaz actual de OdontoClinic para usuarios administrativos, doctores y recepcionistas.')
add_page_break(); add_heading('Tabla de contenido',1); add_toc(); add_page_break()

add_heading('1 Introducción',1)
add_body('OdontoClinic es una plataforma web para gestionar pacientes, citas, historias basadas en citas y notas, reportes y cuentas de usuario de una clínica odontológica. La aplicación reúne estas tareas en una navegación común y adapta algunas opciones según el rol de la cuenta.')
add_body('El manual describe únicamente acciones visibles en la interfaz. La Historia Clínica permite consultar las citas y sus notas; no incluye formularios independientes para registrar diagnósticos, tratamientos u observaciones clínicas fuera de una cita.')

add_heading('2 Objetivo del manual',1)
add_body('Guiar al usuario desde el inicio de sesión hasta las operaciones habituales de consulta, registro, actualización, exportación y cierre de sesión. Cada procedimiento indica el punto de acceso, los datos solicitados y el resultado que debe observarse.')

add_heading('3 Requisitos para utilizar el sistema',1)
add_bullets(['Un navegador web con acceso a la dirección de OdontoClinic.','Conexión a Internet para consultar y guardar información.','Una cuenta activa habilitada por el administrador de la clínica.','Correo electrónico y contraseña de la cuenta.'])
add_note('Importante','El proyecto no define navegadores certificados ni versiones mínimas. Si una pantalla no carga correctamente, confirme primero la conexión y vuelva a ingresar.')

add_heading('4 Roles de usuario',1)
add_body('OdontoClinic reconoce tres roles. Las funciones principales están disponibles para los tres, con diferencias en la administración de cuentas, el alcance de la información y la eliminación de registros.')
add_table(['Función','Administrador','Doctor','Recepcionista'],[
('Dashboard, Agenda, Pacientes, Historia Clínica y Reportes','Disponible','Disponible','Disponible'),
('Crear y editar pacientes y citas','Disponible','Disponible','Disponible'),
('Eliminar pacientes o citas','Disponible','Disponible','No permitido'),
('Usuarios en el menú','Visible','No visible','No visible'),
('Crear y eliminar cuentas','Disponible','No disponible desde la navegación','No disponible desde la navegación'),
('Mi perfil y cambio de contraseña','Disponible','Disponible','Disponible'),
('Alcance de agenda y pacientes','Registros vinculados a su cuenta','Registros vinculados a su cuenta','Registros del doctor asignado')],[2.35,1.35,1.35,1.35])
add_note('Nota','El botón de eliminación puede aparecer en algunas pantallas para una cuenta RECEPCIONISTA, pero el sistema impide completar la acción y muestra No tiene permiso para eliminar.')

add_heading('5 Acceso al sistema',1)
add_figure('01-login.png','Figura 1. Pantalla de inicio de sesión de OdontoClinic.')
procedure('5.1 Iniciar sesión','Contar con una cuenta activa y conocer sus credenciales.',[
'Abra la dirección web de OdontoClinic.','Ingrese el Correo electrónico.','Ingrese la Contraseña. Debe contener al menos 6 caracteres.','Si necesita comprobar lo escrito, utilice el botón Mostrar contraseña.','Seleccione Iniciar sesión.'
],'El sistema abrirá el Dashboard y mostrará el nombre y el rol de la cuenta en la parte superior.')
add_heading('5.2 Validaciones de acceso',2)
add_bullets(['Correo con formato no válido: Ingresa un correo válido.','Contraseña con menos de 6 caracteres: La contraseña debe tener al menos 6 caracteres.','Correo no registrado: El correo electrónico no está registrado.','Contraseña incorrecta: La contraseña es incorrecta.','Cuenta desactivada: Tu cuenta está desactivada. Por favor, contacta al administrador.','Error no identificado: No pudimos iniciar sesión. Verifica tu correo y contraseña.'])

add_heading('6 Conociendo la interfaz',1)
add_figure('02-dashboard.png','Figura 2. Interfaz principal y navegación de OdontoClinic.')
add_body('El menú lateral contiene Dashboard, Agenda, Pacientes, Historia Clínica y Reportes. Para ADMIN también aparece la sección Administración con Usuarios. La barra superior ofrece accesos a Pacientes, Nueva cita y al menú de la cuenta.')
add_bullets(['Menú lateral. Cambia entre módulos.','Barra superior. Muestra la sede, accesos directos y la cuenta activa.','Área de contenido. Presenta la información y las acciones del módulo seleccionado.','Menú de usuario. Abre Mi perfil, Usuarios para ADMIN y Cerrar sesión.','En pantallas estrechas, el botón de menú abre o cierra la navegación lateral.'])
add_note('Nota','El icono Ayuda se muestra en la barra superior, pero la interfaz actual no presenta un procedimiento o contenido de ayuda al seleccionarlo.')

add_heading('7 Dashboard',1)
add_body('El Dashboard resume la actividad de la fecha seleccionada. Presenta Citas del día, Pacientes activos, Pacientes nuevos y Citas por atender. La agenda inferior lista las citas reales de la fecha y excluye espacios con estado DISPONIBLE.')
add_bullets(['Utilice el selector de fecha para consultar otro día.','Seleccione Hoy para regresar a la fecha actual.','Seleccione Ver agenda completa para abrir Agenda.','Use Nueva cita, Nuevo paciente, Buscar paciente o Historia clínica en Acciones rápidas.','Las etiquetas Todas, Confirmadas y Pendientes muestran cantidades; en esta pantalla no funcionan como filtros.'])

add_heading('8 Gestión de pacientes',1)
add_figure('03-pacientes.png','Figura 3. Listado y filtros del módulo Pacientes.')
add_heading('8.1 Consultar pacientes',2)
add_body('La pantalla muestra totales, un buscador, filtros por estado, una tabla y controles de paginación. La búsqueda acepta nombre, teléfono, correo o DPI. Cada página contiene hasta 10 registros.')
procedure('8.2 Buscar un paciente','Tener una sesión activa y acceso al módulo Pacientes.',[
'Seleccione Pacientes en el menú.','Escriba el nombre, teléfono, correo o DPI en el buscador.','Si corresponde, elija Todos, Activos o Inactivos.','Revise los resultados. Utilice Anterior o Siguiente cuando exista más de una página.'
],'La tabla mostrará únicamente los pacientes que coincidan con el texto y el estado elegidos.')
add_figure('04-nuevo-paciente.png','Figura 4. Formulario Nuevo paciente.')
add_heading('8.3 Campos del paciente',2)
add_table(['Campo','Obligatorio','Uso visible'],[
('Nombres','Sí','Nombres del paciente.'),('Apellidos','Sí','Apellidos del paciente.'),('DPI o Identificación oficial','No','Documento de identificación.'),('Fecha de nacimiento','No','Fecha seleccionada en el calendario.'),('Teléfono','Sí','Número de contacto.'),('Correo electrónico','No','Dirección de correo con formato válido.'),('Dirección','No','Dirección del paciente.'),('Estado','No','Activo o Inactivo; el formulario inicia en Activo.'),('Alergias','No','Alergias conocidas o indicación registrada por la clínica.')],[2.2,1.0,3.2])
procedure('8.4 Registrar un paciente','Tener acceso a Pacientes.',[
'Seleccione Nuevo paciente.','Complete Nombres, Apellidos y Teléfono.','Agregue los campos opcionales que correspondan.','Revise el Estado.','Seleccione Crear paciente.'
],'El formulario se cerrará, el listado se actualizará y el nuevo expediente aparecerá dentro del alcance de la cuenta.')
procedure('8.5 Editar un paciente','Localizar el registro en la tabla.',[
'Seleccione el icono Editar en Acciones.','Actualice los datos necesarios.','Seleccione Guardar cambios.'
],'El sistema guardará la información y actualizará el listado.')
procedure('8.6 Consultar el perfil del paciente','Localizar el registro en Pacientes.',[
'Seleccione el icono Ver perfil o haga doble clic en la fila.','Revise los datos personales, la alerta de alergias, el resumen y el Historial de citas.','Utilice Historia clínica o Nueva cita cuando necesite continuar con esas operaciones.'
],'Se mostrará el expediente del paciente y hasta ocho citas asociadas en el resumen visible.')
procedure('8.7 Eliminar un paciente','Usar una cuenta ADMIN o DOCTOR y localizar el paciente.',[
'Seleccione el icono Eliminar.','Si el paciente tiene citas, revise el mensaje No se puede eliminar el paciente porque tiene citas registradas.','Si no existen citas, confirme Eliminar a nombre del paciente.'
],'Cuando la eliminación es permitida y se confirma, el registro desaparece del listado.')
add_heading('8.8 Estados del paciente',2)
add_body('Activo e Inactivo son etiquetas de clasificación visibles en listados, perfiles y reportes. La interfaz permite cambiar el estado al crear o editar un paciente; no aplica por sí misma otra regla clínica.')

add_heading('9 Agenda y citas',1)
add_figure('05-agenda-detalle.png','Figura 5. Agenda diaria y panel Detalle de cita.')
add_heading('9.1 Consultar la agenda',2)
add_bullets(['Día presenta las citas de una fecha en orden de hora.','Semana presenta siete columnas con las citas del periodo.','Mes presenta un calendario y hasta tres citas por día; si hay más, muestra una cantidad adicional.','Hoy regresa al periodo actual. Las flechas avanzan o retroceden un día, una semana o un mes según la vista.','Los filtros disponibles son Todas, Nuevas, Pendientes, Confirmadas, Finalizadas y Canceladas.','El buscador filtra por paciente o procedimiento.'])
procedure('9.2 Registrar una cita','El paciente debe existir en el sistema.',[
'Seleccione Nueva cita.','Elija Fecha y Hora.','Escriba en Paciente y seleccione un resultado de la lista. No basta con dejar texto sin seleccionar.','Ingrese el Motivo de consulta.','Agregue Notas clínicas si corresponde.','Seleccione Crear cita.'
],'La cita se registrará con estado Nueva y aparecerá en la agenda correspondiente.')
add_note('Importante','Si la búsqueda no encuentra al paciente, la opción Crear paciente abre el módulo Pacientes. Registre el expediente antes de volver a programar la cita.')
procedure('9.3 Consultar y actualizar una cita','Ubicar la cita en Día, Semana o Mes.',[
'Seleccione la cita.','Revise paciente, fecha, horario, motivo y notas.','En Actualizar estado, elija Nueva, Pendiente, Confirmada, Finalizada o Cancelada.','También puede seleccionar Marcar finalizada en el detalle de la vista Día.'
],'El estado se actualizará y la agenda se volverá a cargar.')
procedure('9.4 Editar una cita','Abrir Detalle de cita.',[
'Seleccione Editar cita.','Cambie Fecha, Hora, Paciente, Motivo de consulta o Notas clínicas.','Seleccione Guardar cambios.'
],'El sistema guardará los cambios y actualizará la agenda. Si el horario ya está ocupado, mostrará Ya existe una cita a esa hora. Elige otra.')
procedure('9.5 Eliminar una cita','Usar una cuenta ADMIN o DOCTOR y abrir el detalle.',[
'Seleccione Eliminar.','Espere a que la agenda se actualice.'
],'La cita desaparecerá. La interfaz actual no presenta una ventana de confirmación antes de esta eliminación.')
add_heading('9.6 Interpretación de estados',2)
add_table(['Estado','Comportamiento visible'],[
('Nueva','Estado asignado al crear una cita.'),('Pendiente','Cita identificada como pendiente de atención o confirmación.'),('Confirmada','Cita marcada como confirmada.'),('Finalizada','Atención marcada como finalizada.'),('Cancelada','Cita marcada como cancelada.'),('Disponible','Valor reconocido por el sistema y excluido de los listados de citas reales; no aparece como opción en Actualizar estado.')],[1.35,5.05])

add_heading('10 Historia Clínica',1)
add_figure('06-historia-clinica.png','Figura 6. Historia Clínica construida a partir de citas y notas.')
add_body('La Historia Clínica es una vista de consulta. Reúne los datos del paciente y las citas asociadas con sus motivos, estados y notas. La interfaz actual no permite registrar diagnósticos, tratamientos u observaciones mediante formularios independientes.')
procedure('10.1 Consultar la historia','Tener acceso al paciente dentro del alcance de la cuenta.',[
'Seleccione Historia Clínica.','Busque por nombre, DPI, teléfono o correo, o seleccione un paciente reciente.','Revise la identificación, la alerta de alergias y las métricas.','En Historial de citas y consultas, elija un estado si desea filtrar.','Seleccione Más recientes o Más antiguas para cambiar el orden.','Abra una fecha y utilice Ver más cuando una nota esté contraída.'
],'Se mostrarán las citas y notas asociadas al paciente seleccionado.')

add_heading('11 Reportes',1)
add_figure('07-reportes.png','Figura 7. Generación y exportación de reportes.')
add_heading('11.1 Tipos de reporte',2)
add_table(['Pestaña','Opciones visibles','Filtros'],[
('Pacientes','Listado general de pacientes; Expediente individual','Paciente cuando el reporte es individual.'),('Citas','Citas diarias; Citas semanales; Citas mensuales','Desde, Hasta para semanal y Estado.'),('Clínicos','Historial individual','Paciente.')],[1.2,2.6,2.6])
procedure('11.2 Generar un reporte','Tener registros disponibles dentro del alcance de la cuenta.',[
'Seleccione Reportes.','Elija Pacientes, Citas o Clínicos.','Seleccione el tipo y complete los filtros visibles.','Cuando se solicite un paciente, búsquelo y selecciónelo de la lista.','Seleccione Generar reporte o Actualizar.','Revise el título, la cantidad de registros y la vista previa.'
],'La tabla mostrará los datos que cumplen los filtros. Si no hay resultados, aparecerá No hay datos para los filtros seleccionados.')
add_heading('11.3 Exportar un reporte',2)
add_body('Los botones de exportación se habilitan cuando la vista previa contiene columnas.')
add_steps(['Seleccione PDF para descargar un archivo PDF.','Seleccione Excel para descargar un archivo XLSX.','Seleccione CSV para descargar un archivo CSV.'])
add_note('Importante','Revise el tipo, las fechas, el estado y el paciente antes de exportar. El archivo conserva el reporte visible al momento de la descarga.')

add_heading('12 Gestión de usuarios',1)
add_figure('08-usuarios.png','Figura 8. Módulo Usuarios disponible en la navegación de ADMIN.')
add_body('Usuarios aparece en el menú únicamente para ADMIN. Es la función visible dentro de Configuración / Gestión de accesos; la interfaz no presenta otra pantalla independiente de configuración. Permite buscar por nombre, correo o rol; filtrar por Administrador, Doctor o Recepcionista; y revisar la asignación clínica.')
procedure('12.1 Crear un usuario','Iniciar sesión con una cuenta ADMIN.',[
'Seleccione Usuarios y después Nuevo usuario.','Complete Nombre, Apellido y Correo electrónico.','Ingrese una Contraseña provisional de al menos 6 caracteres.','Elija Administrador, Doctor o Recepcionista.','Si elige Recepcionista, seleccione Doctor asignado.','Seleccione Crear usuario.'
],'La cuenta aparecerá en el listado y podrá utilizarse para iniciar sesión.')
procedure('12.2 Editar un usuario','Localizar la cuenta en Usuarios.',[
'Seleccione el icono Editar.','Actualice nombre, apellido, correo o rol.','Si necesita cambiar la contraseña, complete Nueva contraseña.','Si el rol es Recepcionista, revise Doctor asignado.','Seleccione Guardar cambios.'
],'El sistema actualizará la cuenta y recargará el listado.')
procedure('12.3 Eliminar un usuario','Iniciar sesión como ADMIN y localizar la cuenta.',[
'Seleccione el icono Eliminar.','Confirme Eliminar a nombre del usuario.'
],'La cuenta se eliminará y el listado se actualizará.')

add_heading('13 Perfil de usuario',1)
add_figure('09-perfil.png','Figura 9. Pantalla Mi perfil.')
procedure('13.1 Actualizar información personal','Abrir el menú de la cuenta y seleccionar Mi perfil.',[
'Modifique Nombre, Apellido o Correo electrónico.','Revise el Rol en la clínica, que se muestra como campo deshabilitado.','Seleccione Guardar cambios.'
],'Aparecerá Información personal actualizada y la cabecera reflejará los datos guardados.')
procedure('13.2 Cambiar la contraseña','Abrir Mi perfil.',[
'Ingrese una Nueva contraseña de al menos 6 caracteres.','Repita el valor en Confirmar nueva contraseña.','Seleccione Actualizar contraseña.'
],'Aparecerá Contraseña actualizada correctamente. Si los valores difieren, se mostrará Las contraseñas no coinciden.')

add_heading('14 Cierre de sesión',1)
add_steps(['Seleccione su nombre o avatar en la esquina superior derecha.','Seleccione Cerrar sesión.','El sistema eliminará la sesión local y volverá a la pantalla de inicio de sesión.'])
add_note('Recomendación','Cierre la sesión al terminar, especialmente cuando utilice un equipo compartido.')

add_heading('15 Mensajes y validaciones',1)
add_table(['Situación','Mensaje o comportamiento','Acción recomendada'],[
('Campo obligatorio vacío','El botón permanece deshabilitado o el formulario no se envía.','Complete los campos marcados con asterisco.'),
('Paciente no seleccionado en una cita','Debes seleccionar un paciente existente.','Seleccione un resultado del buscador.'),
('Horario ocupado','Ya existe una cita a esa hora. Elige otra.','Cambie la hora o la fecha.'),
('Error al crear cita','No se pudo crear la cita.','Revise los datos y la conexión; intente nuevamente.'),
('Paciente duplicado','Ya existe un paciente con el mismo nombre y apellido.','Busque el expediente antes de crear otro.'),
('Paciente con citas','No se puede eliminar el paciente porque tiene citas registradas.','Conserve el expediente o revise sus citas.'),
('Eliminación no permitida','No tiene permiso para eliminar.','Solicite la operación a un ADMIN o DOCTOR.'),
('Correo de usuario repetido','Ya existe un usuario con ese correo.','Use otro correo o edite la cuenta existente.'),
('Error de perfil','No fue posible actualizar el perfil o la contraseña.','Revise la conexión e intente nuevamente.')],[1.55,2.55,2.3], compact=True)

add_heading('16 Funciones disponibles según rol',1)
add_heading('16.1 Administrador',2); add_bullets(['Accede a los módulos principales.','Ve Usuarios en la navegación.','Crea, edita y elimina cuentas.','Puede eliminar pacientes y citas dentro del alcance de su cuenta.'])
add_heading('16.2 Doctor',2); add_bullets(['Accede a Dashboard, Agenda, Pacientes, Historia Clínica, Reportes y Mi perfil.','Gestiona su agenda y los pacientes vinculados a su cuenta.','Puede eliminar pacientes sin citas y eliminar citas.','No ve Usuarios en el menú.'])
add_heading('16.3 Recepcionista',2); add_bullets(['Accede a los módulos principales y a Mi perfil.','Trabaja con la agenda y los pacientes del doctor asignado.','Puede crear y editar pacientes y citas.','No puede eliminar pacientes ni citas.','No ve Usuarios en el menú.'])

add_heading('17 Procedimientos frecuentes',1)
add_table(['Necesidad','Ruta resumida'],[
('Registrar paciente','Pacientes → Nuevo paciente → completar datos → Crear paciente.'),('Programar cita','Agenda → Nueva cita → seleccionar paciente → Crear cita.'),('Buscar paciente','Pacientes → buscador → revisar resultados.'),('Cambiar estado de cita','Agenda → seleccionar cita → Actualizar estado.'),('Consultar historial','Historia Clínica → buscar paciente → abrir fechas.'),('Generar reporte','Reportes → tipo y filtros → Generar reporte.'),('Editar perfil','Menú de cuenta → Mi perfil → Guardar cambios.'),('Crear usuario','Usuarios → Nuevo usuario → completar rol y asignación → Crear usuario.')],[1.75,4.65])

add_heading('18 Buenas prácticas de uso',1)
add_bullets(['Verifique el paciente seleccionado antes de registrar una cita.','Revise nombres, teléfono y documento antes de guardar un expediente.','Registre en Notas clínicas únicamente información necesaria para la atención.','Actualice el estado de la cita para que Dashboard, Historia Clínica y Reportes reflejen la operación.','Revise los filtros antes de exportar un reporte.','No comparta sus credenciales.','Cierre sesión en equipos compartidos.'])

add_heading('19 Preguntas frecuentes',1)
faqs=[
('¿Qué hago si no puedo iniciar sesión?','Revise el formato del correo, confirme que la contraseña tenga al menos 6 caracteres y lea el mensaje mostrado. Si la cuenta está desactivada o no está registrada, contacte al administrador.'),
('¿Por qué no veo Usuarios?','La opción Usuarios aparece en la navegación únicamente para cuentas ADMIN.'),
('¿Cómo encuentro un paciente?','Abra Pacientes y busque por nombre, teléfono, correo o DPI. También puede usar la búsqueda de Historia Clínica.'),
('¿Cómo cambio el estado de una cita?','Abra Agenda, seleccione la cita y elija un valor en Actualizar estado.'),
('¿Dónde consulto citas anteriores?','Abra el perfil del paciente o Historia Clínica. Esta última permite filtrar y ordenar las citas.'),
('¿Cómo exporto un reporte?','Genere la vista previa en Reportes y seleccione PDF, Excel o CSV.'),
('¿Por qué no puedo eliminar un paciente?','La eliminación se bloquea si existen citas. Además, RECEPCIONISTA no tiene permiso para eliminar.'),
('¿Cómo cierro sesión?','Abra el menú de la cuenta en la esquina superior derecha y seleccione Cerrar sesión.')]
for q,a in faqs: add_heading(q,2); add_body(a)

add_heading('20 Glosario',1)
add_table(['Término','Definición funcional'],[
('Paciente','Persona con un expediente registrado en OdontoClinic.'),('Cita','Registro de fecha, hora, paciente, motivo, estado y notas.'),('Agenda','Vista diaria, semanal o mensual de citas.'),('Historia Clínica','Consulta cronológica de citas y notas de un paciente.'),('Reporte','Vista filtrada que puede exportarse a PDF, Excel o CSV.'),('Administrador','Rol con acceso visible a Usuarios y gestión de cuentas.'),('Doctor','Rol que gestiona su agenda y pacientes asociados.'),('Recepcionista','Rol que opera con el doctor asignado y no puede eliminar pacientes o citas.'),('Estado','Clasificación visible de un paciente o una cita.')],[1.45,4.95])

add_heading('21 Soporte e información pendiente',1)
add_body('Soporte técnico: [Completar información]')
add_body('Cuando solicite soporte, indique el módulo, la acción realizada y el mensaje visible. No comparta su contraseña.')

settings = doc.settings._element
update = settings.find(qn('w:updateFields'))
if update is None: update=OxmlElement('w:updateFields'); settings.append(update)
update.set(qn('w:val'),'true')

doc.core_properties.title='Manual de Usuario de OdontoClinic'
doc.core_properties.subject='Guía de uso de la interfaz de OdontoClinic'
doc.core_properties.author='[Completar información]'
doc.core_properties.keywords='OdontoClinic, manual de usuario, pacientes, citas, reportes'
doc.save(OUT)
print(OUT)
