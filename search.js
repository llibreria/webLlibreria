// search.js
// Lógica de búsqueda de libros (local y en Google Books)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@1.35.1/+esm';
import { renderCoincidencias, renderGoogleResults, showAlert, showError } from './ui.js';

const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o'; // considera usar variables de entorno
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Obtiene datos de Google Books para una consulta.
 * @param {string} query - Término de búsqueda
 * @returns {Promise<Array>} Lista de items de Google Books
 */
async function fetchGoogleBooks(query) {
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
 * Ejecuta la búsqueda de libros: local y externa.
 */
export async function searchBooks() {
  console.log('[Search] searchBooks -> iniciando');
  try {
    const inputEl = document.getElementById('isbnInput');
    if (!inputEl) throw new Error('Campo de búsqueda no encontrado');
    const query = inputEl.value.trim().toLowerCase();

    // Contenedores de resultados
    const containers = {
      isbn: 'isbnResults',
      title: 'titleResults',
      author: 'authorResults',
      googleISBN: 'googleISBNResults',
      googleOther: 'googleOtherResults'
    };

    // Limpiar contenedores locales
    Object.values(containers).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });

    if (!query) {
      showAlert('Ingresa un término de búsqueda.');
      return;
    }

    // 1) Buscar en Supabase
    console.log('[Search] query local:', query);
    const [{ data: libros, error: librosErr }, { data: autores, error: autoresErr }] = await Promise.all([
      supabase.from('libros').select('id, titol, autor_id, isbn'),
      supabase.from('autores').select('id, nombre')
    ]);
    if (librosErr) throw librosErr;
    if (autoresErr) throw autoresErr;

    // Mapear autor a cada libro
    const librosConAutor = libros.map(libro => ({
      ...libro,
      autor: autores.find(a => a.id === libro.autor_id)?.nombre?.toLowerCase() || 'desconocido'
    }));

    // Coincidencias locales
    const exactISBN = librosConAutor.find(l => l.isbn === query);
    if (exactISBN) {
      showAlert('Ya tienes este libro en tu colección.');
      renderCoincidencias(containers.isbn, [exactISBN], '');
      return;
    }

    const matchesByISBN = librosConAutor.filter(l => l.isbn?.includes(query));
    const matchesByTitle = librosConAutor.filter(l => l.titol.toLowerCase().includes(query));
    const matchesByAuthor = librosConAutor.filter(l => l.autor.includes(query));

    renderCoincidencias(containers.isbn, matchesByISBN, 'No hay coincidencias por ISBN.');
    renderCoincidencias(containers.title, matchesByTitle, 'No hay coincidencias por título.');
    renderCoincidencias(containers.author, matchesByAuthor, 'No hay coincidencias por autor.');

    // 2) Búsqueda externa si es ISBN
    const isISBN = /^\d{10,13}$/.test(query);
    if (isISBN && matchesByISBN.length === 0) {
      console.log('[Search] ISBN válido, buscando en Google Books...');
      const items = await fetchGoogleBooks(`isbn:${query}`);
      renderGoogleResults(items, containers.googleISBN);
    }

    // 3) Búsqueda externa general si no es ISBN
    if (!isISBN) {
      console.log('[Search] búsqueda externa general:', query);
      const items = await fetchGoogleBooks(query);
      renderGoogleResults(items, containers.googleOther);
    }

    console.log('[Search] searchBooks -> finalizado');
  } catch (err) {
    console.error('[Search] searchBooks -> error', err);
    showError(err.message);
  }
}

/**
 * Inicializa el listener del formulario de búsqueda.
 */
export function initSearch() {
  console.log('[Search] initSearch -> binding form');
  const form = document.getElementById('searchForm');
  if (!form) {
    console.warn('[Search] initSearch -> formulario no encontrado');
    return;
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    searchBooks();
  });
}
