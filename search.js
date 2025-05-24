// search.js
// Módulo exclusivo de búsqueda de libros usando Supabase y Google Books

// Se asume que en index.html está cargado el UMD de Supabase:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js"></script>

// Configuración de Supabase
const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o';
const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
if (!supabase) console.error('Supabase no está definido.');

/**
 * Muestra coincidencias de búsqueda en un contenedor dado
 */
export function mostrarCoincidencias(containerId, libros, mensaje='') {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = libros.length
    ? libros.map(l=> `<div class="libro"><strong>${l.titol}</strong><br>Autor: ${l.autor}<br>ISBN: ${l.isbn}</div>`).join('')
    : `<p>${mensaje}</p>`;
}

/**
 * Busca libros en Supabase y muestra resultados o recurre a Google Books
 */
export async function searchBooks() {
  const qRaw = document.getElementById('isbnInput')?.value.trim();
  const q = qRaw?.toLowerCase();
  // Contenedores a limpiar
  ['isbnResults','titleResults','authorResults','googleISBNResults','googleOtherResults','libros-lista'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  if (!q) {
    // Si no hay query, puedes recargar todos con otra función externa
    return;
  }

  // Obtener libros básicos con autor
  const { data: libros = [], error } = await supabase
    .from('libros')
    .select('id, titol, isbn, autor:autor_id(nombre)');
  if (error) {
    alert('Error al obtener libros.');
    return;
  }

  // Mapear autor a string en minúsculas para comparación
  const librosMap = libros.map(l => ({
    ...l,
    autor: l.autor?.nombre.toLowerCase() || 'desconocido'
  }));

  // Coincidencia exacta por ISBN
  const exact = librosMap.filter(l => l.isbn?.toLowerCase() === q);
  if (exact.length) {
    alert('Ya tienes este libro en tu colección.');
    return mostrarCoincidencias('isbnResults', exact, '');
  }

  // Búsquedas parciales
  const byIsbn = librosMap.filter(l => l.isbn?.toLowerCase().includes(q));
  const byTitle = librosMap.filter(l => l.titol.toLowerCase().includes(q));
  const byAuthor = librosMap.filter(l => l.autor.includes(q));

  mostrarCoincidencias('isbnResults', byIsbn, 'No hay coincidencias por ISBN.');
  mostrarCoincidencias('titleResults', byTitle, 'No hay coincidencias por título.');
  mostrarCoincidencias('authorResults', byAuthor, 'No hay coincidencias por autor.');

  // Determinar si es ISBN válido
  const isISBN = /^\d{10,13}$/.test(qRaw);
  if (isISBN && byIsbn.length === 0) {
    // Buscar en Google Books por ISBN
    const items = await fetchGoogleBooks(qRaw, true);
    if (!items.length) return alert('No se encontró ningún libro con ese ISBN.');
    return displayGoogleResults(items, 'googleISBNResults');
  }

  // Búsqueda libre en Google Books si no es ISBN o no hubo coincidencias de autor/título
  if (!isISBN) {
    const items = await fetchGoogleBooks(qRaw, false);
    return displayGoogleResults(items, 'googleOtherResults');
  }
}

/**
 * Consulta Google Books
 */
export async function fetchGoogleBooks(query, isbnSearch=true) {
  const q = isbnSearch ? `isbn:${query}` : encodeURIComponent(query);
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}`);
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error('Error Google Books', e);
    alert('Error al consultar Google Books');
    return [];
  }
}

/**
 * Muestra resultados de Google Books
 */
export function displayGoogleResults(items, containerId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = items.length
    ? items.map(i => `<div class="libro"><strong>${i.volumeInfo.title}</strong><br>Autor(es): ${(i.volumeInfo.authors||[]).join(', ')}</div>`).join('')
    : '<p>No hay resultados.</p>';
}

// Exponer función para el botón de búsqueda
window.searchBooks = searchBooks;