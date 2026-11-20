const patyStore = (() => {
  const initial = () => ({
    version: 1, items: patyCatalog.items, products: patyCatalog.products,
    movements: [], batches: [], orders: [], cash: [],
  });

  let opening;
  function database() {
    if (!opening) {
      opening = new Promise((resolve, reject) => {
        const request = indexedDB.open('paty-cookies-admin', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('data').add(initial(), 'state');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Feche outras abas do aplicativo e tente novamente.'));
      }).catch(error => {
        opening = undefined;
        throw error;
      });
    }
    return opening;
  }

  async function run(action) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('data', action ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('data');
      const request = store.get('state');
      let state;
      let businessError;
      request.onsuccess = () => {
        state = request.result;
        if (!action) return;
        try {
          state = action(state) ?? state;
          store.put(state, 'state');
        } catch (error) {
          businessError = error;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve(state);
      transaction.onabort = () => reject(businessError ?? transaction.error ?? new Error('Falha ao salvar os dados.'));
    });
  }

  return { read: () => run(), write: run };
})();
