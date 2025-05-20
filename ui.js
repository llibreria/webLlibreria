// ui.js
// Funciones para renderizado de la interfaz de usuario y manejo de mensajes

/**
 * Renderiza la lista de libros en el DOM.
 * @param {Array<Object>} libros - Array de libros con propiedades: id, titol, autor.nombre, estanteria.nombre, saga.nombre, prestado
 */
export function renderLibros(libros) {
  console.log('[UI] renderLibros ->', libros.length, 'libros');
  const lista = document.getElementById('libros-lista');
  if (!lista) {
    console.warn('[UI] renderLibros -> contenedor no encontrado');
    return;
  }

  // Limpiar contenido previo
  lista.textContent = '';
  const fragment = document.createDocumentFragment();

  libros.forEach(libro => {
    const item = document.createElement('div');
    item.classList.add('libro');

    // Título y estado de préstamo
    const header = document.createElement('h2');
    header.textContent = libro.titol;
    if (libro.prestado) {
      const btn = document.createElement('button');
      btn.classList.add('prestamo-icon');
      btn.setAttribute('data-libro-id', libro.id);
      btn.setAttribute('title', 'Prestado');
      btn.textContent = '🔒';
      header.appendChild(btn);
    }
    item.appendChild(header);

    // Detalles: Autor, estantería, saga
    const detalles = [
      { label: 'Autor', value: libro.autor?.nombre || 'N/A' },
      { label: 'Estantería', value: libro.estanteria?.nombre || 'N/A' }
    ];
    if (libro.saga?.nombre) {
      detalles.push({ label: 'Saga', value: libro.saga.nombre });
    }
    detalles.forEach(({ label, value }) => {
      const p = document.createElement('p');
      p.textContent = `${label}: ${value}`;
      item.appendChild(p);
    });

    fragment.appendChild(item);
  });

  lista.appendChild(fragment);
}

/**
 * Renderiza coincidencias de búsqueda (ISBN, título, autor).
 * @param {string} containerId - ID del contenedor donde insertar resultados
 * @param {Array<Object>} items - Array de libros con propiedades titol, autor, isbn
 * @param {string} mensajeVacio - Texto a mostrar si no hay resultados
 */
export function renderCoincidencias(containerId, items, mensajeVacio) {
  console.log(`[UI] renderCoincidencias -> contenedor=${containerId}`, items.length);
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[UI] renderCoincidencias -> contenedor ${containerId} no encontrado`);
    return;
  }

  container.textContent = '';
  if (items.length === 0) {
    const p = document.createElement('p');
    p.textContent = mensajeVacio;
    container.appendChild(p);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const el = document.createElement('div');
    el.classList.add('libro');

    const title = document.createElement('strong');
    title.textContent = item.titol;
    el.appendChild(title);

    const autor = document.createElement('div');
    autor.textContent = `Autor: ${item.autor}`;
    el.appendChild(autor);

    const isbn = document.createElement('div');
    isbn.textContent = `ISBN: ${item.isbn || '—'}`;
    el.appendChild(isbn);

    fragment.appendChild(el);
  });
  container.appendChild(fragment);
}

/**
 * Renderiza resultados de Google Books en un contenedor.
 * @param {Array<Object>} items - Array de items de Google Books API
 * @param {string} containerId - ID del contenedor donde insertar resultados externos
 */
export function renderGoogleResults(items, containerId) {
  console.log('[UI] renderGoogleResults ->', items.length, 'elementos');
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[UI] renderGoogleResults -> contenedor ${containerId} no encontrado`);
    return;
  }

  container.textContent = '';
  if (items.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No se encontraron resultados externos.';
    container.appendChild(p);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const info = item.volumeInfo || {};
    const el = document.createElement('div');
    el.classList.add('libro');

    const title = document.createElement('strong');
    title.textContent = info.title || 'Sin título';
    el.appendChild(title);

    const authors = document.createElement('div');
    authors.textContent = `Autor(es): ${info.authors?.join(', ') || 'Desconocido'}`;
    el.appendChild(authors);

    fragment.appendChild(el);
  });
  container.appendChild(fragment);
}

/**
 * Muestra un mensaje de error consistently.
 * @param {string} mensaje - Texto de error para el usuario
 */
export function showError(mensaje) {
  console.error('[UI] showError ->', mensaje);
  // Opcional: mostrar un toast o notificación en UI
  alert(`Error: ${mensaje}`);
}

/**
 * Muestra una alerta informativa al usuario.
 * @param {string} mensaje - Texto de la alerta
 */
export function showAlert(mensaje) {
  console.log('[UI] showAlert ->', mensaje);
  // Opcional: usar un componente de alerta en lugar de alert()
  alert(mensaje);
}

/**
 * Muestra los resultados de Google Books en el contenedor indicado.
 * @param {Array} items — array de ítems de Google Books
 * @param {string} containerId — id del elemento donde renderizar
 */
export function displayGoogleResults(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return console.warn(`[UI] displayGoogleResults: contenedor "${containerId}" no encontrado`);
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = 'No se encontraron resultados.';
    return;
  }

  items.forEach(item => {
    const info = item.volumeInfo || {};
    const el = document.createElement('div');
    el.classList.add('libro');
    el.innerHTML = `
      <strong>${info.title || 'Sin título'}</strong><br>
      Autor(es): ${info.authors?.join(', ') || 'Desconocido'}<br><br>
    `;
    container.appendChild(el);
  });
}


export {
  renderLibros,
  renderCoincidencias,
  displayGoogleResults,
  showAlert,
  showError
};
