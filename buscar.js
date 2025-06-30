// buscar.js

// ————— Configuración Supabase —————
const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o'; // sigue recomendando .env en producción
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ————— Init eventos —————
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-buscar');
  const input = document.getElementById('input-busqueda');
  btn.addEventListener('click', handleSearch);
  input.addEventListener('keypress', e => e.key === 'Enter' && handleSearch());
});

// ————— Flujo principal —————
async function handleSearch() {
  const query = document.getElementById('input-busqueda').value.trim();
  if (!query) return;
  clearSections();

  const isISBN = /^[0-9]{10,13}$/.test(query);
  if (isISBN) {
    // 1) Buscar exacto en BD
    const { data: libroDB, error: err } = await supabaseClient
      .from('libros')
      .select('id, titol, isbn, autor:autores(nombre)')
      .eq('isbn', query)
      .maybeSingle();

    if (err) {
      console.error('Error ISBN BD:', err);
      return;
    }
    if (libroDB) {
      renderSection('isbn', [libroDB]);
      return;
    }
    // 2) Fallback Google Books
    return searchByGoogleBooks(query);
  }

  // Texto libre → buscar en título y autor a la vez
  await Promise.all([
    searchByTitle(query),
    searchByAuthor(query)
  ]);
}

// ————— Limpia secciones —————
function clearSections() {
  ['isbn','titulo','autor'].forEach(t => {
    document.getElementById(`seccion-${t}`).classList.add('hidden');
    document.getElementById(`resultados-${t}`).innerHTML = '';
  });
}

// ————— Google Books → luego título/autor en BD —————
async function searchByGoogleBooks(isbn) {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const json = await res.json();
    const item = json.items?.[0];
    if (!item) return;

    const info = item.volumeInfo;
    const title = info.title || '';
    const authorName = (info.authors || []).join(' ');

    await Promise.all([
      searchByTitle(title),
      searchByAuthor(authorName)
    ]);
  } catch (e) {
    console.error('Google Books error:', e);
  }
}

// ————— Búsqueda por título —————
async function searchByTitle(text) {
  const words = normalizeWords(text);
  if (!words.length) return;

  // 1) BD: any matching substring
  const orFilter = words.map(w => `titol.ilike.%${w}%`).join(',');
  const { data, error } = await supabaseClient
    .from('libros')
    .select('id, titol, isbn, autor:autores(nombre)')
    .or(orFilter);

  if (error) {
    console.error('Error título BD:', error);
    return;
  }

  // 2) Filtrado JS: solo títulos que contengan cada palabra como término completo
  const filtered = (data || []).filter(book => {
    const titleWords = book.titol
      .toLowerCase()
      .match(/\b[\wñáéíóúü]+\b/gi) || [];
    return words.every(w => titleWords.includes(w));
  });

  if (!filtered.length) return;

  // 3) Orden alfabético por título
  filtered.sort((a,b) => a.titol.localeCompare(b.titol, 'es'));
  renderSection('titulo', filtered);
}

// ————— Búsqueda por autor —————
async function searchByAuthor(text) {
  const words = normalizeWords(text);
  if (!words.length) return;

  // 1) BD: any matching substring in autor.nombre
  const orFilter = words.map(w => `autores.nombre.ilike.%${w}%`).join(',');
  const { data, error } = await supabaseClient
    .from('libros')
    .select('id, titol, isbn, autor:autores(nombre)')
    .or(orFilter);

  if (error) {
    console.error('Error autor BD:', error);
    return;
  }

  // 2) Filtrado JS: autorName debe contener cada palabra completa
  const filtered = (data || []).filter(book => {
    const authWords = book.autor.nombre
      .toLowerCase()
      .match(/\b[\wñáéíóúü]+\b/gi) || [];
    return words.every(w => authWords.includes(w));
  });

  if (!filtered.length) return;

  // 3) Orden: autor alfabético → título alfabético
  filtered.sort((a,b) => {
    const na = a.autor.nombre.localeCompare(b.autor.nombre, 'es');
    return na !== 0 ? na : a.titol.localeCompare(b.titol, 'es');
  });
  renderSection('autor', filtered);
}

// ————— Normaliza y extrae palabras significativas en minúscula —————
function normalizeWords(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g,''))
    .map(w => w.replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean);
}

// ————— Renderizado de tarjetas —————
function renderSection(type, items) {
  const sec = document.getElementById(`seccion-${type}`);
  const cont = document.getElementById(`resultados-${type}`);
  sec.classList.remove('hidden');
  items.forEach(book => {
    const a = document.createElement('a');
    a.href = book.id ? `ficha.html?id=${book.id}` : '#';
    a.className = 'card';
    a.innerHTML = `<h3>${book.titol}</h3><p>${book.autor.nombre}</p>`;
    cont.appendChild(a);
  });
}
