// search.js
// -----------------------------------------------------------------------------
// Lógica de búsqueda de libros: carga inicial, filtrado local y búsquedas externas
// -----------------------------------------------------------------------------

import {
  renderLibros,
  renderCoincidencias,
  displayGoogleResults,
  showAlert,
  showError
} from './ui.js';

console.log('[Search] search.js cargado');

// Si ya tienes un cliente global inicializado en api.js, puedes importarlo;
// si no, creamos uno localmente con window.supabase:
const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * 1) Carga todos los libros con sus detalles y los renderiza
 */
export async function loadAllBooks() {
  console.log('[Search] loadAllBooks → comenzando');
  try {
    // 1.1) Traer libros con relaciones anidadas
    const { data: libros, error: librosErr } = await supabase
      .from('libros')
      .select(`
        id,
        titol,
        isbn,
        autor:autor_id (nombre),
        estanteria:estanteria_id (nombre),
        saga:saga_id (nombre)
      `)
      .order('id', { ascending: false });
    if (librosErr) throw librosErr;
    console.log(`[Search] cargarLibros → recibidos ${libros.length} registros`);

    // 1.2) Traer préstamos no devueltos
    const libroIds = libros.map(l => l.id);
    const { data: prestamos, error: prestErr } = await supabase
      .from('prestamos')
      .select('libro_id')
      .in('libro_id', libroIds)
      .eq('devuelto', false);
    if (prestErr) throw prestErr;

    // 1.3) Normalizar estructura
    const lista = libros.map(l => ({
      id:         l.id,
      titol:      l.titol,
      isbn:       l.isbn,
      autor:      l.autor?.nombre      || 'N/A',
      estanteria: l.estanteria?.nombre || 'N/A',
      saga:       l.saga?.nombre       || null,
      prestado:   prestamos.some(p => p.libro_id === l.id),
      leido:      false
    }));

    // 1.4) Renderizar
    renderLibros(lista);
    console.log('[Search] loadAllBooks → render completado');
  } catch (err) {
    console.error('[Search] loadAllBooks error:', err);
    showError('No se pudieron cargar los libros.');
  }
}

/**
 * 2) Busca coincidencias en ISBN, título o autor entre los libros ya renderizados.
 *    Si el input está vacío, recarga todo el catálogo.
 */
export function searchBooks() {
  console.log('[Search] searchBooks → iniciando');
  const q = document.getElementById('isbnInput')?.value.trim().toLowerCase() || '';

  // limpiar resultados anteriores
  ['isbnResults', 'titleResults', 'authorResults'].forEach(id => {
    const cont = document.getElementById(id);
    if (cont) cont.innerHTML = '';
  });
  // ocultar lista principal durante búsqueda
  const listaPrincipal = document.getElementById('libros-lista');
  if (listaPrincipal) listaPrincipal.innerHTML = '';

  if (!q) {
    console.log('[Search] searchBooks → query vacía, recargando todo');
    loadAllBooks();
    return;
  }

  ;(async () => {
    try {
      // 2.1) Obtener todos los libros básicos + autores
      const [{ data: libros }, { data: autores }] = await Promise.all([
        supabase.from('libros').select('id, titol, isbn, autor_id'),
        supabase.from('autores').select('id, nombre')
      ]);

      // 2.2) Mapear autor al libro
      const librosConAutor = libros.map(b => ({
        ...b,
        autor: autores.find(a => a.id === b.autor_id)?.nombre.toLowerCase() || 'desconocido'
      }));

      // 2.3) Encontrar coincidencias
      const matchesByISBN   = librosConAutor.filter(l => l.isbn?.toLowerCase().includes(q));
      const matchesByTitle  = librosConAutor.filter(l => l.titol.toLowerCase().includes(q));
      const matchesByAuthor = librosConAutor.filter(l => l.autor.includes(q));

      // 2.4) Si ISBN exacto ya existe, alertar y mostrarlo
      const exact = librosConAutor.find(l => l.isbn?.toLowerCase() === q);
      if (exact) {
        showAlert('Ya tienes este libro en tu colección.');
        renderCoincidencias('isbnResults', [exact], '');
        return;
      }

      // 2.5) Render coincidencias locales
      renderCoincidencias('isbnResults', matchesByISBN, 'No hay coincidencias por ISBN.');
      renderCoincidencias('titleResults', matchesByTitle, 'No hay coincidencias por título.');
      renderCoincidencias('authorResults', matchesByAuthor, 'No hay coincidencias por autor.');

      // 2.6) Si la búsqueda es un ISBN y no hay matches, buscar en Google Books
      const isISBN = /^\d{10,13}$/.test(q);
      if (isISBN && matchesByISBN.length === 0) {
        console.log('[Search] ISBN válido sin matches → Google Books');
        const items = await fetchGoogleBooks(`isbn:${q}`);
        displayGoogleResults(items, 'googleISBNResults');
      }

      // 2.7) Si no es ISBN, búsqueda externa genérica
      if (!isISBN) {
        console.log('[Search] búsqueda genérica en Google Books');
        const items = await fetchGoogleBooks(q);
        displayGoogleResults(items, 'googleOtherResults');
      }

      console.log('[Search] searchBooks → finalizado');
    } catch (err) {
      console.error('[Search] searchBooks error:', err);
      showError('Error al buscar libros.');
    }
  })();
}

/**
 * 3) Consulta externa a Google Books
 */
export async function fetchGoogleBooks(query) {
  console.log('[Search] fetchGoogleBooks →', query);
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Google API ${res.status}`);
    const { items } = await res.json();
    return items || [];
  } catch (err) {
    console.error('[Search] fetchGoogleBooks error:', err);
    showError('No se pudieron obtener resultados externos.');
    return [];
  }
}

/**
 * 4) Inicialización: ligar botón y tecla Enter a searchBooks
 */
export function initSearch() {
  console.log('[Search] initSearch → bind eventos');
  const input = document.getElementById('isbnInput');
  const btn   = document.getElementById('searchBtn');
  input?.addEventListener('keyup', e => { if (e.key === 'Enter') searchBooks(); });
  btn  ?.addEventListener('click', searchBooks);
}

// Exponer globalmente para onclick inline y otros módulos
window.loadAllBooks    = loadAllBooks;
window.searchBooks     = searchBooks;
window.fetchGoogleBooks= fetchGoogleBooks;
window.initSearch      = initSearch;
