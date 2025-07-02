// Configuración Supabase
const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o'; // sigue recomendando .env en producción

if (SUPABASE_URL.includes('<TU_PROYECTO>') || SUPABASE_KEY.includes('<TU_ANON_KEY>')) {
  console.error('❌ Sustituye credenciales Supabase.');
}
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Utilidades de modales
function abrirModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Render modal Prestar sin préstamo activo
function renderPrestarModalSinPrestamo() {
  const cont = document.getElementById('contenido-prestar');
  cont.innerHTML = `
    <h2 class="texto-grande">Deixar Llibre</h2>
    <input id="input-quien" type="text" placeholder="Nom de la persona" class="texto-grande" />
    <div class="modal-actions">
      <button onclick="closeModal('modal-prestar')">Cancel·lar</button>
      <button id="btn-prestar-confirm">Confirmar</button>
    </div>
  `;
  document.getElementById('btn-prestar-confirm').addEventListener('click', async () => {
    const quien = document.getElementById('input-quien').value.trim();
    if (!quien) return alert('Introdueix el nom.');
    const libroId = new URLSearchParams(window.location.search).get('id');
    await supabaseClient.from('prestamos').insert([{ libro_id: libroId, quien, devuelto: false }]);
    location.reload();
  });
}

// Render modal Prestar con préstamo activo
function renderPrestarModalConPrestamo(prestamo) {
  const cont = document.getElementById('contenido-prestar');
  cont.innerHTML = `
    <h2 class="texto-grande">En préstec</h2>
    <p class="texto-grande"><strong>Deixat a:</strong> ${prestamo.quien}</p>
    <p class="texto-grande"><strong>Des del:</strong> ${new Date(prestamo.cuando).toLocaleDateString()}</p>
    <div class="modal-actions">
      <button onclick="closeModal('modal-prestar')">Cancel·lar</button>
      <button id="btn-devolver">Retornar</button>
    </div>
  `;
  document.getElementById('btn-devolver').addEventListener('click', async () => {
    await supabaseClient.from('prestamos').update({ devuelto: true }).eq('id', prestamo.id);
    location.reload();
  });
}

// Render modal Recolocar
async function renderRecolocarModal(currentId) {
  const selector = document.getElementById('selector-estanteria');
  selector.innerHTML = '<option value="">Carregant...</option>';

  const { data: estanterias, error } = await supabaseClient
    .from('estanterias')
    .select('id, nombre')
    .order('nombre', { ascending: true });
  if (error) return console.error('Error en carregar prestatgeries:', error);

  selector.innerHTML = estanterias
    .map(e => `<option value="${e.id}" ${e.id == currentId ? 'selected' : ''}>${e.nombre}</option>`)
    .join('');

  document.getElementById('btn-recolocar-cancel').onclick = () => closeModal('modal-recolocar');
  document.getElementById('btn-recolocar-confirm').onclick = async () => {
    const libroId = new URLSearchParams(window.location.search).get('id');
    const nuevaEst = selector.value;
    if (!nuevaEst) return alert('Selecciona una prestatgeria.');
    await supabaseClient.from('libros').update({ estanteria_id: nuevaEst }).eq('id', libroId);
    closeModal('modal-recolocar');
    location.reload();
  };
}

// Manejar eliminar
function setupEliminar(libroId) {
  document.getElementById('btn-eliminar-confirm').addEventListener('click', async () => {
    try {
      await supabaseClient.from('prestamos').delete().eq('libro_id', libroId);
      await supabaseClient.from('libros').delete().eq('id', libroId);
      window.location.href = './llista.html';
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('No es pot eliminar el llibre.');
    }
  });
}

// Inicialización de la ficha
async function initFicha() {
  const libroId = new URLSearchParams(window.location.search).get('id');
  if (!libroId) return;

  // Cargar datos del libro
  let libro;
  try {
    const { data, error } = await supabaseClient
      .from('libros')
      .select('titol, isbn, autor:autores(nombre), estanteria_id, estanteria:estanterias(nombre)')
      .eq('id', libroId)
      .single();
    if (error) throw error;
    libro = data;
  } catch (err) {
    console.error('Error en carregar llibre:', err);
    return;
  }

  // Mostrar datos
  document.getElementById('titulo-libro').textContent = libro.titol;
  document.getElementById('autor-libro').textContent = libro.autor.nombre;
  document.getElementById('isbn-libro').textContent = libro.isbn || 'N/A';
  document.getElementById('estanteria-libro').textContent = libro.estanteria?.nombre || 'Sense assignar';

  // Obtener y mostrar portada mediante Google Books API
  const imgEl = document.getElementById('portada-libro');
  if (libro.isbn) {
    fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${libro.isbn}`)
      .then(res => res.json())
      .then(data => {
        const item = data.items && data.items[0];
        const thumb = item?.volumeInfo?.imageLinks?.thumbnail;
        if (thumb) imgEl.src = thumb;
        else imgEl.alt = 'Portada no disponible';
      })
      .catch(() => { imgEl.alt = 'Error en carregar portada'; });
  } else {
    imgEl.alt = 'No té ISBN';
  }

  // Configurar botones visibles
  document.getElementById('btn-recolocar').addEventListener('click', () => abrirModal('modal-recolocar'));
  document.getElementById('btn-prestar').addEventListener('click', () => abrirModal('modal-prestar'));
  document.getElementById('btn-eliminar').addEventListener('click', () => abrirModal('modal-eliminar'));

  // Cargar préstamo
  let prestamo = null;
  try {
    const { data: prestamos } = await supabaseClient
      .from('prestamos')
      .select('id, quien, cuando')
      .eq('libro_id', libroId)
      .eq('devuelto', false)
      .order('cuando', { ascending: false })
      .limit(1);
    prestamo = prestamos[0] || null;
  } catch (err) {
    console.error('Error en carregar:', err);
  }

  const infoDiv = document.getElementById('prestamo-info');
  if (prestamo) {
    infoDiv.innerHTML = `<p class="texto-grande"><strong>Deixat a:</strong> ${prestamo.quien}</p><p class="texto-grande"><strong>Des del:</strong> ${new Date(prestamo.cuando).toLocaleDateString()}</p>`;
    renderPrestarModalConPrestamo(prestamo);
  } else {
    infoDiv.innerHTML = '<p class="texto-grande"><em>No està deixat.</em></p>';
    renderPrestarModalSinPrestamo();
  }

  // Inicializar recolocar y eliminar
  renderRecolocarModal(libro.estanteria_id);
  document.getElementById('info-libro-eliminar').textContent = `${libro.titol} — ${libro.autor.nombre}`;
  setupEliminar(libroId);
}

document.addEventListener('DOMContentLoaded', initFicha);