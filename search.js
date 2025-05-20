// search.js
// Lógica de búsqueda de libros (local y en Google Books)

import { renderCoincidencias, renderGoogleResults, showError } from './ui.js';

console.log('[Search] search.js cargado');

const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Búsqueda en Google Books.
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function fetchGoogleBooks(query) {
  console.log('[Search] fetchGoogleBooks ->', query);
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Books API: ${res.status}`);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error('[Search] fetchGoogleBooks -> error', err);
    showError('No se pudieron obtener resultados de Google Books.');
    return [];
  }
}

/**
 * Ejecuta la búsqueda de libros: limpia lista principal y muestra resultados.
 */
export async function searchBooks() {
  console.log('[Search] searchBooks -> iniciando');

  // 0) Limpiar lista principal
  const lista = document.getElementById('libros-lista');
  if (lista) lista.textContent = '';

  // 1) Leer y validar query
  const inputEl = document.getElementById('isbnInput');
  if (!inputEl) {
    showError('Campo de búsqueda no encontrado');
    return;
  }
  const query = inputEl.value.trim().toLowerCase();

  // 2) Si vacía, recargar lista original
  if (!query) {
    console.log('[Search] searchBooks -> campo vacío, recargando lista');
    if (window.initApp) window.initApp();
    return;
  }

  try {
    // 3) Búsqueda local en Supabase
    console.log('[Search] query local:', query);
    const [librosRes, autoresRes] = await Promise.all([
      supabase.from('libros').select('id, titol, autor_id, isbn'),
      supabase.from('autores').select('id, nombre')
    ]);
    const { data: libros, error: librosErr } = librosRes;
    const { data: autores, error: autoresErr } = autoresRes;
    if (librosErr) throw librosErr;
    if (autoresErr) throw autoresErr;

    const librosConAutor = libros.map(libro => ({
      ...libro,
      autor: autores.find(a => a.id === libro.autor_id)?.nombre?.toLowerCase() || 'desconocido'
    }));

    // 4) Filtrar coincidencias locales
    const matchesByISBN = librosConAutor.filter(l => l.isbn?.includes(query));
    const matchesByTitle = librosConAutor.filter(l => l.titol.toLowerCase().includes(query));
    const matchesByAuthor = librosConAutor.filter(l => l.autor.includes(query));

    renderCoincidencias('isbnResults', matchesByISBN, 'No hay coincidencias por ISBN.');
    renderCoincidencias('titleResults', matchesByTitle, 'No hay coincidencias por título.');
    renderCoincidencias('authorResults', matchesByAuthor, 'No hay coincidencias por autor.');

    // 5) Búsqueda externa en Google Books
    const isISBN = /^\d{10,13}$/.test(query);
    if (isISBN && matchesByISBN.length === 0) {
      console.log('[Search] ISBN válido, buscando en Google Books...');
      const items = await fetchGoogleBooks(`isbn:${query}`);
      renderGoogleResults(items, 'googleISBNResults');
    } else if (!isISBN) {
      console.log('[Search] búsqueda externa general:', query);
      const items = await fetchGoogleBooks(query);
      renderGoogleResults(items, 'googleOtherResults');
    }

    console.log('[Search] searchBooks -> finalizado');
  } catch (err) {
    console.error('[Search] searchBooks -> error', err);
    showError(err.message);
  }
}

// Exponer globalmente para el onclick inline
window.searchBooks = searchBooks;
