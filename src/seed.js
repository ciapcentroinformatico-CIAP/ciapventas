/**
 * CIAP Informática - Datos iniciales
 * Se cargan en MongoDB la primera vez (colecciones vacías). Después, los datos se editan en la base.
 * Sin MONGODB_URI el servidor muestra estos mismos datos, sin guardar nada.
 */
module.exports = {
    marca: {
        nombre: 'CIAP',
        subtitulo: 'Informática',
    },

    contacto: {
        // Número de WhatsApp con código de país, sin "+" ni espacios
        whatsapp: '51999999999',
        telefono: '(01) 999 999 999',
        email: 'ventas@ciap.pe',
        direccion: 'Av. Principal 123, Lima',
        horario: 'Lun a Sáb · 9:00 a 19:00',
    },

    moneda: 'S/',

    portada: {
        etiqueta: 'Tecnología y soporte en un solo lugar',
        titulo: 'Equipos que rinden.',
        resaltado: 'Servicio que responde.',
        texto: 'Laptops, computadoras, componentes y redes con garantía real, más un taller técnico propio para instalar, reparar y mantener todo lo que vendemos.',
    },

    nosotros: {
        titulo: 'Más de una década acercando la tecnología a las personas',
        texto: 'Somos una tienda de informática con taller propio. Empezamos reparando computadoras y hoy equipamos hogares, estudiantes y empresas con productos originales y asesoría honesta.\n\nNo vendemos por vender: primero entendemos para qué necesitas el equipo y luego te recomendamos la opción que mejor rinde para tu presupuesto.',
    },

    estadisticas: [
        { numero: '12+', texto: 'años de experiencia' },
        { numero: '8 mil', texto: 'equipos atendidos' },
        { numero: '24 h', texto: 'respuesta de soporte' },
    ],

    beneficios: [
        { icono: 'shield', titulo: 'Garantía real', texto: 'Hasta 3 años con respaldo de marca' },
        { icono: 'truck', titulo: 'Envíos a todo el país', texto: 'Entrega en 24–72 horas' },
        { icono: 'wrench', titulo: 'Taller propio', texto: 'Técnicos certificados' },
        { icono: 'card', titulo: 'Pago seguro', texto: 'Tarjeta, transferencia o Yape' },
    ],

    valores: [
        { icono: 'check', titulo: 'Productos originales', texto: 'Trabajamos solo con distribuidores autorizados y entregamos comprobante y garantía en cada venta.' },
        { icono: 'headset', titulo: 'Asesoría antes y después', texto: 'Te ayudamos a elegir y seguimos disponibles cuando necesites instalar, ampliar o reparar.' },
        { icono: 'wrench', titulo: 'Servicio técnico propio', texto: 'El mismo equipo que te vende es el que responde: sin terceros ni esperas innecesarias.' },
    ],

    categorias: [
        { slug: 'laptops', nombre: 'Laptops', icono: 'laptop' },
        { slug: 'computadoras', nombre: 'Computadoras', icono: 'desktop' },
        { slug: 'componentes', nombre: 'Componentes', icono: 'cpu' },
        { slug: 'perifericos', nombre: 'Periféricos', icono: 'keyboard' },
        { slug: 'redes', nombre: 'Redes', icono: 'wifi' },
        { slug: 'impresoras', nombre: 'Impresoras', icono: 'printer' },
    ],

    // precioAntes y etiqueta son opcionales. stock 0 = agotado.
    productos: [
        { id: 1, nombre: 'Laptop Lenovo IdeaPad Slim 3', categoria: 'laptops', precio: 2199, precioAntes: 2499, etiqueta: 'Oferta', destacado: true, stock: 8,
          descripcion: 'Liviana y rápida para estudio y oficina, con pantalla antirreflejo y batería para toda la jornada.',
          specs: ['Ryzen 5 7520U', '16 GB RAM', 'SSD 512 GB', '15.6" Full HD'] },
        { id: 2, nombre: 'Laptop HP Victus 15 Gaming', categoria: 'laptops', precio: 3899, etiqueta: 'Nuevo', destacado: true, stock: 4,
          descripcion: 'Potencia para jugar y editar: gráfica dedicada, pantalla de 144 Hz y refrigeración mejorada.',
          specs: ['Core i5-13420H', 'RTX 4050 6 GB', '16 GB RAM', 'SSD 512 GB'] },
        { id: 3, nombre: 'Laptop ASUS Vivobook 14', categoria: 'laptops', precio: 1699, stock: 10,
          descripcion: 'Compacta y económica, ideal para clases, navegación y ofimática.',
          specs: ['Core i3-1215U', '8 GB RAM', 'SSD 256 GB', '14" Full HD'] },
        { id: 4, nombre: 'PC Gamer CIAP Titan', categoria: 'computadoras', precio: 4599, etiqueta: 'Armada aquí', destacado: true, stock: 3,
          descripcion: 'Equipo armado y probado en nuestro taller, listo para jugar en 1080p y 1440p.',
          specs: ['Ryzen 5 7600', 'RTX 4060 8 GB', '32 GB DDR5', 'SSD NVMe 1 TB'] },
        { id: 5, nombre: 'PC de Oficina CIAP Office', categoria: 'computadoras', precio: 1499, stock: 12,
          descripcion: 'Silenciosa y confiable para oficina, facturación y trabajo administrativo.',
          specs: ['Core i3-12100', '8 GB RAM', 'SSD 480 GB', 'Windows 11 Pro'] },
        { id: 6, nombre: 'Mini PC Intel N100', categoria: 'computadoras', precio: 899, precioAntes: 999, etiqueta: 'Oferta', stock: 6,
          descripcion: 'Del tamaño de un libro: perfecta para puntos de venta, TV o escritorios pequeños.',
          specs: ['Intel N100', '16 GB RAM', 'SSD 512 GB', 'WiFi 6'] },
        { id: 7, nombre: 'SSD Kingston NV2 1 TB NVMe', categoria: 'componentes', precio: 269, destacado: true, stock: 25,
          descripcion: 'Acelera el arranque y la carga de programas. Instalación disponible en tienda.',
          specs: ['M.2 2280', 'PCIe 4.0', '3500 MB/s lectura'] },
        { id: 8, nombre: 'Memoria RAM Corsair Vengeance 16 GB', categoria: 'componentes', precio: 189, stock: 18,
          descripcion: 'Memoria de alto rendimiento con disipador para equipos de escritorio.',
          specs: ['DDR4 3200 MHz', 'CL16', 'Disipador de aluminio'] },
        { id: 9, nombre: 'Tarjeta de video MSI RTX 4060 Ventus', categoria: 'componentes', precio: 1549, stock: 5,
          descripcion: 'Gráfica eficiente para juegos en alta calidad y edición de video.',
          specs: ['8 GB GDDR6', 'DLSS 3', '2 ventiladores'] },
        { id: 10, nombre: 'Fuente de poder Gigabyte 650 W', categoria: 'componentes', precio: 279, stock: 0,
          descripcion: 'Fuente certificada con protecciones completas para tu equipo.',
          specs: ['80 Plus Bronze', 'Cables planos', 'Ventilador 120 mm'] },
        { id: 11, nombre: 'Monitor LG UltraGear 24"', categoria: 'perifericos', precio: 649, precioAntes: 749, etiqueta: 'Oferta', destacado: true, stock: 9,
          descripcion: 'Imagen fluida y colores precisos para jugar y trabajar.',
          specs: ['IPS Full HD', '144 Hz', '1 ms', 'FreeSync'] },
        { id: 12, nombre: 'Teclado mecánico Redragon Kumara', categoria: 'perifericos', precio: 159, stock: 20,
          descripcion: 'Teclado compacto y resistente con iluminación configurable.',
          specs: ['Switch Red', 'Formato TKL', 'RGB', 'Español'] },
        { id: 13, nombre: 'Mouse Logitech G203 Lightsync', categoria: 'perifericos', precio: 89, stock: 30,
          descripcion: 'Mouse preciso y liviano, un clásico para jugar y para el día a día.',
          specs: ['8000 DPI', '6 botones', 'RGB'] },
        { id: 14, nombre: 'Router TP-Link Archer AX23 WiFi 6', categoria: 'redes', precio: 229, etiqueta: 'Nuevo', destacado: true, stock: 14,
          descripcion: 'Más velocidad y más dispositivos conectados sin cortes.',
          specs: ['AX1800', 'Doble banda', '4 puertos Gigabit'] },
        { id: 15, nombre: 'Switch TP-Link 8 puertos Gigabit', categoria: 'redes', precio: 99, stock: 22,
          descripcion: 'Amplía tu red cableada en segundos, sin configuración.',
          specs: ['8 puertos 10/100/1000', 'Carcasa metálica', 'Plug & Play'] },
        { id: 16, nombre: 'Impresora Epson EcoTank L3250', categoria: 'impresoras', precio: 799, destacado: true, stock: 7,
          descripcion: 'Multifuncional de tinta continua con el menor costo por página.',
          specs: ['Imprime, copia y escanea', 'WiFi', 'Tinta continua original'] },
        { id: 17, nombre: 'Impresora láser Brother HL-1212W', categoria: 'impresoras', precio: 549, stock: 5,
          descripcion: 'Láser monocromática compacta para documentos nítidos y rápidos.',
          specs: ['20 ppm', 'WiFi', 'Tóner de 1000 páginas'] },
    ],

    servicios: [
        { id: 'reparacion', nombre: 'Reparación y mantenimiento', icono: 'wrench', desde: 50,
          texto: 'Limpieza interna, cambio de pasta térmica, pantallas, teclados, bisagras y placas.',
          incluye: ['Diagnóstico en 24 h', 'Garantía de 90 días'] },
        { id: 'armado', nombre: 'Armado de PC a medida', icono: 'cpu', desde: 80,
          texto: 'Elegimos contigo cada componente y armamos tu equipo con cableado limpio y pruebas de estrés.',
          incluye: ['Asesoría de componentes', 'Windows y drivers listos'] },
        { id: 'redes', nombre: 'Redes y WiFi', icono: 'wifi', desde: 120,
          texto: 'Cableado estructurado, puntos de red, repetidores y configuración de routers para casa u oficina.',
          incluye: ['Visita técnica', 'Cobertura sin zonas muertas'] },
        { id: 'software', nombre: 'Software y antivirus', icono: 'shield', desde: 40,
          texto: 'Formateo, instalación de sistema operativo, programas, licencias y eliminación de virus.',
          incluye: ['Respaldo de tus archivos', 'Licencias originales'] },
        { id: 'datos', nombre: 'Recuperación de datos', icono: 'cloud', desde: 150,
          texto: 'Rescatamos información de discos dañados, memorias USB y equipos que ya no encienden.',
          incluye: ['Evaluación previa', 'Solo pagas si recuperamos'] },
        { id: 'empresas', nombre: 'Soporte para empresas', icono: 'server', desde: 250,
          texto: 'Mantenimiento mensual, soporte remoto y presencial, servidores y copias de seguridad.',
          incluye: ['Plan mensual', 'Atención prioritaria'] },
    ],
};
