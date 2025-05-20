// main.js
// Punto de entrada de la aplicación: inicializa módulos, carga datos y liga eventos

// ─── main.js ───
console.log('[Main] main.js cargado');
console.log('[Main] window.supabase disponible en main:', !!window.supabase);

import {
  fetchLibros,
  fetchPrestamosActivos,
  fetchPrestamoDetalle,
  createLoan,
  markLoanReturned
} from './api.js';

import {
  renderLibros
} from './ui.js';
import {
  initModals,
  openLoanModal,
  openCreateLoanModal,
  openAddBookModal,
  getCurrentLoanId
} from './modals.js';
import { initSearch } from './search.js';
import { initAddBook } from './addBook.js';
import { showError } from './ui.js';

/**
 * Inicializa la aplicación: carga libros y préstamos, renderiza UI y configura listeners.
 */
async function initApp() {
  console.log('[Main] initApp -> Iniciando');
  try {
    // 1) Cargar libros
    const libros = await fetchLibros();

    // 2) Cargar préstamos activos
    const ids = libros.map(l => l.id);
    const prestamos = await fetchPrestamosActivos(ids);

    // 3) Combinar datos
    const librosConEstado = libros.map(libro => ({
      ...libro,
      prestado: prestamos.some(p => p.libro_id === libro.id),
      leido: false
    }));

    // 4) Renderizar lista
    renderLibros(librosConEstado);

    // 5) Inicializar modales y demás componentes
    initModals();
    initSearch();
    initAddBook();

    // 6) Escuchar clicks en íconos de préstamo
    document.addEventListener('onLoanClick', async (e) => {
      const { libroId } = e.detail;
      console.log('[Main] onLoanClick -> libroId', libroId);
      try {
        const data = await fetchPrestamoDetalle(libroId);
        openLoanModal(data);
      } catch (err) {
        showError('No se pudo cargar el préstamo: ' + err.message);
      }
    });

    // 7) Crear nuevo préstamo desde modal
    const submitLoanBtn = document.getElementById('submitLoan');
    submitLoanBtn?.addEventListener('click', async () => {
      const createModal = document.getElementById('createLoanModal');
      const quienInput = document.getElementById('inputQuien');
      const libroId = createModal?.dataset.libroId;
      const quien = quienInput?.value.trim();
      if (!libroId || !quien) return showError('Datos de préstamo incompletos');

      try {
        await createLoan({ libroId, quien });
        alert('Préstamo registrado');
        createModal.style.display = 'none';
        await initApp(); // refrescar listas
      } catch (err) {
        showError('Error registrando préstamo: ' + err.message);
      }
    });

    // 8) Marcar préstamo como devuelto desde modal
    const returnLoanBtn = document.getElementById('markAsReturned');
    returnLoanBtn?.addEventListener('click', async () => {
      const prestamoId = getCurrentLoanId();
      if (!prestamoId) return showError('No hay préstamo seleccionado');

      try {
        await markLoanReturned(prestamoId);
        alert('Libro marcado como devuelto');
        const loanModal = document.getElementById('loanModal');
        loanModal.style.display = 'none';
        await initApp(); // refrescar listas
      } catch (err) {
        showError('Error actualizando préstamo: ' + err.message);
      }
    });

    console.log('[Main] initApp -> Listo');
  } catch (err) {
    console.error('[Main] initApp -> Error', err);
    showError('Error al iniciar la aplicación: ' + err.message);
  }
}

// Esperar a que el DOM esté listo
window.addEventListener('DOMContentLoaded', initApp);
// Para poder recargar la lista de libros desde search.js
window.initApp = initApp;
