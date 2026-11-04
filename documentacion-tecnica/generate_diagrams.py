from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "diagramas"
OUT.mkdir(parents=True, exist_ok=True)

NAVY = "#123047"
BLUE = "#2C6E91"
TEAL = "#2A9D8F"
PALE = "#EEF5F8"
PALE_BLUE = "#E8F2F7"
PALE_TEAL = "#E8F6F3"
GRAY = "#5E6B73"
LIGHT = "#D9E2E7"
WHITE = "#FFFFFF"
RED = "#A14D4D"

FONT = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")


def font(size: int, bold: bool = False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT), size)


def centered(draw, box, text, fnt, fill=NAVY):
    x1, y1, x2, y2 = box
    bbox = draw.multiline_textbbox((0, 0), text, font=fnt, spacing=5, align="center")
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.multiline_text(((x1 + x2 - w) / 2, (y1 + y2 - h) / 2), text, font=fnt, fill=fill, spacing=5, align="center")


def box(draw, xy, title, subtitle="", fill=WHITE, outline=BLUE, title_size=34, sub_size=24):
    draw.rounded_rectangle(xy, radius=24, fill=fill, outline=outline, width=4)
    x1, y1, x2, y2 = xy
    centered(draw, (x1 + 18, y1 + 18, x2 - 18, y1 + 78), title, font(title_size, True), NAVY)
    if subtitle:
        centered(draw, (x1 + 22, y1 + 78, x2 - 22, y2 - 16), subtitle, font(sub_size), GRAY)


def arrow(draw, start, end, label="", color=BLUE, width=6, label_pos=None):
    draw.line([start, end], fill=color, width=width)
    import math
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    length = 20
    a1 = angle + 2.65
    a2 = angle - 2.65
    p1 = (end[0] + length * math.cos(a1), end[1] + length * math.sin(a1))
    p2 = (end[0] + length * math.cos(a2), end[1] + length * math.sin(a2))
    draw.polygon([end, p1, p2], fill=color)
    if label:
        lx, ly = label_pos or ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2 - 34)
        bbox = draw.textbbox((0, 0), label, font=font(22, True))
        w = bbox[2] - bbox[0]
        draw.rounded_rectangle((lx - w / 2 - 12, ly - 19, lx + w / 2 + 12, ly + 19), radius=9, fill=WHITE, outline=LIGHT, width=2)
        draw.text((lx - w / 2, ly - 13), label, font=font(22, True), fill=NAVY)


def save_architecture():
    im = Image.new("RGB", (2400, 1400), WHITE)
    d = ImageDraw.Draw(im)
    d.text((110, 70), "Arquitectura implementada de OdontoClinic", font=font(48, True), fill=NAVY)
    d.text((110, 135), "Flujo lógico verificado en el código fuente", font=font(27), fill=GRAY)

    box(d, (90, 480, 370, 680), "Usuario", "Navegador web", PALE)
    box(d, (480, 410, 850, 750), "Frontend Angular", "Componentes standalone\nRouter y guards\nServicios HttpClient\nInterceptor Bearer", PALE_BLUE)
    box(d, (1010, 410, 1400, 750), "API NestJS", "Controllers\nServices\nDTOs\nMódulos funcionales", PALE_TEAL, TEAL)
    box(d, (1580, 480, 1880, 680), "Prisma ORM", "PrismaService\nCRUD tipado", PALE_BLUE)
    box(d, (2060, 460, 2320, 700), "PostgreSQL", "Usuario\nPaciente\nCita\nHistoriaClinica", PALE, NAVY)
    box(d, (1010, 165, 1400, 330), "JWT Passport", "Protege profile y update/:id", "#F7EEEE", RED)
    box(d, (480, 900, 850, 1075), "localStorage", "Clave user con access_token y usuario", "#F4F4F4", GRAY)

    arrow(d, (370, 580), (480, 580), "UI")
    arrow(d, (850, 580), (1010, 580), "HTTPS JSON REST")
    arrow(d, (1400, 580), (1580, 580), "CRUD")
    arrow(d, (1880, 580), (2060, 580), "SQL")
    arrow(d, (1205, 330), (1205, 410), "JWT", color=RED, label_pos=(1325, 370))
    arrow(d, (665, 750), (665, 900), "sesión local", color=GRAY, label_pos=(800, 825))

    d.rounded_rectangle((95, 1160, 2305, 1305), radius=20, fill="#F7F9FA", outline=LIGHT, width=3)
    d.text((130, 1195), "Observación de seguridad", font=font(27, True), fill=RED)
    d.text((130, 1240), "El interceptor adjunta el token a las solicitudes, pero los controladores CRUD de usuarios, pacientes, citas e historia clínica no declaran guards.", font=font(25), fill=NAVY)
    im.save(OUT / "arquitectura.png", quality=95, dpi=(180, 180))


