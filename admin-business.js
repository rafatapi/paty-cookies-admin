const patyBusiness = (() => {
  const round = value => Number(value.toFixed(6));
  const amount = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const byId = (list, id) => list.find(entry => entry.id === id);
  const get = (list, id) => {
    const entry = byId(list, id);
    if (!entry) throw new Error('O registro selecionado não existe mais.');
    return entry;
  };
  const date = (now = new Date()) => new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const id = () => Date.now().toString(36) + '-' + Array.from(crypto.getRandomValues(new Uint32Array(2)), n => n.toString(36)).join('-');

  function numeric(value, label, min = 0, max = 1000000000) {
    const result = Number(value);
    if (value === '' || value == null || !Number.isFinite(result) || result < min || result > max) {
      throw new Error('Confira o campo ' + label + '.');
    }
    return result;
  }

  function text(value, label) {
    const result = String(value ?? '').trim();
    if (!result || result.length > 180) throw new Error('Confira o campo ' + label + '.');
    return result;
  }

  function day(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Confira a data.');
    const parsed = new Date(value);
    if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Confira a data.');
    return value;
  }

  function units(value, label) {
    const count = numeric(value, label, 1, 1000000);
    if (!Number.isInteger(count)) throw new Error('Informe uma quantidade inteira de cookies.');
    return count;
  }

  function stock(state) {
    const balances = new Map(state.items.map(item => [item.id, 0]));
    for (const row of state.movements) balances.set(row.item, round(balances.get(row.item) + row.quantity));
    return balances;
  }

  function batchLeft(state) {
    const balances = new Map(state.batches.map(batch => [batch.id, batch.quantity]));
    for (const order of state.orders) {
      for (const [batch, quantity] of order.allocations) balances.set(batch, balances.get(batch) - quantity);
    }
    return balances;
  }

  function finished(state) {
    const balances = new Map(state.products.map(product => [product.id, 0]));
    const remaining = batchLeft(state);
    for (const batch of state.batches) balances.set(batch.product, balances.get(batch.product) + remaining.get(batch.id));
    return balances;
  }

  function plan(state, product, planned, packed = planned) {
    const quantities = new Map();
    for (const [key, quantity] of product.ingredients) quantities.set(key, round(quantity * planned / product.yield));
    for (const [key, quantity] of product.packaging) quantities.set(key, round((quantities.get(key) ?? 0) + quantity * packed));
    const balances = stock(state);
    const rows = [...quantities].map(([key, quantity]) => {
      const item = get(state.items, key);
      const missing = Math.max(0, round(quantity - balances.get(key)));
      return { item, quantity, balance: balances.get(key), missing, packs: Math.ceil(missing / item.pack), cost: item.price == null ? null : quantity * item.price / item.pack };
    });
    const total = rows.some(row => row.cost == null) ? null : rows.reduce((sum, row) => sum + row.cost, product.overhead * packed);
    return { rows, total };
  }

  function cashEntry(state, date, kind, label, value, ref = null) {
    state.cash.push({ id: id(), date: day(date), kind, label: text(label, 'descrição'), value: amount(numeric(value, 'valor', 0.01)), ref });
  }

  function movement(state, input) {
    const { kind } = input;
    if (!['opening', 'purchase', 'addition', 'loss'].includes(kind)) throw new Error('Confira o tipo de movimento.');
    const item = get(state.items, input.item);
    const quantity = round(numeric(input.quantity, 'quantidade', 0.000001));
    const delta = kind === 'loss' ? -quantity : quantity;
    if (round(stock(state).get(item.id) + delta) < 0) throw new Error('A saída supera o saldo disponível.');
    const when = day(input.date);
    const note = String(input.note ?? '').trim().slice(0, 180);
    const supplier = String(input.supplier ?? '').trim().slice(0, 180);
    const ref = id();
    const value = kind === 'purchase' ? amount(numeric(input.value, 'total pago', 0.01)) : null;
    if (kind === 'purchase') {
      const packs = units(input.packs ?? 1, 'embalagens compradas');
      const pack = round(quantity / packs);
      if (pack <= 0) throw new Error('Confira a quantidade por embalagem.');
      item.pack = pack;
      item.price = value / packs;
      if (supplier) item.supplier = supplier;
      cashEntry(state, when, 'purchase', ('Compra de ' + item.name + (supplier ? ' · ' + supplier : '')).slice(0, 180), value, ref);
    }
    state.movements.push({ id: ref, date: when, item: item.id, kind, quantity: delta, note, supplier, value });
  }

  function produce(state, input) {
    const product = get(state.products, input.product);
    const planned = units(input.planned, 'cookies planejados');
    const actual = units(input.actual, 'cookies produzidos');
    const when = day(input.date);
    const { rows, total } = plan(state, product, planned, actual);
    const missing = rows.filter(row => row.missing > 0);
    if (missing.length) throw new Error('Estoque insuficiente para ' + missing.map(row => row.item.name).join(', ') + '.');
    const ref = id();
    for (const row of rows.filter(row => row.quantity > 0)) {
      state.movements.push({ id: id(), date: when, item: row.item.id, kind: 'production', quantity: -row.quantity, note: product.name, ref });
    }
    state.batches.push({ id: ref, date: when, product: product.id, name: product.name, planned, quantity: actual, cost: total == null ? null : amount(total) });
  }

  function addOrder(state, input) {
    const when = day(input.date);
    const due = day(input.due);
    if (due < when) throw new Error('A entrega deve ser na data do pedido ou depois.');
    if (!Array.isArray(input.lines) || !input.lines.length) throw new Error('Adicione pelo menos um sabor.');
    const lines = input.lines.map(line => {
      const product = get(state.products, line.product);
      return { product: product.id, name: product.name, quantity: units(line.quantity, 'quantidade'), price: amount(numeric(line.price, 'preço unitário')) };
    });
    const total = amount(lines.reduce((sum, line) => sum + line.quantity * line.price, 0));
    numeric(total, 'total do pedido');
    state.orders.push({ id: id(), date: when, due, customer: text(input.customer, 'cliente'), lines, total, status: 'open', paid: false, allocations: [], cost: null });
  }

  function updateOrder(state, key, action) {
    const order = get(state.orders, key);
    if (order.status === 'cancelled') throw new Error('Este pedido foi cancelado.');
    if (action === 'pay' && !order.paid) {
      if (order.total > 0) cashEntry(state, date(), 'sale', ('Pedido · ' + order.customer).slice(0, 180), order.total, key);
      order.paid = true;
    } else if (action === 'cancel' && order.status === 'open') {
      if (order.paid && order.total > 0) cashEntry(state, date(), 'refund', ('Estorno · ' + order.customer).slice(0, 180), order.total, key);
      order.status = 'cancelled';
      order.paid = false;
    } else if (action === 'deliver' && order.status === 'open') {
      const balance = batchLeft(state);
      const batches = [...state.batches].sort((left, right) => left.date.localeCompare(right.date));
      const allocations = [];
      let cost = 0;
      for (const line of order.lines) {
        let needed = line.quantity;
        for (const batch of batches.filter(batch => batch.product === line.product)) {
          const used = Math.min(needed, balance.get(batch.id));
          if (!used) continue;
          balance.set(batch.id, balance.get(batch.id) - used);
          allocations.push([batch.id, used]);
          cost = cost == null || batch.cost == null ? null : cost + batch.cost * used / batch.quantity;
          needed -= used;
          if (!needed) break;
        }
        if (needed) throw new Error('Faltam ' + needed + ' un. prontas de ' + line.name + '.');
      }
      order.allocations = allocations;
      order.cost = cost == null ? null : amount(cost);
      order.status = 'delivered';
    }
  }

  function checkedBackup(state) {
    const require = condition => { if (!condition) throw new Error('O arquivo não é um backup válido do Cookies Paty.'); };
    const scalar = n => Number.isFinite(n) && Math.abs(n) <= 1e14;
    const nonnegative = n => scalar(n) && n >= 0;
    const count = n => Number.isInteger(n) && n > 0 && n <= 1000000;
    const string = s => typeof s === 'string' && s.length <= 250;
    const label = s => string(s) && s.trim().length > 0;
    const dates = s => { try { return day(s) === s; } catch { return false; } };
    const nullable = n => n === null || nonnegative(n);
    require(state?.version === 1);
    for (const key of ['items', 'products', 'movements', 'batches', 'orders', 'cash']) {
      require(Array.isArray(state[key]) && state[key].every(row => row && label(row.id)));
      require(new Set(state[key].map(row => row.id)).size === state[key].length);
    }
    const items = new Set(state.items.map(row => row.id));
    const products = new Set(state.products.map(row => row.id));
    const batches = new Set(state.batches.map(row => row.id));
    const formula = rows => Array.isArray(rows) && new Set(rows.map(row => row?.[0])).size === rows.length
      && rows.every(row => Array.isArray(row) && row.length === 2 && items.has(row[0]) && nonnegative(row[1]) && row[1] > 0);
    const validCash = row => row && label(row.id) && dates(row.date) && label(row.label) && nonnegative(row.value) && row.value > 0
      && ['sale', 'expense', 'purchase', 'refund', 'legacy-sale', 'legacy-expense'].includes(row.kind);
    require(state.items.every(row => label(row.name) && ['g', 'mL', 'm', 'un.'].includes(row.unit) && nonnegative(row.pack) && row.pack > 0 && nullable(row.price) && string(row.supplier) && nonnegative(row.minimum)));
    require(state.products.every(row => label(row.name) && count(row.yield) && nullable(row.price) && nonnegative(row.overhead) && formula(row.ingredients) && row.ingredients.length > 0 && formula(row.packaging)));
    require(state.movements.every(row => items.has(row.item) && dates(row.date) && scalar(row.quantity) && row.quantity !== 0 && string(row.note)));
    require(state.batches.every(row => products.has(row.product) && dates(row.date) && label(row.name) && count(row.planned) && count(row.quantity) && nullable(row.cost)));
    require(state.orders.every(row => dates(row.date) && dates(row.due) && label(row.customer) && nonnegative(row.total) && nullable(row.cost)
      && ['open', 'delivered', 'cancelled'].includes(row.status) && typeof row.paid === 'boolean'
      && Array.isArray(row.lines) && row.lines.length && row.lines.every(line => line && products.has(line.product) && label(line.name) && count(line.quantity) && nonnegative(line.price))
      && Array.isArray(row.allocations) && row.allocations.every(pair => Array.isArray(pair) && pair.length === 2 && batches.has(pair[0]) && count(pair[1]))));
    require(state.cash.every(validCash));
    require([...stock(state).values()].every(value => value >= 0) && [...batchLeft(state).values()].every(value => value >= 0));
    return state;
  }

  function importHistory(state, history) {
    if (history?.source !== 'cookie.xlsx/Balanço' || !Array.isArray(history.rows)) throw new Error('Selecione o arquivo de histórico do Excel.');
    checkedBackup({ ...state, cash: history.rows });
    if (history.rows.some(row => !/^excel-balanco-[ei]\d+$/.test(row.id) || !['legacy-sale', 'legacy-expense'].includes(row.kind))) {
      throw new Error('O arquivo de histórico contém lançamentos inválidos.');
    }
    const known = new Set(state.cash.map(row => row.id));
    const records = history.rows.filter(row => !known.has(row.id));
    state.cash.push(...records);
    return records.length;
  }

  return { round, amount, byId, get, date, id, numeric, text, day, units, stock, finished, plan, cashEntry, movement, produce, addOrder, updateOrder, checkedBackup, importHistory };
})();
