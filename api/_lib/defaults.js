// Datos iniciales: los mismos que trae la web. Se usan hasta que alguien guarda
// cambios desde el panel.

export const LINE_KEYS = ['auto', 'hogar', 'ropa', 'personal'];

export const SPACES = ['cocina', 'bano', 'pisos', 'vidrios', 'ropa', 'auto-ext', 'auto-int', 'motor', 'personal'];

export const ESTADOS = ['Nuevo', 'Cotizado', 'Pagado', 'Enviado', 'Entregado', 'Cancelado'];

const LIQ = ['1 L', 'Galón 4 L', 'Garrafa 20 L'];
const p = (id, line, name, use, sizes, spaces, scents = []) => ({ id, line, name, use, sizes, scents, spaces, img: '', active: true });

export const DEFAULT_CATALOG = {
  lines: {
    auto: { name: 'Cuidado Automotriz', badge: 'Auto', desc: 'Shampoo con cera, espuma activa, desengrasante para motor, pasta para interiores y aromatizantes.', img: 'img/linea-auto.webp' },
    hogar: { name: 'Cuidado del Hogar', badge: 'Hogar', desc: 'Limpiador multiusos, desengrasante con sosa, quita sarro, limpia vidrios y pastillas para WC.', img: 'img/linea-hogar.webp' },
    ropa: { name: 'Cuidado de la Ropa', badge: 'Textil', desc: 'Detergentes líquidos para ropa blanca, de color y oscura, más suavizante concentrado.', img: 'img/linea-ropa.webp' },
    personal: { name: 'Cuidado Personal', badge: 'Personal', desc: 'Jabón líquido humectante para manos y shampoo capilar con fragancia suave.', img: 'img/linea-personal.webp' }
  },
  products: [
    p('shampoo-cera', 'auto', 'Shampoo con cera', 'Lava y protege la pintura dejando un acabado brillante.', LIQ, ['auto-ext']),
    p('espuma-activa', 'auto', 'Espuma activa', 'Prelavado que afloja polvo y lodo antes del enjuague.', LIQ, ['auto-ext']),
    p('desengrasante-motor', 'auto', 'Desengrasante para motor', 'Retira grasa y aceite del motor y piezas metálicas.', LIQ, ['motor']),
    p('pasta-interiores', 'auto', 'Pasta para interiores Premium', 'Limpia y da brillo a tablero, vinil y plásticos.', ['250 g', '500 g', '1 kg'], ['auto-int']),
    p('aromatizante-auto', 'auto', 'Aromatizante para auto', 'Frescura duradera para la cabina en spray.', ['120 ml', '250 ml'], ['auto-int'], ['Brisa marina', 'Vainilla', 'Auto nuevo']),
    p('multiusos', 'hogar', 'Limpiador multiusos', 'Para pisos, mesas y superficies. Limpia y aromatiza.', LIQ, ['cocina', 'bano', 'pisos'], ['Lavanda', 'Brisa marina', 'Cítrico']),
    p('desengrasante-sosa', 'hogar', 'Desengrasante con sosa', 'Grasa pesada en estufas, campanas y parrillas. Usar con guantes.', LIQ, ['cocina']),
    p('quita-sarro', 'hogar', 'Quita sarro', 'Elimina sarro y manchas de agua en llaves, regaderas y azulejo.', LIQ, ['bano']),
    p('limpia-vidrios', 'hogar', 'Limpia vidrios', 'Ventanas, espejos y cristales del auto sin dejar marcas.', ['500 ml', '1 L', 'Galón 4 L'], ['vidrios', 'auto-int']),
    p('pastillas-wc', 'hogar', 'Pastillas para WC', 'Mantienen el inodoro limpio y fresco en cada descarga.', ['Paquete 4 pzas', 'Paquete 12 pzas'], ['bano']),
    p('detergente-blanca', 'ropa', 'Detergente ropa blanca', 'Blancos más brillantes sin maltratar la fibra.', LIQ, ['ropa']),
    p('detergente-color', 'ropa', 'Detergente ropa de color', 'Cuida los colores lavada tras lavada.', LIQ, ['ropa']),
    p('detergente-negra', 'ropa', 'Detergente ropa negra', 'Mantiene el negro intenso y evita el deslavado.', LIQ, ['ropa']),
    p('suavizante', 'ropa', 'Suavizante concentrado', 'Telas suaves y perfumadas; rinde más por medida.', LIQ, ['ropa'], ['Floral', 'Bebé', 'Brisa marina']),
    p('jabon-manos', 'personal', 'Jabón líquido para manos', 'Fórmula humectante con aroma perfumado. Ideal para uso frecuente.', ['500 ml', '1 L', 'Galón 4 L'], ['personal', 'bano']),
    p('shampoo-capilar', 'personal', 'Shampoo capilar', 'Limpieza suave con extractos y fragancia ligera.', ['500 ml', '1 L'], ['personal'])
  ]
};

export const DEFAULT_CONFIG = {
  whatsapp: '527441709130',
  telefono: '+52 744 170 9130',
  instagram: 'espumar.mx',
  email: '',
  heroPill: 'Cuidado y Pureza',
  heroSubtitle: 'Fórmulas concentradas de alto rendimiento para el cuidado automotriz, del hogar, de la ropa y personal.',
  anuncio: { activo: false, texto: '' }
};