def entity(draw, x, y, w, title, rows, header_fill=NAVY):
    row_h = 44
    h = 64 + row_h * len(rows)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=WHITE, outline=header_fill, width=4)
    draw.rounded_rectangle((x, y, x + w, y + 64), radius=18, fill=header_fill)
    draw.rectangle((x, y + 42, x + w, y + 64), fill=header_fill)
    centered(draw, (x, y, x + w, y + 64), title, font(30, True), WHITE)
    for i, (name, typ, key) in enumerate(rows):
        top = y + 64 + i * row_h
        if i % 2:
            draw.rectangle((x + 2, top, x + w - 2, top + row_h), fill="#F5F8FA")
        draw.line((x, top, x + w, top), fill=LIGHT, width=2)
        draw.text((x + 16, top + 10), name, font=font(20, bool(key)), fill=NAVY)
        draw.text((x + w - 150, top + 10), typ, font=font(18), fill=GRAY)
        if key:
            draw.text((x + w - 52, top + 10), key, font=font(17, True), fill=TEAL)
    return (x, y, x + w, y + h)


def relationship(draw, start, end, left_card, right_card, label=""):
    arrow(draw, start, end, label, color=GRAY, width=5, label_pos=((start[0] + end[0]) / 2, (start[1] + end[1]) / 2 - 30))
    draw.text((start[0] + 10, start[1] - 34), left_card, font=font(22, True), fill=NAVY)
    draw.text((end[0] - 42, end[1] - 34), right_card, font=font(22, True), fill=NAVY)


def poly_arrow(draw, points, label="", color=GRAY, width=5, label_pos=None):
    draw.line(points, fill=color, width=width, joint="curve")
    arrow(draw, points[-2], points[-1], "", color=color, width=width)
    if label and label_pos:
        lx, ly = label_pos
        bbox = draw.textbbox((0, 0), label, font=font(22, True))
        tw = bbox[2] - bbox[0]
        draw.rounded_rectangle((lx - tw / 2 - 12, ly - 19, lx + tw / 2 + 12, ly + 19), radius=9, fill=WHITE, outline=LIGHT, width=2)
        draw.text((lx - tw / 2, ly - 13), label, font=font(22, True), fill=NAVY)


