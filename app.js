const storageKey = 'cookies-paty:receita:v2';
const defaults = { factor: '0.5', white: 13, addIn: 'nenhum', checked: [] };
const format = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const list = document.querySelector('#ingredient-list');
const reset = document.querySelector('#clear');
const progress = document.querySelector('#progress');
const summary = document.querySelector('#recipe-summary');
const addIn = document.querySelector('#adicional');
const steps = document.querySelector('#steps');
const totalDisplay = document.querySelector('#cookie-total');
const countInputs = [...document.querySelectorAll('[data-dough]')];
const portionsInputs = [...document.querySelectorAll('input[name="porcao"]')];
const massReference = document.querySelector('#mass-reference');
const bowlWeight = document.querySelector('#bowl-weight');
const baseSplit = document.querySelector('#base-split');

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    if (value && Object.hasOwn(portions, value.factor) && Object.hasOwn(addIns, value.addIn)
      && Number.isInteger(value.white) && value.white >= 0 && value.white <= Number(value.factor) * cookiesPerRecipe
      && Array.isArray(value.checked)) {
      return value;
    }
    const previous = JSON.parse(localStorage.getItem('cookies-paty:receita:v1'));
    if (previous && Object.hasOwn(portions, previous.factor) && Object.hasOwn(addIns, previous.addIn)
      && Object.hasOwn(recipes, previous.recipe)) {
      const white = previous.recipe === 'branca' ? Number(previous.factor) * cookiesPerRecipe : 0;
      return { factor: previous.factor, white, addIn: previous.addIn, checked: [] };
    }
  } catch {
    // A calculadora continua disponível quando o navegador bloqueia o armazenamento.
  }
  return { ...defaults };
}

const state = load();
const totalCookies = () => Number(state.factor) * cookiesPerRecipe;
const grams = value => format.format(value) + '\u00a0g';

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // A sessão atual continua funcional.
  }
}

function updateProgress() {
  const items = [...list.querySelectorAll('input')];
  const checked = items.filter(item => item.checked);
  progress.textContent = checked.length + ' de ' + items.length + ' separados';
  reset.disabled = checked.length === 0;
  state.checked = checked.map(item => item.value);
  save();
}

function ingredientRow(ingredient) {
  const row = document.createElement('li');
  const label = document.createElement('label');
  const check = document.createElement('input');
  const name = document.createElement('span');
  const quantity = document.createElement('strong');
  check.type = 'checkbox';
  check.value = ingredient.id;
  check.checked = state.checked.includes(ingredient.id);
  name.className = 'ingredient-name';
  name.textContent = ingredient.name;
  quantity.textContent = format.format(ingredient.quantity) + '\u00a0' + ingredient.unit;
  label.append(check, name, quantity);
  row.append(label);
  return row;
}

function ingredientGroup(group) {
  const section = document.createElement('section');
  const title = document.createElement('h3');
  const rows = document.createElement('ul');
  title.textContent = group.label;
  rows.className = 'ingredient-list';
  rows.append(...group.ingredients.map(ingredientRow));
  section.append(title, rows);
  return section;
}

function syncCounts(active) {
  for (const input of countInputs) {
    input.max = totalCookies();
    if (input !== active) input.value = input.dataset.dough === 'branca' ? state.white : totalCookies() - state.white;
  }
  totalDisplay.textContent = totalCookies() + ' cookies no lote. A outra massa completa o total.';
}

function updateBaseSplit() {
  if (!bowlWeight.value) {
    baseSplit.textContent = '';
    return;
  }
  const gross = bowlWeight.valueAsNumber;
  if (!bowlWeight.validity.valid || !Number.isFinite(gross) || gross <= mixerBowlTare) {
    baseSplit.textContent = 'Informe um peso maior que a tara de ' + grams(mixerBowlTare) + '.';
    return;
  }
  const weight = splitBaseByWeight(gross, state.white, totalCookies());
  const parts = [];
  if (state.white) parts.push(grams(weight.white) + ' para a branca');
  if (state.white < totalCookies()) parts.push(grams(weight.chocolate) + ' para a de chocolate');
  baseSplit.textContent = 'Peso da base sem a tigela: ' + grams(weight.net) + ' · ' + parts.join(' e ');
}

function render() {
  const factor = Number(state.factor);
  const total = totalCookies();
  const chocolate = total - state.white;
  const groups = recipeBatch(factor, state.white, state.addIn);
  summary.textContent = portions[state.factor] + ' · ' + state.white + ' brancos e ' + chocolate + ' de chocolate';
  massReference.textContent = grams(doughGramsPerRecipe * factor) + ' de massa sem tigela · '
    + grams(doughGramsPerRecipe * factor + mixerBowlTare) + ' com a tigela';
  list.replaceChildren(...groups.map(ingredientGroup));
  steps.replaceChildren(...batchPreparation(state.white, chocolate, state.addIn).map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  updateBaseSplit();
  updateProgress();
}

for (const radio of portionsInputs) {
  radio.checked = radio.value === state.factor;
  radio.addEventListener('change', () => {
    const whiteShare = state.white / totalCookies();
    state.factor = radio.value;
    state.white = Math.round(whiteShare * totalCookies());
    state.checked = [];
    bowlWeight.value = '';
    syncCounts();
    render();
  });
}

for (const input of countInputs) {
  input.addEventListener('input', () => {
    const count = input.valueAsNumber;
    if (!Number.isInteger(count) || count < 0 || count > totalCookies()) return;
    const white = input.dataset.dough === 'branca' ? count : totalCookies() - count;
    if (state.white !== white) {
      state.white = white;
      state.checked = state.checked.filter(id => !id.includes(':'));
      render();
    }
    syncCounts(input);
  });
  input.addEventListener('blur', () => syncCounts());
}

addIn.value = state.addIn;
addIn.addEventListener('change', () => {
  state.addIn = addIn.value;
  state.checked = state.checked.filter(id => !id.endsWith(':gotas'));
  render();
});

bowlWeight.addEventListener('input', updateBaseSplit);
list.addEventListener('change', updateProgress);
reset.addEventListener('click', () => {
  for (const check of list.querySelectorAll('input')) check.checked = false;
  updateProgress();
  list.querySelector('input')?.focus();
});
syncCounts();
render();

const connection = document.querySelector('#connection');

function showConnection(message, ready = false) {
  connection.textContent = message;
  connection.hidden = false;
  connection.classList.toggle('ready', ready);
}

if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
  document.querySelector('#install').hidden = true;
}

if (location.protocol === 'file:') {
  showConnection('Arquivo local');
} else if ('serviceWorker' in navigator) {
  const worker = navigator.serviceWorker;
  const showReady = () => showConnection('Pronto para offline', true);
  if (worker.controller) showReady();
  worker.addEventListener('controllerchange', showReady, { once: true });
  worker.register('./sw.js').catch(() => {
    if (!worker.controller) showConnection('Offline indisponível');
  });
} else {
  showConnection('Offline requer HTTPS');
}
