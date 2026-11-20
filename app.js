const storageKey = 'cookies-paty:receita:v1';
const defaults = { recipe: 'branca', factor: '0.5', addIn: 'nenhum', checked: [] };
const format = new Intl.NumberFormat('pt-BR');
const list = document.querySelector('#ingredient-list');
const reset = document.querySelector('#clear');
const progress = document.querySelector('#progress');
const summary = document.querySelector('#recipe-summary');
const addIn = document.querySelector('#adicional');
const steps = document.querySelector('#steps');

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    if (value && Object.hasOwn(recipes, value.recipe)
      && Object.hasOwn(portions, value.factor) && Object.hasOwn(addIns, value.addIn)
      && Array.isArray(value.checked)) {
      return value;
    }
  } catch {
    // A calculadora continua disponível quando o navegador bloqueia o armazenamento.
  }
  return { ...defaults };
}

const state = load();

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
  progress.textContent = format.format(checked.length) + ' de ' + format.format(items.length) + ' separados';
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

function render() {
  const ingredients = scaleIngredients(state.recipe, Number(state.factor), state.addIn);
  summary.textContent = recipes[state.recipe].label + ' · ' + portions[state.factor];
  list.replaceChildren(...ingredients.map(ingredientRow));
  steps.replaceChildren(...preparationSteps(state.recipe, state.addIn).map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  updateProgress();
}

for (const radio of document.querySelectorAll('input[type="radio"]')) {
  const property = radio.name === 'massa' ? 'recipe' : 'factor';
  radio.checked = radio.value === state[property];
  radio.addEventListener('change', () => {
    state[property] = radio.value;
    state.checked = [];
    render();
  });
}

addIn.value = state.addIn;
addIn.addEventListener('change', () => {
  state.addIn = addIn.value;
  state.checked = state.checked.filter(id => id !== 'gotas');
  render();
});

list.addEventListener('change', updateProgress);
reset.addEventListener('click', () => {
  for (const check of list.querySelectorAll('input')) check.checked = false;
  updateProgress();
  list.querySelector('input')?.focus();
});
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