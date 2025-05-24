// search.js
// Lógica de búsqueda de libros usando Supabase y Google Books

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@1.35.1/dist/module/index.js';
import { renderCoincidencias, renderGoogleResults, showAlert, showError } from './ui.js';

// Inicializa el cliente de Supabase
const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Función auxiliar para consultar Google Books por ISBN o texto libre
 * @param {string} query ISBN o texto de búsqueda
 * @param {boolean} isIsbn indicar si la búsqueda es por ISBN exacto
 * @returns {Promise<Array>} lista de items de Google Books
 */
export async function fetchGoogleBooks(query, isIsbn = true) {
  const prefix = isIsbn ? `isbn:${query}` : encodeURIComponent(query);
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${prefix}`);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error('[search.js] fetchGoogleBooks error', err);
    showError('Error al consultar Google Books');
    return [];
  }
}

// Carga todos los libros ordenados por ID descendente
export async function loadAllBooks() {
  try {
    const { data: books, error } = await supabase
      .from('libros')
      .select('id, isbn, title, author')
      .order('id', { ascending: false });
    if (error) throw error;
    clearResults();
    displayAllBooks(books);
  } catch (error) {
    showError(error.message);
  }
}

// Muestra la lista completa de libros en el contenedor
function displayAllBooks(books) {
  const lista = document.getElementById('libros-lista');
  lista.innerHTML = '';
  if (!books.length) {
    lista.textContent = 'No hay libros en la biblioteca.';
    return;
  }
  books.forEach(libro => {
    const item = document.createElement('div');
    item.classList.add('book-item');
    item.innerHTML = `
      <strong>${libro.title}</strong><br>
      ISBN: ${libro.isbn}<br>
      Autor: ${libro.author}
    `;
    lista.appendChild(item);
  });
}

// Limpia todas las zonas de resultados anteriores
function clearResults() {
  document.getElementById('isbn-results').innerHTML = '';
  document.getElementById('title-results').innerHTML = '';
  document.getElementById('author-results').innerHTML = '';
  document.getElementById('libros-lista').innerHTML = '';
}

// Función principal de búsqueda
export async function searchBooks() {
  const query = document.getElementById('isbnInput').value.trim();
  clearResults();

  // Si el input está vacío, cargamos todos los libros
  if (!query) {
    await loadAllBooks();
    return;
  }

  try {
    // Busqueda local por coincidencias exactas y parciales
    const { data: exactMatches } = await supabase
      .from('libros')
      .select('*')
      .eq('isbn', query);

    const { data: partialMatches } = await supabase
      .from('libros')
      .select('*')
      .or(
        `isbn.ilike.%${query}%,title.ilike.%${query}%,author.ilike.%${query}%`
      );

    // Renderizamos coincidencias locales
    if (exactMatches.length) renderCoincidencias(exactMatches, 'isbn-results');
    if (partialMatches.length) renderCoincidencias(partialMatches, 'title-results');

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

// Inicializa el evento de búsqueda y carga inicial de libros
export function initSearch() {
  const form = document.getElementById('searchForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    await searchBooks();
  });

  // Carga inicial de todos los libros
  loadAllBooks();
}

// Al cargar el módulo, iniciar búsqueda
initSearch();
