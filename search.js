// search.js
// Lógica de búsqueda de libros (carga inicial, filtrado local y fetch a Google Books)

import { renderLibros, renderCoincidencias, showError } from './ui.js';

console.log('[Search] search.js cargado');

const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Búsqueda estricta en Google Books por ISBN o consulta genérica.
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function fetchGoogleBooks(query) {
  console.log('[Search] fetchGoogleBooks ->', query);
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Books API returned ${res.status}`);
    const { items } = await res.json();
    return items || [];
  } catch (err) {
    console.error('[Search] fetchGoogleBooks error:', err);
    showError('No se pudieron obtener datos de Google Books.');
    return [];
  }
}

/**
 * Carga todos los libros ordenados por ID descendente.
 */
export async function loadAllBooks() {
  console.log('[Search] loadAllBooks -> iniciando');
  try {
    // 1) Traer libros con sólo los IDs de las relaciones
    const { data: librosRaw, error: librosErr } = await supabase
      .from('libros')
      .select('id, titol, autor_id, estanteria_id, saga_id')
      .order('id', { ascending: false });
    if (librosErr) throw librosErr;

    // 2) Traer datos de autores, estanterías y sagas
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

    // 3) Traer préstamos activos
    const libroIds = librosRaw.map(l => l.id);
    const { data: prestamos, error: prestErr } = await supabase
      .from('prestamos')
      .select('libro_id')
      .in('libro_id', libroIds)
      .eq('devuelto', false);
    if (prestErr) throw prestErr;

    // 4) Normalizar y combinar todo
    const librosFormateados = librosRaw.map(l => ({
      id: l.id,
      titol: l.titol,
      autor: autores.find(a => a.id === l.autor_id)?.nombre || 'N/A',
      estanteria: estanterias.find(e => e.id === l.estanteria_id)?.nombre || 'N/A',
      saga: sagas.find(s => s.id === l.saga_id)?.nombre || null,
      prestado: prestamos.some(p => p.libro_id === l.id),
      leido: false
    }));

    renderLibros(librosFormateados);
    console.log('[Search] loadAllBooks -> renderizados:', librosFormateados.length);
  } catch (err) {
    console.error('[Search] loadAllBooks error:', err);
    showError('Error al cargar la lista de libros.');
  }
}


/**
 * Filtra la lista mostrada según query (ISBN, título o autor).
 */
export function performSearch() {
  console.log('[Search] performSearch -> ejecutando');
  const input = document.getElementById('isbnInput');
  if (!input) return showError('Campo de búsqueda no encontrado');
  const q = input.value.trim().toLowerCase();

  // Si vacío, recargar lista completa
  if (!q) {
    console.log('[Search] campo vacío -> recargando lista');
    loadAllBooks();
    return;
  }

  try {
    const items = Array.from(document.querySelectorAll('#libros-lista .libro'));
    let count = 0;
    items.forEach(el => {
      const text = el.textContent.toLowerCase();
      const match = text.includes(q);
      el.style.display = match ? '' : 'none';
      if (match) count++;
    });
    console.log(`[Search] performSearch -> coincidencias: ${count}`);
  } catch (err) {
    console.error('[Search] performSearch error:', err);
    showError('Error al filtrar libros.');
  }
}

/**
 * Asocia el botón de búsqueda y la tecla Enter al filtrado.
 */
export function initSearch() {
  console.log('[Search] initSearch -> binding eventos');
  const input = document.getElementById('isbnInput');
  const btn = document.getElementById('searchBtn');
  if (input) {
    input.addEventListener('keyup', e => {
      if (e.key === 'Enter') performSearch();
    });
  }
  if (btn) {
    btn.addEventListener('click', performSearch);
  }
}

// Exponer globalmente
window.fetchGoogleBooks = fetchGoogleBooks;
window.loadAllBooks     = loadAllBooks;
window.performSearch    = performSearch;
window.initSearch       = initSearch;
