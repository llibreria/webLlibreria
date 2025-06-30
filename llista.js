// Reemplaza estos valores con los de tu proyecto Supabase

const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o'; // sigue recomendando .env en producción

if (SUPABASE_URL.includes('<TU_PROYECTO>') || SUPABASE_KEY.includes('<TU_ANON_KEY>')) {
  console.error('❌ Sustituye SUPABASE_URL y SUPABASE_KEY por tus credenciales reales.');
}

// Crea el cliente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Selecciona contenedor
const container = document.querySelector('.container');

// Obtiene libros ordenados por ID descendente
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: books, error } = await supabaseClient
      .from('libros')
      .select('id, titol, isbn, autor:autores(nombre), estanteria:estanterias(nombre)')
      .order('id', { ascending: false });

    if (error) throw error;
    renderCards(books);
  } catch (err) {
    console.error('Error al cargar libros:', err);
    container.innerHTML = '<p>Error al cargar los libros. Revisa la consola.</p>';
  }
});

function renderCards(books) {
  container.innerHTML = '';
  books.forEach(book => {
    const link = document.createElement('a');
    link.href = `ficha.html?id=${book.id}`;
    link.className = 'card';
    link.innerHTML = `
      <h2>${book.titol}</h2>
      <p><strong>Autor:</strong> ${book.autor.nombre}</p>
      <p><strong>ISBN:</strong> ${book.isbn || 'N/A'}</p>
      <p><strong>Estantería:</strong> ${book.estanteria?.nombre || 'Sin asignar'}</p>
    `;
    container.appendChild(link);
  });
}