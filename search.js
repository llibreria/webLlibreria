// search.js
// Lógica de búsqueda de libros usando Supabase y Google Books

// Se asume que en index.html cargas el UMD de Supabase antes de este módulo:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js"></script>

import { renderCoincidencias, renderGoogleResults, showAlert, showError } from './ui.js';

// Inicializa el cliente de Supabase usando el objeto global expuesto por el UMD
const SUPABASE_URL = 'https://tusupabaseurl.supabase.co';
const SUPABASE_KEY = 'tusupabaseanonkey';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Carga todos los libros ordenados por ID descendente, incluyendo nombre del autor
 */
export async function loadAllBooks() {
  try {
    const { data: books, error } = await supabase
      .from('libros')
      .select('id, isbn, titol, autor_id, autores(nombre)')
      .order('id', { ascending: false });
    if (error) throw error;
    clearResults();
    displayAllBooks(books);
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Muestra la lista completa de libros en el contenedor
 */
function displayAllBooks(books) {
  const lista = document.getElementById('libros-lista');
  lista.innerHTML = '';
  if (!books.length) {
    lista.textContent = 'No hay libros en la biblioteca.';
    return;
  }
  books.forEach(libro => {
    const autorNombre = libro.autores?.[0]?.nombre || 'Desconocido';
    const item = document.createElement('div');
    item.classList.add('book-item');
    item.innerHTML = `
      <strong>${libro.titol}</strong><br>
      ISBN: ${libro.isbn || 'N/A'}<br>
      Autor: ${autorNombre}
    `;
    lista.appendChild(item);
  });
}

/**
 * Limpia todas las zonas de resultados anteriores
 */
function clearResults() {
  document.getElementById('isbn-results').innerHTML = '';
  document.getElementById('title-results').innerHTML = '';
  document.getElementById('author-results').innerHTML = '';
  document.getElementById('libros-lista').innerHTML = '';
}

/**
 * Función principal de búsqueda
 */
export async function searchBooks() {
  const query = document.getElementById('isbnInput').value.trim();
  clearResults();

  // Si el input está vacío, cargamos todos los libros
  if (!query) {
    await loadAllBooks();
    return;
  }

  try {
    // Búsqueda local por coincidencias exactas y parciales, incluyendo autor
    const { data: exactMatches } = await supabase
      .from('libros')
      .select('id, isbn, titol, autor_id, autores(nombre)')
      .eq('isbn', query);

    const { data: partialMatches } = await supabase
      .from('libros')
      .select('id, isbn, titol, autor_id, autores(nombre)')
      .or(
        `isbn.ilike.%${query}%,titol.ilike.%${query}%,autores.nombre.ilike.%${query}%`
      );

    // Renderizamos coincidencias locales
    if (exactMatches.length) renderCoincidencias(exactMatches, 'isbn-results');
    if (partialMatches.length) renderCoincidencias(partialMatches, 'title-results');
    if (partialMatches.length) renderCoincidencias(partialMatches, 'author-results');

    // Si no hay resultados locales y es ISBN válido, consulta Google Books
    const isbnRegex = /^(?:\d{10}|\d{13})$/;
    if (!exactMatches.length && isbnRegex.test(query)) {
      const items = await fetchGoogleBooks(query);
      renderGoogleResults(items);
    } else if (!exactMatches.length && !partialMatches.length) {
      // Búsqueda por texto libre en Google Books
      const items = await fetchGoogleBooks(query, false);
      renderGoogleResults(items);
    }

  } catch (error) {
    showError(error.message);
  }
}

/**
 * Inicializa el evento de búsqueda y carga inicial de libros
 */
export function initSearch() {
  const form = document.getElementById('searchForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    await searchBooks();
  });

  // Carga inicial de todos los libros
  loadAllBooks();
}

// Iniciar búsqueda al cargar módulo
initSearch();
