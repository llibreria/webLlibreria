// modals.js
// Manejo de apertura/cierre y datos de los modales de la aplicación

/**
 * Inicializa los eventos globales de apertura y cierre de modales.
 */
export function initModals() {
  // Modal de detalle de préstamo
  const loanModal = document.getElementById('loanModal');
  const btnCloseLoan = document.getElementById('closeModal');
  btnCloseLoan?.addEventListener('click', () => {
    loanModal.style.display = 'none';
  });

  // Modal de creación de préstamo
  const createLoanModal = document.getElementById('createLoanModal');
  const btnCloseCreate = document.getElementById('closeCreateModal');
  btnCloseCreate?.addEventListener('click', () => {
    createLoanModal.style.display = 'none';
  });

  // Modal de añadir libro
  const addBookModal = document.getElementById('addBookModal');
  const btnCloseAdd = document.getElementById('closeAddModal');
  btnCloseAdd?.addEventListener('click', () => {
    addBookModal.style.display = 'none';
  });

  // Cerrar modales al hacer clic fuera
  window.addEventListener('click', (event) => {
    if (event.target === loanModal) {
      loanModal.style.display = 'none';
    }
    if (event.target === createLoanModal) {
      createLoanModal.style.display = 'none';
    }
    if (event.target === addBookModal) {
      addBookModal.style.display = 'none';
    }
  });
}

let currentLoanId = null;

/**
 * Abre el modal con datos de un préstamo existente.
 * @param {Object} data - Objeto con propiedades: id, quien, cuando
 */
export function openLoanModal(data) {
  const loanModal = document.getElementById('loanModal');
  const spanQuien = document.getElementById('loanQuien');
  const spanCuando = document.getElementById('loanCuando');

  if (!loanModal || !spanQuien || !spanCuando) return;
  
  spanQuien.textContent = data.quien || 'Desconocido';
  spanCuando.textContent = new Date(data.cuando).toLocaleDateString();
  currentLoanId = data.id;
  loanModal.style.display = 'block';
}

/**
 * Abre el modal para crear un nuevo préstamo.
 * @param {number|string} libroId - ID del libro para el nuevo préstamo
 */
export function openCreateLoanModal(libroId) {
  const createLoanModal = document.getElementById('createLoanModal');
  const inputQuien = document.getElementById('inputQuien');

  if (!createLoanModal || !inputQuien) return;

  inputQuien.value = '';
  createLoanModal.dataset.libroId = String(libroId);
  createLoanModal.style.display = 'block';
}

/**
 * Abre el modal para añadir un nuevo libro.
 */
export function openAddBookModal() {
  const addBookModal = document.getElementById('addBookModal');
  const estanteriaSelect = document.getElementById('estanteriaSelect');
  const isbnInput = document.getElementById('isbnInputManual');

  if (!addBookModal || !estanteriaSelect || !isbnInput) return;

  isbnInput.value = '';
  estanteriaSelect.innerHTML = '<option value="">Selecciona una estantería</option>';
  addBookModal.style.display = 'block';
}

/**
 * Obtiene el ID del préstamo actualmente abierto.
 * @returns {string|null}
 */
export function getCurrentLoanId() {
  return currentLoanId;
}