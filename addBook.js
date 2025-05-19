// addBook.js
// Lógica para añadir libros manualmente usando ISBN y Google Books

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@1.35.1/+esm';
import { fetchGoogleBooks } from './search.js';
import { showAlert, showError } from './ui.js';

const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o'; // usar variables de entorno en producción
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Inicializa eventos de abrir modal y envío de formulario para añadir libro.
 */
export function initAddBook() {
  console.log('[AddBook] initAddBook -> configurando eventos');

  const btnAdd = document.getElementById('addBookBtn');
  btnAdd?.addEventListener('click', openAddBookModal);

  const form = document.getElementById('addBookForm');
  form?.addEventListener('submit', handleAddBook);
}

/**
 * Abre el modal de añadir libro, cargando estanterías disponibles.
 */
async function openAddBookModal() {
  console.log('[AddBook] openAddBookModal -> cargando estanterías');
  try {
    const { data: estanterias, error } = await supabase
      .from('estanterias')
      .select('id, nombre');
    if (error) throw error;

    const modal = document.getElementById('addBookModal');
    const select = document.getElementById('estanteriaSelect');
    if (!modal || !select) {
      console.warn('[AddBook] openAddBookModal -> elementos del DOM no encontrados');
      return;
    }

    // Poblar select
    select.textContent = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona una estantería';
    select.appendChild(placeholder);

    estanterias.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.nombre;
      select.appendChild(opt);
    });

    // Reset formulario e inputs
    document.getElementById('isbnInputManual').value = '';

    modal.style.display = 'block';
  } catch (err) {
    console.error('[AddBook] openAddBookModal -> error', err);
    showError('No se pudieron cargar las estanterías.');
  }
}

/**
 * Maneja el envío del formulario para añadir un libro.
 * @param {Event} event
 */
async function handleAddBook(event) {
  event.preventDefault();
  console.log('[AddBook] handleAddBook -> iniciando');

  const isbnInput = document.getElementById('isbnInputManual');
  const select = document.getElementById('estanteriaSelect');
  const modal = document.getElementById('addBookModal');

  if (!isbnInput || !select || !modal) {
    showError('Formulario incompleto.');
    return;
  }

  const isbn = isbnInput.value.trim();
  if (!/^\d{10,13}$/.test(isbn)) {
    showError('ISBN inválido. Debe tener 10–13 dígitos.');
    return;
  }
  const estanteria_id = select.value;
  if (!estanteria_id) {
    showError('Debes seleccionar una estantería.');
    return;
  }

  try {
    // 1) Obtener datos de Google Books
    console.log('[AddBook] fetchGoogleBooks ->', isbn);
    const items = await fetchGoogleBooks(isbn);
    if (!items.length) {
      showAlert('No se encontró libro con ese ISBN.');
      return;
    }
    const info = items[0].volumeInfo || {};
    const title = info.title || '';
    const authorName = info.authors?.[0] || 'Desconocido';

    // 2) Upsert autor y obtener ID
    console.log('[AddBook] upsert autor ->', authorName);
    const { data: authorData, error: authorErr } = await supabase
      .from('autores')
      .upsert([{ nombre: authorName }], { onConflict: ['nombre'], returning: 'representation' });
    if (authorErr) throw authorErr;
    const autor_id = authorData[0]?.id;

    // 3) Insertar nuevo libro
    const libroRecord = { titol: title, isbn, autor_id, estanteria_id };
    console.log('[AddBook] insert libro ->', libroRecord);
    const { error: bookErr } = await supabase
      .from('libros')
      .insert([libroRecord]);
    if (bookErr) throw bookErr;

    showAlert('¡Libro agregado exitosamente!');
    modal.style.display = 'none';
    // Opcional: refrescar la lista de libros
    window.location.reload();
  } catch (err) {
    console.error('[AddBook] handleAddBook -> error', err);
    showError('Error al agregar el libro.');
  }
}
