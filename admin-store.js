const patyStore = (() => {
  const initial = () => ({
    version: 1, catalogRevision: 2, items: patyCatalog.items, products: patyCatalog.products,
    movements: [], batches: [], orders: [], cash: [],
  });

  function updateCatalog(state) {
    if (state.catalogRevision === 2) return state;
    const defaults = new Map(patyCatalog.products.map(product => [product.id, product]));
    for (const product of state.products) {
      const original = defaults.get(product.id);
      const ingredients = new Map(product.ingredients);
      if (product.yield === 20 && original?.ingredients.some(([id]) => id === 'chocolate')
        && ingredients.size === original.ingredients.length
        && original.ingredients.every(([id, quantity]) => ingredients.get(id) === quantity)) {
        product.yield = original.yield;
      }
    }
    state.catalogRevision = 2;
    return state;
  }

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
        state = updateCatalog(request.result);
        if (!action) return;
        try {
          state = updateCatalog(action(state) ?? state);
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
