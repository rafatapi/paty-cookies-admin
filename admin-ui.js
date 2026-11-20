const patyAdmin = (() => {
  const business = patyBusiness;
  const workspace = document.querySelector('#workspace');
  const calculator = document.querySelector('#calculator');
  const nav = document.querySelector('#admin-nav');
  const notice = document.querySelector('#admin-notice');
  const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 });
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const calendar = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
  const labels = {
    home: 'Início', receitas: 'Calculadora', estoque: 'Estoque', fichas: 'Fichas e preços',
    producao: 'Produção', pedidos: 'Pedidos', caixa: 'Caixa', dados: 'Dados',
  };
  const movementLabels = { opening: 'Saldo inicial', purchase: 'Compra', addition: 'Ajuste de entrada', loss: 'Perda / ajuste de saída', production: 'Produção' };
  const cashLabels = { sale: 'Recebimento', purchase: 'Compra', expense: 'Despesa', refund: 'Estorno', 'legacy-sale': 'Encomenda do Excel', 'legacy-expense': 'Despesa do Excel' };
  let state;
  let view;
  let selectedItem;
  let selectedProduct;
  let selectedPlan;
  let cashMonth = business.date().slice(0, 7);
  let busy = false;

  const html = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const num = value => formatter.format(value);
  const money = value => value == null ? '—' : currency.format(value);
  const date = value => calendar.format(new Date(value));
  const qty = (value, unit) => num(value) + ' ' + unit;
  const sorted = rows => [...rows].reverse().sort((a, b) => b.date.localeCompare(a.date));
  const empty = text => '<p class="admin-empty">' + text + '</p>';
  const heading = (title, description) => '<h1>' + title + '</h1><p class="admin-intro">' + description + '</p>';
  const panel = (title, body, css = '') => '<section class="admin-panel ' + css + '"><h2>' + title + '</h2>' + body + '</section>';
  const action = (label, command, id = '') => '<button type="button" class="admin-button secondary" data-action="' + command + '" data-id="' + html(id) + '">' + label + '</button>';
  const submit = label => '<button class="admin-button" type="submit">' + label + '</button>';
  const form = (name, body) => '<form class="admin-form" data-form="' + name + '">' + body + '</form>';
  const field = (label, control) => '<label class="admin-field"><span>' + label + '</span>' + control + '</label>';
  const input = (name, value = '', attributes = '') => '<input name="' + name + '" value="' + html(value) + '" ' + attributes + '>';
  const number = (name, value = '', min = 0, step = '0.000001', required = true) =>
    input(name, value, 'type="number" inputmode="' + (step === 1 ? 'numeric' : 'decimal') + '" min="' + min + '" max="1000000000" step="' + step + '"' + (required ? ' required' : ''));
  const dayField = (name, label) => field(label, input(name, business.date(), 'type="date" required'));
  const textField = (name, label, value = '', required = false) => field(label, input(name, value, 'maxlength="180"' + (required ? ' required' : '')));
  const line = (...fields) => '<div class="admin-fields">' + fields.join('') + '</div>';
  const options = (choices, current) => choices.map(([value, label]) => '<option value="' + html(value) + '"' + (value === current ? ' selected' : '') + '>' + html(label) + '</option>').join('');
  const select = (name, choices, current) => '<select name="' + name + '">' + options(choices, current) + '</select>';
  const choices = list => list.map(entry => [entry.id, entry.name]);
  const table = (headers, rows) => '<div class="admin-table-wrap"><table><thead><tr>' + headers.map(header => '<th scope="col">' + header + '</th>').join('') +
    '</tr></thead><tbody>' + rows.map(cells => '<tr>' + cells.map(cell => '<td>' + cell + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  const metric = (label, value, link) => '<a class="admin-metric" href="#' + link + '"><span>' + label + '</span><strong>' + value + '</strong></a>';
  const addMoney = rows => business.amount(rows.reduce((sum, entry) => sum + entry.value, 0));
  const credit = row => ['sale', 'legacy-sale'].includes(row.kind);
  const monthRows = month => state.cash.filter(row => !month || row.date.startsWith(month));
  const controls = (...elements) => '<div class="admin-actions">' + elements.join('') + '</div>';
  const badge = (label, warn = false) => '<span class="admin-pill' + (warn ? ' warning' : '') + '">' + label + '</span>';

  function openOrders() {
    return state.orders.filter(order => order.status === 'open').sort((a, b) => a.due.localeCompare(b.due));
  }

  function home() {
    const today = business.date();
    const cash = monthRows(today.slice(0, 7));
    const balance = business.stock(state);
    const low = state.items.filter(item => balance.get(item.id) <= item.minimum);
    const pending = openOrders();
    const ready = [...business.finished(state).values()].reduce((total, value) => total + value, 0);
    return heading('Painel da Paty', 'Acompanhe as próximas entregas, os insumos e o caixa do mês.') +
      '<div class="admin-metrics">' + [
        metric('Pedidos em aberto', num(pending.length), 'pedidos'),
        metric('Cookies prontos', num(ready), 'producao'),
        metric('Insumos no mínimo', num(low.length), 'estoque'),
        metric('Saldo de caixa no mês', money(addMoney(cash.filter(credit)) - addMoney(cash.filter(row => !credit(row)))), 'caixa'),
      ].join('') + '</div>' +
      '<div class="admin-grid">' +
      panel('Próximas entregas', pending.length ? table(['Data', 'Cliente', 'Total'], pending.slice(0, 8).map(order => [
        date(order.due) + (order.due < today ? ' ' + badge('Atrasado', true) : ''), html(order.customer), money(order.total),
      ])) : empty('Nenhum pedido aguardando entrega.')) +
      panel('Insumos para conferir', low.length ? table(['Insumo', 'Saldo'], low.slice(0, 8).map(item => [html(item.name), qty(balance.get(item.id), item.unit)])) : empty('Todos os insumos estão acima do mínimo.')) +
      '</div>';
  }

  function stockView() {
    const balances = business.stock(state);
    const editing = business.byId(state.items, selectedItem);
    const item = editing ?? { unit: 'g', minimum: 0 };
    const latest = sorted(state.movements).slice(0, 20);
    return heading('Estoque', 'Registre o saldo inicial contado, compras, ajustes e perdas. A produção dá baixa nos insumos automaticamente.') +
      controls(action('Registrar movimento', 'stock-entry'), action('Cadastrar insumo', 'item-new')) +
      panel('Saldos dos insumos', state.items.length ? table(['Insumo', 'Disponível', 'Mínimo', 'Preço de referência', ''], state.items.map(row => [
        html(row.name), qty(balances.get(row.id), row.unit) + (balances.get(row.id) <= row.minimum ? ' ' + badge('Repor', true) : ''),
        qty(row.minimum, row.unit), row.price == null ? 'Sem preço' : money(row.price) + ' / ' + qty(row.pack, row.unit),
        action('Editar', 'item-edit', row.id),
      ])) : empty('Cadastre o primeiro insumo.')) +
      '<div class="admin-grid">' + panel('Movimentar estoque', state.items.length ? form('movement',
        line(field('Insumo', select('item', choices(state.items), editing?.id)), field('Movimento', select('kind', Object.entries(movementLabels).filter(([key]) => key !== 'production'), 'purchase'))) +
        line(dayField('date', 'Data'), field('<span data-quantity-label>Quantidade</span>', number('quantity', '', 0.000001))) +
        '<div class="admin-purchase">' + line(field('Total pago (R$)', number('value', '', 0.01, '0.01')), field('Embalagens compradas', number('packs', 1, 1, 1))) +
        textField('supplier', 'Fornecedor') + '</div>' + textField('note', 'Observação') + submit('Registrar movimento')
      ) : empty('Cadastre um insumo para registrar movimentos.')) +
      panel(editing ? 'Editar insumo' : 'Novo insumo', form('item',
        textField('name', 'Nome', item.name, true) +
        line(editing ? '<p class="admin-hint">Unidade de controle: ' + item.unit + '</p>' :
          field('Unidade de controle', select('unit', [['g', 'Gramas'], ['mL', 'Mililitros'], ['un.', 'Unidades'], ['m', 'Metros']], item.unit)),
        field('Estoque mínimo', number('minimum', item.minimum))) +
        line(field('Quantidade por embalagem', number('pack', item.pack ?? 1, 0.000001)), field('Preço da embalagem (R$)', number('price', item.price ?? '', 0, '0.01', false))) +
        textField('supplier', 'Fornecedor de referência', item.supplier) +
        controls(submit('Salvar insumo'), editing ? action('Novo insumo', 'item-new') : '')
      ), 'item-editor') + '</div>' +
      panel('Últimos movimentos', latest.length ? table(['Data', 'Insumo', 'Tipo', 'Quantidade', 'Detalhe'], latest.map(row => {
        const current = business.get(state.items, row.item);
        return [date(row.date), html(current.name), movementLabels[row.kind] ?? 'Ajuste', qty(row.quantity, current.unit), html([row.supplier, row.note].filter(Boolean).join(' · ')) || '—'];
      })) : empty('Nenhum movimento registrado.'));
  }

  function formulaFields(product, category) {
    const existing = new Map(product[category]);
    return '<details class="admin-details"><summary>' + (category === 'ingredients' ? 'Ingredientes da receita inteira' : 'Embalagem por cookie') +
      ' · ' + existing.size + ' itens</summary><div class="admin-fields">' + state.items.map(item =>
        field(html(item.name) + ' (' + item.unit + ')', number(category + ':' + item.id, existing.get(item.id) ?? '', 0, '0.000001', false))
      ).join('') + '</div></details>';
  }

  function productsView() {
    const editing = business.byId(state.products, selectedProduct);
    const product = editing ?? { ingredients: [], packaging: [], overhead: 0 };
    return heading('Fichas e preços', 'Ajuste os rendimentos, as receitas dos sabores e o preço de venda. Os preços de insumos do Excel são referências iniciais.') +
      panel('Catálogo de sabores', state.products.length ? table(['Sabor', 'Rendimento', 'Custo estimado/un.', 'Preço/un.', 'Margem estimada', ''], state.products.map(row => {
        const cost = business.plan(state, row, row.yield).total;
        const unitCost = cost == null ? null : cost / row.yield;
        const margin = unitCost != null && row.price > 0 ? num(Math.round((1 - unitCost / row.price) * 1000) / 10) + '%' : '—';
        return [html(row.name), num(row.yield), money(unitCost), money(row.price), margin, action('Editar', 'product-edit', row.id)];
      })) : empty('Cadastre a primeira ficha.')) +
      '<div class="admin-grid">' + panel(editing ? 'Editar ficha técnica' : 'Novo sabor', form('product',
        textField('name', 'Nome do sabor', product.name, true) +
        line(field('Rendimento da receita inteira', number('yield', product.yield ?? '', 1, 1)),
          field('Preço de venda por cookie (R$)', number('price', product.price ?? '', 0, '0.01', false)),
          field('Outros custos por cookie (R$)', number('overhead', product.overhead, 0, '0.01'))) +
        '<p class="admin-hint">Use outros custos para incluir mão de obra, energia ou taxas fixas por cookie, se fizer sentido para sua operação.</p>' +
        formulaFields(product, 'ingredients') + formulaFields(product, 'packaging') +
        controls(submit('Salvar ficha'), editing ? action('Novo sabor', 'product-new') : '')
      ), 'product-editor') +
      panel('Simular um preço', state.products.length ? form('pricing',
        field('Sabor', select('product', choices(state.products), selectedProduct)) +
        field('Margem desejada sobre a venda (%)', input('margin', 30, 'type="number" min="0" max="99" step="0.1" required')) +
        '<p class="admin-result" data-result aria-live="polite"></p>'
      ) : empty('Cadastre um sabor para simular preços.')) + '</div>';
  }

  function productionView() {
    const ready = business.finished(state);
    const needs = new Map();
    for (const order of openOrders()) for (const item of order.lines) {
      needs.set(item.product, (needs.get(item.product) ?? 0) + item.quantity);
    }
    const batches = sorted(state.batches).slice(0, 20);
    const picked = business.byId(state.products, selectedPlan) ?? state.products[0];
    return heading('Produção', 'Planeje a quantidade e confira o que falta comprar. Ao registrar o lote, o app baixa os insumos e soma os cookies prontos.') +
      '<div class="admin-grid">' +
      panel('Planejar e registrar lote', picked ? form('batch',
        field('Sabor', select('product', choices(state.products), picked.id)) +
        line(field('Cookies planejados', number('planned', picked.yield, 1, 1)), field('Cookies feitos e embalados', number('actual', picked.yield, 1, 1))) +
        dayField('date', 'Data da produção') + '<div class="admin-plan" data-result></div>' + submit('Registrar lote')
      ) : empty('Cadastre uma ficha técnica para planejar um lote.')) +
      panel('Cookies disponíveis e demanda', state.products.length ? table(['Sabor', 'Prontos', 'Pedidos', 'A produzir'], state.products.map(item => {
        const demand = needs.get(item.id) ?? 0;
        const readyCount = ready.get(item.id);
        return [html(item.name), num(readyCount), num(demand), num(Math.max(demand - readyCount, 0))];
      })) : empty('Ainda não há sabores cadastrados.')) + '</div>' +
      panel('Últimos lotes', batches.length ? table(['Data', 'Sabor', 'Planejados', 'Feitos', 'Custo do lote', 'Custo/un.'], batches.map(batch => [
        date(batch.date), html(batch.name), num(batch.planned), num(batch.quantity), money(batch.cost), money(batch.cost == null ? null : batch.cost / batch.quantity),
      ])) : empty('Nenhum lote registrado.'));
  }

  function orderLine() {
    const product = state.products[0];
    return '<div class="admin-order-line">' +
      field('Sabor', select('product', choices(state.products), product.id)) +
      field('Quantidade', number('quantity', 1, 1, 1)) +
      field('Preço por cookie (R$)', number('price', product.price ?? '', 0, '0.01')) +
      action('Remover item', 'order-remove') + '</div>';
  }

  function ordersView() {
    const rows = [...openOrders(), ...sorted(state.orders.filter(order => order.status !== 'open'))];
    return heading('Pedidos', 'Cadastre encomendas com vários sabores. Registre o pagamento e marque a entrega quando houver cookies prontos.') +
      panel('Nova encomenda', state.products.length ? form('order',
        line(textField('customer', 'Cliente', '', true), dayField('date', 'Data do pedido'), dayField('due', 'Entrega prevista')) +
        '<div data-order-lines>' + orderLine() + '</div>' +
        controls(action('Adicionar sabor', 'order-add'), submit('Salvar pedido')) + '<p class="admin-result" data-result aria-live="polite"></p>'
      ) : empty('Cadastre um sabor antes de criar um pedido.')) +
      panel('Acompanhamento', rows.length ? '<div class="admin-order-list">' + rows.map(order => {
        const isOpen = order.status === 'open';
        const active = order.status !== 'cancelled';
        const status = isOpen ? (order.due < business.date() ? 'Atrasado' : 'Em aberto') : active ? 'Entregue' : 'Cancelado';
        return '<article class="admin-order"><header><h3>' + html(order.customer) + '</h3>' + badge(status, status === 'Atrasado') + '</header>' +
          '<p>Entrega ' + date(order.due) + ' · ' + money(order.total) + (active ? (order.paid ? ' · Pago' : ' · A receber') : '') + '</p>' +
          '<ul>' + order.lines.map(item => '<li>' + num(item.quantity) + ' × ' + html(item.name) + ' · ' + money(item.price) + '/un.</li>').join('') + '</ul>' +
          (order.status === 'delivered' && order.cost != null ? '<p>Resultado sobre o custo dos lotes: ' + money(business.amount(order.total - order.cost)) + '</p>' : '') +
          controls(active && !order.paid ? action('Registrar pagamento', 'order-pay', order.id) : '',
            isOpen ? action('Marcar entregue', 'order-deliver', order.id) + action('Cancelar pedido', 'order-cancel', order.id) : '') + '</article>';
      }).join('') + '</div>' : empty('Nenhum pedido cadastrado.'));
  }

  function cashView() {
    const filtered = monthRows(cashMonth);
    const incoming = addMoney(filtered.filter(credit));
    const outgoing = addMoney(filtered.filter(row => !credit(row)));
    return heading('Caixa', 'Compras e recebimentos entram automaticamente. Registre aqui as demais despesas pagas.') +
      '<div class="admin-grid">' + panel('Lançar despesa', form('expense',
        line(dayField('date', 'Data do pagamento'), field('Valor pago (R$)', number('value', '', 0.01, '0.01'))) +
        textField('label', 'Descrição', '', true) + submit('Salvar despesa')
      )) + panel('Resumo do período', line(field('Mês', input('month', cashMonth, 'type="month" data-month'))) +
        controls(action('Todo o histórico', 'cash-all')) +
        '<dl class="admin-cash"><div><dt>Entradas</dt><dd>' + money(incoming) +
        '</dd></div><div><dt>Saídas</dt><dd>' + money(outgoing) + '</dd></div><div><dt>Saldo</dt><dd>' + money(incoming - outgoing) + '</dd></div></dl>') + '</div>' +
      panel('Lançamentos', filtered.length ? table(['Data', 'Tipo', 'Descrição', 'Valor'], sorted(filtered).map(row => [
        date(row.date), cashLabels[row.kind], html(row.label), money(row.value * (credit(row) ? 1 : -1)),
      ])) : empty('Sem lançamentos neste período.'));
  }

  function dataView() {
    return heading('Dados e backup', 'Os registros ficam neste navegador. Exporte uma cópia regularmente e antes de trocar de aparelho ou navegador.') +
      '<div class="admin-grid">' +
      panel('Backup completo', '<p>O arquivo leva estoque, fichas, lotes, pedidos e caixa. Guarde-o em um local privado.</p>' +
        controls(action('Exportar backup', 'backup')) +
        form('restore', field('Restaurar arquivo JSON', input('file', '', 'type="file" accept=".json,application/json" required')) + submit('Restaurar banco'))) +
      panel('Histórico da planilha', '<p>No computador, selecione <strong>dados/origem/historico-excel.json</strong>. Os lançamentos entram no caixa histórico sem alterar o estoque atual.</p>' +
        form('legacy', field('Arquivo de histórico', input('file', '', 'type="file" accept=".json,application/json" required')) + submit('Importar histórico')) +
        '<p class="admin-hint">As abas da planilha original continuam disponíveis em dados/origem.</p>') + '</div>';
  }

  function show(message, error = false) {
    notice.textContent = message;
    notice.hidden = !message;
    notice.classList.toggle('warning', error);
  }

  function render() {
    nav.querySelectorAll('a').forEach(link => {
      if (link.hash.slice(1) === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    calculator.hidden = view !== 'receitas';
    workspace.hidden = view === 'receitas';
    if (workspace.hidden) return;
    const pages = { home, estoque: stockView, fichas: productsView, producao: productionView, pedidos: ordersView, caixa: cashView, dados: dataView };
    workspace.innerHTML = state ? pages[view]() : heading('Dados do aplicativo', 'Não foi possível iniciar o armazenamento deste navegador. A calculadora continua disponível.');
    workspace.querySelectorAll('form').forEach(refresh);
  }

  function refresh(element) {
    const kind = element.dataset.form;
    const fields = new FormData(element);
    const result = element.querySelector('[data-result]');
    if (kind === 'movement') {
      const item = business.get(state.items, fields.get('item'));
      element.querySelector('[data-quantity-label]').textContent = 'Quantidade total (' + item.unit + ')';
      const purchase = fields.get('kind') === 'purchase';
      element.querySelector('.admin-purchase').hidden = !purchase;
      for (const name of ['value', 'packs', 'supplier']) element.elements[name].disabled = !purchase;
    }
    if (kind === 'pricing') {
      const product = business.get(state.products, fields.get('product'));
      const total = business.plan(state, product, product.yield).total;
      const margin = Number(fields.get('margin'));
      const canPrice = total != null && element.elements.margin.validity.valid;
      const price = canPrice ? Math.ceil(total / product.yield / (1 - margin / 100) * 100) / 100 : null;
      result.textContent = 'Custo estimado: ' + money(total == null ? null : total / product.yield) + '/un. · Preço mínimo na margem: ' + money(price);
    }
    if (kind === 'batch') {
      if (!element.elements.planned.validity.valid || !element.elements.actual.validity.valid) {
        result.textContent = 'Informe as quantidades planejada e produzida.';
        return;
      }
      const product = business.get(state.products, fields.get('product'));
      const { rows, total } = business.plan(state, product, Number(fields.get('planned')), Number(fields.get('actual')));
      result.innerHTML = '<p><strong>Custo estimado: ' + money(total) + '</strong>' +
        (total == null ? ' · Há insumos sem preço registrado.' : ' · ' + money(total / Number(fields.get('actual'))) + '/un.') + '</p>' +
        table(['Insumo', 'Usar', 'Em estoque', 'Comprar'], rows.map(row => [
          html(row.item.name), qty(row.quantity, row.item.unit), qty(row.balance, row.item.unit),
          row.missing ? qty(row.missing, row.item.unit) + ' · ' + num(row.packs) + ' emb.' : '—',
        ]));
    }
    if (kind === 'order') {
      const total = orderFields(element).reduce((sum, row) => sum + Number(row.price) * Number(row.quantity), 0);
      result.textContent = 'Total do pedido: ' + money(business.amount(total));
    }
  }

  function orderFields(element) {
    return [...element.querySelectorAll('.admin-order-line')].map(row =>
      Object.fromEntries([...row.querySelectorAll('[name]')].map(control => [control.name, control.value])));
  }

  function saveItem(current, values) {
    const existing = selectedItem ? business.get(current.items, selectedItem) : null;
    const item = {
      id: existing?.id ?? business.id(), name: business.text(values.name, 'nome'),
      unit: existing?.unit ?? values.unit, pack: business.numeric(values.pack, 'embalagem', 0.000001),
      minimum: business.numeric(values.minimum, 'mínimo'),
      price: values.price === '' ? null : business.amount(business.numeric(values.price, 'preço')),
      supplier: values.supplier.trim(),
    };
    if (existing) Object.assign(existing, item);
    else current.items.push(item);
    selectedItem = item.id;
  }

  function saveProduct(current, values) {
    const existing = selectedProduct ? business.get(current.products, selectedProduct) : null;
    const components = category => current.items.flatMap(item => {
      const value = values[category + ':' + item.id];
      if (value === '' || value == null) return [];
      const quantity = business.numeric(value, item.name);
      return quantity > 0 ? [[item.id, quantity]] : [];
    });
    const product = {
      id: existing?.id ?? business.id(), name: business.text(values.name, 'nome'),
      yield: business.units(values.yield, 'rendimento'), overhead: business.amount(business.numeric(values.overhead, 'outros custos')),
      price: values.price === '' ? null : business.amount(business.numeric(values.price, 'preço')),
      ingredients: components('ingredients'), packaging: components('packaging'),
    };
    if (!product.ingredients.length) throw new Error('Informe a quantidade de pelo menos um ingrediente.');
    if (existing) Object.assign(existing, product);
    else current.products.push(product);
    selectedProduct = product.id;
  }

  async function update(action, message) {
    if (busy) return;
    busy = true;
    try {
      state = await patyStore.write(action);
      render();
      show(typeof message === 'function' ? message() : message);
    } catch (error) {
      show(error.message || 'Falha ao gravar. Tente novamente.', true);
    } finally {
      busy = false;
    }
  }

  async function openDataFile(file) {
    if (!file?.size || file.size > 10000000) throw new Error('Selecione um arquivo JSON de até 10 MB.');
    try { return JSON.parse(await file.text()); }
    catch { throw new Error('O arquivo não contém JSON válido.'); }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const element = event.target;
    const fields = Object.fromEntries(new FormData(element));
    const type = element.dataset.form;
    if (type === 'pricing') return;
    if (type === 'restore' || type === 'legacy') {
      try {
        const source = await openDataFile(fields.file);
        if (type === 'restore') {
          const restored = business.checkedBackup(source);
          if (!window.confirm('Substituir todos os dados deste navegador pelos dados do backup?')) return;
          selectedItem = undefined;
          selectedProduct = undefined;
          selectedPlan = undefined;
          await update(() => restored, 'Backup restaurado.');
        } else {
          let count;
          await update(current => { count = business.importHistory(current, source); }, () => count + ' lançamento(s) importado(s). Confira em Caixa → Todo o histórico.');
        }
      } catch (error) {
        show(error.message, true);
      }
      return;
    }
    if (type === 'item') await update(current => { saveItem(current, fields); }, 'Insumo salvo.');
    if (type === 'product') await update(current => { saveProduct(current, fields); }, 'Ficha salva.');
    if (type === 'movement') await update(current => { business.movement(current, fields); }, 'Movimento registrado.');
    if (type === 'batch') await update(current => { business.produce(current, fields); }, 'Lote registrado e estoque atualizado.');
    if (type === 'expense') await update(current => { business.cashEntry(current, fields.date, 'expense', fields.label, fields.value); }, 'Despesa registrada.');
    if (type === 'order') {
      const lines = orderFields(element);
      await update(current => { business.addOrder(current, { ...fields, lines }); }, 'Pedido salvo.');
    }
  }

  function download(data) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Cookies-Paty-backup-' + business.date() + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button || busy) return;
    const { action: command, id } = button.dataset;
    if (['item-edit', 'item-new', 'product-edit', 'product-new'].includes(command)) {
      const stock = command.startsWith('item-');
      if (stock) selectedItem = id || undefined;
      else selectedProduct = id || undefined;
      render();
      const editor = workspace.querySelector(stock ? '.item-editor' : '.product-editor');
      editor.querySelector('[name=name]').focus();
    }
    if (command === 'stock-entry') workspace.querySelector('[data-form=movement] select').focus();
    if (command === 'cash-all') {
      cashMonth = '';
      render();
    }
    if (command === 'backup') {
      try { download(await patyStore.read()); }
      catch (error) { show(error.message, true); }
    }
    if (command === 'order-add') {
      const container = workspace.querySelector('[data-order-lines]');
      container.insertAdjacentHTML('beforeend', orderLine());
      container.lastElementChild.querySelector('select').focus();
      refresh(button.form);
    }
    if (command === 'order-remove') {
      const orderForm = button.form;
      const row = button.closest('.admin-order-line');
      if (row.parentElement.children.length === 1) {
        show('O pedido precisa de pelo menos um sabor.', true);
        return;
      }
      row.remove();
      refresh(orderForm);
    }
    if (['order-pay', 'order-deliver', 'order-cancel'].includes(command)) {
      const verb = command.slice(6);
      if (verb === 'cancel' && !window.confirm('Cancelar este pedido? Se já foi pago, o estorno será lançado no caixa.')) return;
      await update(current => { business.updateOrder(current, id, verb); }, 'Pedido atualizado.');
    }
  }

  async function navigate() {
    const target = location.hash.slice(1);
    view = Object.hasOwn(labels, target) ? target : 'home';
    show('');
    try {
      state = await patyStore.read();
    } catch {
      state = undefined;
      if (view !== 'receitas') show('O armazenamento local está indisponível.', true);
    }
    render();
  }

  nav.innerHTML = Object.entries(labels).map(([key, label]) => '<a href="#' + key + '">' + label + '</a>').join('');
  workspace.addEventListener('submit', handleSubmit);
  workspace.addEventListener('click', handleAction);
  workspace.addEventListener('input', event => {
    const control = event.target;
    const element = control.form;
    if (!element || !control.matches('input:not([type=file], [type=month])')) return;
    if (element.dataset.form === 'batch') {
      if (control.name === 'actual') element.dataset.actualEdited = 'true';
      if (control.name === 'planned' && !element.dataset.actualEdited) element.elements.actual.value = control.value;
    }
    refresh(element);
  });
  workspace.addEventListener('change', event => {
    const control = event.target;
    if (control.matches('[data-month]')) {
      cashMonth = control.value;
      render();
      return;
    }
    const element = control.form;
    if (!element || !control.matches('select')) return;
    if (element.dataset.form === 'batch' && control.name === 'product') {
      selectedPlan = control.value;
      const product = business.get(state.products, selectedPlan);
      element.elements.planned.value = product.yield;
      element.elements.actual.value = product.yield;
      delete element.dataset.actualEdited;
    }
    if (element.dataset.form === 'movement' && control.name === 'item') {
      element.elements.supplier.value = business.get(state.items, control.value).supplier;
    }
    if (element.dataset.form === 'order' && control.name === 'product') {
      const product = business.get(state.products, control.value);
      control.closest('.admin-order-line').querySelector('[name=price]').value = product.price ?? '';
    }
    refresh(element);
  });
  window.addEventListener('hashchange', navigate);
  navigate();
})();
