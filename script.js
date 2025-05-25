// Inicializa Supabase
const SUPABASE_URL = 'https://vrbheaswtkheyxswnhrp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYmhlYXN3dGtoZXl4c3duaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjkzMDcsImV4cCI6MjA2MDQwNTMwN30.3lrx_kJwp7uHbhu9IgKGTM5Somobi4tjTiYdCtEYW1o';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Selecciona el contenedor
const container = document.querySelector('.container');

// Función para obtener libros ordenados por ID descendente
t async function fetchBooks() {
  const { data, error } = await supabase
    .from('libros')
    .select(
      `id, titol, isbn, autor:autores(nombre), estanteria:estanterias(nombre)`
    )
    .order('id', { ascending: false });

  if (error) {
    console.error('Error al cargar libros:', error);
    container.innerHTML = '<p>Error al cargar los libros.</p>';
    return;
  }

  renderCards(data);
}

// Función para renderizar tarjetas\ nfunction renderCards(books) {
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

// Carga inicial
fetchBooks();