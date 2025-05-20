// search.js
// Lógica de búsqueda de libros (carga inicial y filtrado por ISBN, título o autor)

import { renderLibros, showError } from './ui.js';

console.log('[Search] search.js cargado');

const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Carga y muestra todos los libros ordenados por ID descendente,
 * con autor, estantería y saga correctamente resueltos.
 */
export async function loadAllBooks() {
  console.log('[Search] loadAllBooks -> iniciando');
  try {
    // 1) Traer libros con IDs de relación
    const { data: librosRaw, error: librosErr } = await supabase
      .from('libros')
      .select('id, titol, isbn, autor_id, estanteria_id, saga_id')
      .order('id', { ascending: false });
    if (librosErr) throw librosErr;
    console.log('[Search] librosRaw:', librosRaw.length);

    // 2) Traer tablas relacionadas
    const [
      { data: autores, error: autorErr },
      { data: estanterias, error: estErr },
      { data: sagas, error: sagaErr }
    ] = await Promise.all([
      supabase.from('autores').select('id, nombre'),
      supabase.from('estanterias').select('id, nombre'),
      supabase.from('sagas').select('id, nombre')
    ]);
    if (autorErr || estErr || sagaErr) throw autorErr || estErr || sagaErr;
    console.log('[Search] autores/estanterias/sagas cargados');

    // 3) Traer préstamos activos
    const ids = librosRaw.map(l => l.id);
    const { data: prestamos, error: prestErr } = await supabase
      .from('prestamos')
      .select('libro_id')
      .in('libro_id', ids)
      .eq('devuelto', false);
    if (prestErr) throw prestErr;
    console.log('[Search] prestamos activos:', prestamos.length);

    // 4) Normalizar y renderizar
    const librosFormateados = librosRaw.map(l => {
      const autorObj = autores.find(a => a.id === l.autor_id);
      const estObj   = estanterias.find(e => e.id === l.estanteria_id);
      const sagaObj  = sagas.find(s => s.id === l.saga_id);
      return {
        id:         l.id,
        titol:      l.titol,
        isbn:       l.isbn,
        autor:      autorObj   ? autorObj.nombre   : 'N/A',
        estanteria: estObj     ? estObj.nombre     : 'N/A',
        saga:       sagaObj    ? sagaObj.nombre    : null,
        prestado:   prestamos.some(p => p.libro_id === l.id),
        leido:      false
      };
    });

    renderLibros(librosFormateados);
    console.log('[Search] loadAllBooks -> renderizados:', librosFormateados.length);
  } catch (err) {
    console.error('[Search] loadAllBooks error:', err);
    showError('Error al cargar la lista de libros.');
  }
}

/**
 * Filtra los libros ya renderizados, buscando coincidencias en ISBN, título o autor.
 * Este es tu 'searchBooks' global.
 */
export function searchBooks() {
  console.log('[Search] searchBooks -> iniciando');
  const input = document.getElementById('isbnInput');
  if (!input) {
    return showError('Campo de búsqueda no encontrado');
  }
  const q = input.value.trim().toLowerCase();

  // Si el campo está vacío, recarga todo
  if (!q) {
    console.log('[Search] campo vacío -> recargando lista');
    loadAllBooks();
    return;
  }

  // Filtrado en el DOM
  const items = document.querySelectorAll('#libros-lista .libro');
  let matchCount = 0;
  items.forEach(el => {
    const text = el.textContent.toLowerCase();
    const matches = text.includes(q);
    el.style.display = matches ? '' : 'none';
    if (matches) matchCount++;
  });
  console.log(`[Search] searchBooks -> coincidencias: ${matchCount}`);
}

/**
 * Asocia el evento click del botón de búsqueda (inline o con id).
 */
export function initSearch() {
  console.log('[Search] initSearch -> binding botón');
  const btnInline = document.querySelector('[onclick="searchBooks()"]');
  const btnId     = document.getElementById('searchBtn');
  if (btnInline) btnInline.addEventListener('click', searchBooks);
  if (btnId)     btnId.addEventListener('click', searchBooks);
}

// Exponer globalmente para que tu onclick inline funcione
window.loadAllBooks = loadAllBooks;
window.searchBooks   = searchBooks;
window.initSearch    = initSearch;
