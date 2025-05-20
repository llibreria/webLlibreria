// search.js
// Lógica de búsqueda de libros (carga inicial y filtrado por ISBN, título o autor)

import { renderLibros, renderCoincidencias, showError } from './ui.js';

console.log('[Search] search.js cargado');

const supabase = window.supabase.createClient(
  'https://vrbheaswtkheyxswnhrp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o'
);

/**
 * Carga y muestra todos los libros ordenados por ID descendente.
 */
export async function loadAllBooks() {
  console.log('[Search] loadAllBooks -> iniciando');
  try {
    const { data: libros, error } = await supabase
      .from('libros')
      .select(`
        id,
        titol,
        autor:autor_id (id, nombre),
        estanteria:estanteria_id (id, nombre),
        saga:saga_id (id, nombre)
      `)
      .order('id', { ascending: false });

    if (error) throw error;

    // Obtener préstamos activos
    const libroIds = libros.map(l => l.id);
    const { data: prestamos, error: prestErr } = await supabase
      .from('prestamos')
      .select('libro_id, devuelto')
      .in('libro_id', libroIds)
      .eq('devuelto', false);

    if (prestErr) throw prestErr;

    // Formatear libros
    const librosFormateados = libros.map(libro => {
      const prestado = prestamos.some(p => p.libro_id === libro.id);
      return {
        ...libro,
        autor: libro.autor?.nombre || 'N/A',
        estanteria: libro.estanteria?.nombre || 'N/A',
        saga: libro.saga?.nombre || null,
        leido: false,
        prestado
      };
    });

    renderLibros(librosFormateados);
    console.log('[Search] loadAllBooks -> libros renderizados:', librosFormateados.length);
  } catch (err) {
    console.error('[Search] loadAllBooks -> error:', err);
    showError('Error al cargar libros.');
  }
}

/**
 * Realiza la búsqueda en local y muestra coincidencias en las secciones.
 */
export async function performSearch() {
  console.log('[Search] performSearch -> ejecutando');
  const input = document.getElementById('isbnInput');
  const query = input?.value.trim().toLowerCase();

  if (!query) {
    console.log('[Search] vacío -> recargando');
    loadAllBooks();
    return;
  }

  try {
    const [{ data: libros }, { data: autores }] = await Promise.all([
      supabase.from('libros').select('id, titol, autor_id, isbn'),
      supabase.from('autores').select('id, nombre')
    ]);

    const librosConAutor = libros.map(libro => ({
      ...libro,
      autor: autores.find(a => a.id === libro.autor_id)?.nombre?.toLowerCase() || 'desconocido'
    }));

    const matchesByISBN = librosConAutor.filter(l => l.isbn?.includes(query));
    const matchesByTitle = librosConAutor.filter(l => l.titol?.toLowerCase().includes(query));
    const matchesByAuthor = librosConAutor.filter(l => l.autor?.includes(query));

    renderCoincidencias('isbnResults', matchesByISBN, 'No hay coincidencias por ISBN.');
    renderCoincidencias('titleResults', matchesByTitle, 'No hay coincidencias por título.');
    renderCoincidencias('authorResults', matchesByAuthor, 'No hay coincidencias por autor.');

    console.log('[Search] performSearch -> terminado');
  } catch (err) {
    console.error('[Search] performSearch -> error', err);
    showError('Error al buscar libros.');
  }
}

/**
 * Asocia el botón de búsqueda al evento click.
 */
export function initSearch() {
  console.log('[Search] initSearch -> binding botón');
  const btn = document.getElementById('searchBtn');
  if (!btn) {
    console.warn('[Search] initSearch -> botón no encontrado');
    return;
  }
  btn.addEventListener('click', performSearch);
}

// Exponer globalmente por si se invoca desde HTML
window.loadAllBooks = loadAllBooks;
window.performSearch = performSearch;
window.initSearch = initSearch;