def save_er():
    im = Image.new("RGB", (2400, 1700), WHITE)
    d = ImageDraw.Draw(im)
    d.text((100, 55), "Modelo entidad relación verificado", font=font(48, True), fill=NAVY)
    d.text((100, 120), "Esquema Prisma y migración inicial", font=font(27), fill=GRAY)

    usuario = entity(d, 100, 250, 610, "Usuario", [
        ("id", "Int", "PK"), ("nombre", "String", ""), ("apellido", "String", ""),
        ("email", "String", "UQ"), ("password", "String", ""), ("rol", "Rol", ""),
        ("refreshToken", "String?", ""), ("lastLogin", "DateTime?", ""),
        ("activo", "Boolean", ""), ("creadoEn", "DateTime", ""), ("actualizadoEn", "DateTime", "")
    ])
    paciente = entity(d, 900, 210, 650, "Paciente", [
        ("id", "Int", "PK"), ("nombres", "String", ""), ("apellidos", "String", ""),
        ("dpi", "String?", "UQ"), ("telefono", "String", ""), ("email", "String?", ""),
        ("direccion", "String?", ""), ("fechaNacimiento", "DateTime?", ""),
        ("estado", "EstadoPaciente", ""), ("alergias", "String?", ""),
        ("creadoPorId", "Int", "FK"), ("creadoEn", "DateTime", ""), ("actualizadoEn", "DateTime", "")
    ], TEAL)
    cita = entity(d, 1720, 250, 580, "Cita", [
        ("id", "Int", "PK"), ("pacienteId", "Int", "FK"), ("usuarioId", "Int", "FK"),
        ("fecha", "DateTime", ""), ("hora", "String", ""), ("motivo", "String", ""),
        ("estado", "EstadoCita", ""), ("notas", "String?", ""),
        ("creadoEn", "DateTime", ""), ("actualizadoEn", "DateTime", "")
    ], BLUE)
    historia = entity(d, 930, 1080, 650, "HistoriaClinica", [
        ("id", "Int", "PK"), ("citaId", "Int", "FK UQ"), ("pacienteId", "Int", "FK"),
        ("descripcion", "String?", ""), ("diagnostico", "String?", ""),
        ("tratamiento", "String?", ""), ("observaciones", "String?", ""),
        ("creadoEn", "DateTime", ""), ("actualizadoEn", "DateTime", "")
    ], RED)

    relationship(d, (710, 540), (900, 540), "1", "N", "creadoPorId")
    relationship(d, (1550, 560), (1720, 560), "1", "N", "pacienteId")
    poly_arrow(d, [(405, 250), (405, 180), (2005, 180), (2005, 250)], "usuarioId", label_pos=(1205, 180))
    d.text((420, 200), "1", font=font(22, True), fill=NAVY)
    d.text((1965, 205), "N", font=font(22, True), fill=NAVY)
    relationship(d, (1225, 782), (1225, 1080), "1", "N", "pacienteId")
    poly_arrow(d, [(2010, 710), (1580, 1185)], "citaId único", label_pos=(1800, 900))
    d.text((1975, 700), "1", font=font(22, True), fill=NAVY)
    d.text((1588, 1115), "0..1", font=font(22, True), fill=NAVY)

    d.text((100, 1605), "PK clave primaria   FK clave foránea   UQ restricción única", font=font(24), fill=GRAY)
    im.save(OUT / "modelo_er.png", quality=95, dpi=(180, 180))


def save_auth():
    im = Image.new("RGB", (2400, 1500), WHITE)
    d = ImageDraw.Draw(im)
    d.text((100, 55), "Secuencia de inicio de sesión", font=font(48, True), fill=NAVY)
    d.text((100, 120), "Camino exitoso reconstruido desde LoginComponent y AuthService", font=font(27), fill=GRAY)
    participants = [
        ("Usuario", "external"), ("Login Angular", "frontend"), ("AuthController", "backend"),
        ("AuthService", "security"), ("PrismaService", "backend"), ("PostgreSQL", "database"),
        ("JwtService", "security")
    ]
    xs = [160, 500, 840, 1180, 1520, 1860, 2200]
    colors = {"external": GRAY, "frontend": BLUE, "backend": TEAL, "security": RED, "database": NAVY}
    for (label, typ), x in zip(participants, xs):
        d.rounded_rectangle((x - 125, 210, x + 125, 285), radius=16, fill=colors[typ], outline=colors[typ])
        centered(d, (x - 120, 215, x + 120, 280), label, font(23, True), WHITE)
        d.line((x, 285, x, 1240), fill=LIGHT, width=4)
    messages = [
        (0, 1, 350, "correo y contraseña", BLUE),
        (1, 2, 425, "POST /auth/login", BLUE),
        (2, 3, 500, "login(LoginDto)", TEAL),
        (3, 4, 575, "findUnique por email", TEAL),
        (4, 5, 650, "SELECT Usuario", NAVY),
        (5, 4, 725, "fila Usuario", GRAY),
        (4, 3, 800, "registro de usuario", GRAY),
        (3, 6, 875, "bcrypt.compare y sign 24 h", RED),
        (6, 3, 950, "access_token", GRAY),
        (3, 2, 1025, "token usuario mensaje", GRAY),
        (2, 1, 1100, "200 JSON", GRAY),
        (1, 0, 1175, "localStorage y dashboard", BLUE),
    ]
    for a, b, y, label, color in messages:
        start = (xs[a], y)
        end = (xs[b], y)
        arrow(d, start, end, label, color=color, width=5, label_pos=((start[0] + end[0]) / 2, y - 28))
    d.rounded_rectangle((120, 1300, 2280, 1410), radius=18, fill="#F7F9FA", outline=LIGHT, width=3)
    d.text((155, 1330), "El frontend conserva la respuesta completa bajo la clave user. No existe un flujo de refresh del token.", font=font(26), fill=NAVY)
    im.save(OUT / "autenticacion.png", quality=95, dpi=(180, 180))


if __name__ == "__main__":
    save_architecture()
    save_er()
    save_auth()
