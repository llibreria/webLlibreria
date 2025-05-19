
// ─── api.js ───
/** Puntos de diagnóstico para import de Supabase UMD */
console.log('[API] api.js cargado');
console.log('[API] window.supabase disponible:', !!window.supabase);

const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o'; // sigue recomendando .env en producción

// Inicializar cliente desde UMD global
let supabase;
try {
  if (!window.supabase) throw new Error('window.supabase no está definido');
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('[API] Cliente Supabase inicializado correctamente');
} catch (err) {
  console.error('[API] Error al inicializar Supabase client:', err);
}

/**
 * Obtiene todos los libros con datos de autor, estantería y saga.
 */
export async function fetchLibros() {
  console.log('[api] fetchLibros: iniciando');
  try {
    const { data, error } = await supabase
      .from('libros')
      .select(`
        id,
        titol,
        isbn,
        autor:autor_id (id, nombre),
        estanteria:estanteria_id (id, nombre),
        saga:saga_id (id, nombre)
      `)
      .order('id', { ascending: false });

    if (error) throw error;
    console.log('[api] fetchLibros: OK, registros obtenidos=', data.length);
    return data;
  } catch (err) {
    console.error('[api] fetchLibros: ERROR ->', err.message);
    throw err;
  }
}

/**
 * Obtiene préstamos activos (no devueltos) para una lista de IDs de libros.
 */
export async function fetchPrestamosActivos(libroIds) {
  console.log('[api] fetchPrestamosActivos: ids=', libroIds);
  try {
    const { data, error } = await supabase
      .from('prestamos')
      .select('id, libro_id, quien, cuando, devuelto')
      .in('libro_id', libroIds)
      .eq('devuelto', false);

    if (error) throw error;
    console.log('[api] fetchPrestamosActivos: OK, prestamos=', data.length);
    return data;
  } catch (err) {
    console.error('[api] fetchPrestamosActivos: ERROR ->', err.message);
    throw err;
  }
}

/**
 * Marca un préstamo como devuelto.
 */
export async function updatePrestamoDevuelto(prestamoId) {
  console.log('[api] updatePrestamoDevuelto: id=', prestamoId);
  try {
    const { data, error } = await supabase
      .from('prestamos')
      .update({ devuelto: true })
      .eq('id', prestamoId);

    if (error) throw error;
    console.log('[api] updatePrestamoDevuelto: OK');
    return data;
  } catch (err) {
    console.error('[api] updatePrestamoDevuelto: ERROR ->', err.message);
    throw err;
  }
}

/**
 * Inserta un nuevo préstamo.
 */
export async function insertPrestamo(libroId, quien) {
  console.log('[api] insertPrestamo: libroId=', libroId, 'quien=', quien);
  try {
    const { data, error } = await supabase
      .from('prestamos')
      .insert([{ libro_id: libroId, quien, devuelto: false }]);

    if (error) throw error;
    console.log('[api] insertPrestamo: OK');
    return data;
  } catch (err) {
    console.error('[api] insertPrestamo: ERROR ->', err.message);
    throw err;
  }
}

/**
 * Upsert de autor (por nombre), devuelve ID.
 */
export async function upsertAutor(nombre) {
  console.log('[api] upsertAutor: nombre=', nombre);
  try {
    const { data, error } = await supabase
      .from('autores')
      .upsert([{ nombre }], { onConflict: ['nombre'], returning: 'representation' });

    if (error) throw error;
    console.log('[api] upsertAutor: OK, id=', data[0].id);
    return data[0];
  } catch (err) {
    console.error('[api] upsertAutor: ERROR ->', err.message);
    throw err;
  }
}

/**
 * Inserta un nuevo libro.
 */
export async function insertLibro({ titol, isbn, autor_id, estanteria_id, saga_id = null }) {
  console.log('[api] insertLibro: ', { titol, isbn, autor_id, estanteria_id, saga_id });
  try {
    const { data, error } = await supabase
      .from('libros')
      .insert([{ titol, isbn, autor_id, estanteria_id, saga_id }]);

    if (error) throw error;
    console.log('[api] insertLibro: OK, id=', data[0].id);
    return data[0];
  } catch (err) {
    console.error('[api] insertLibro: ERROR ->', err.message);
    throw err;
  }
}

/**
 * Obtiene lista de autores.
 */
export async function fetchAutores() {
  console.log('[api] fetchAutores: iniciando');
  try {
    const { data, error } = await supabase.from('autores').select('id, nombre');
    if (error) throw error;
    console.log('[api] fetchAutores: OK, count=', data.length);
    return data;
  } catch (err) {
    console.error('[api] fetchAutores: ERROR ->', err.message);
    throw err;
  }
}

/**
 * Obtiene lista de estanterías.
 */
export async function fetchEstanterias() {
  console.log('[api] fetchEstanterias: iniciando');
  try {
    const { data, error } = await supabase.from('estanterias').select('id, nombre');
    if (error) throw error;
    console.log('[api] fetchEstanterias: OK, count=', data.length);
    return data;
  } catch (err) {
    console.error('[api] fetchEstanterias: ERROR ->', err.message);
    throw err;
  }
}

/**
 * Busca libros en Google Books API según query.
 */
export async function fetchGoogleBooks(query) {
  console.log('[api] fetchGoogleBooks: query=', query);
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GoogleBooks HTTP ${res.status}`);
    const json = await res.json();
    console.log('[api] fetchGoogleBooks: OK, items=', json.items?.length || 0);
    return json.items || [];
  } catch (err) {
    console.error('[api] fetchGoogleBooks: ERROR ->', err.message);
    throw err;
  }
}

/**
 * Obtiene el detalle del préstamo activo para un libro dado.
 * @param {number|string} libroId
 * @returns {Promise<Object>} datos del préstamo: { id, quien, cuando }
 */
export async function fetchPrestamoDetalle(libroId) {
  console.log('[API] fetchPrestamoDetalle -> libroId:', libroId);
  try {
    const { data, error } = await supabase
      .from('prestamos')
      .select('id, quien, cuando')
      .eq('libro_id', libroId)
      .eq('devuelto', false)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[API] fetchPrestamoDetalle -> error', err);
    throw err;
  }
}

/**
 * Inserta un nuevo préstamo para un libro.
 * @param {{ libroId: number|string, quien: string }} param0
 */
export async function createLoan({ libroId, quien }) {
  console.log('[API] createLoan ->', { libroId, quien });
  try {
    const { error } = await supabase
      .from('prestamos')
      .insert([{ libro_id: libroId, quien, devuelto: false }]);
    if (error) throw error;
  } catch (err) {
    console.error('[API] createLoan -> error', err);
    throw err;
  }
}

/**
 * Marca un préstamo como devuelto.
 * @param {number|string} prestamoId
 */
export async function markLoanReturned(prestamoId) {
  console.log('[API] markLoanReturned -> prestamoId:', prestamoId);
  try {
    const { error } = await supabase
      .from('prestamos')
      .update({ devuelto: true })
      .eq('id', prestamoId);
    if (error) throw error;
  } catch (err) {
    console.error('[API] markLoanReturned -> error', err);
    throw err;
  }
}

