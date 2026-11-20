// cookie.xlsx: "Massa Branca" e "Massa Preta", coluna D (quantidades normalizadas).
const commonIngredients = [
  { id: 'amido', name: 'Amido de milho', amount: 10, unit: 'g' },
  { id: 'bicarbonato', name: 'Bicarbonato de sódio', amount: 5, unit: 'g' },
  { id: 'sal', name: 'Sal', amount: 5, unit: 'g' },
  { id: 'manteiga', name: 'Manteiga sem sal', amount: 340, unit: 'g' },
  { id: 'mascavo', name: 'Açúcar mascavo', amount: 300, unit: 'g' },
  { id: 'cristal', name: 'Açúcar cristal', amount: 225, unit: 'g' },
  { id: 'ovos', name: 'Ovo grande', plural: 'Ovos grandes', amount: 2, unit: 'un.' },
  { id: 'baunilha', name: 'Essência de baunilha', amount: 5, unit: 'mL' },
];

const cookiesPerRecipe = 26;
const doughGramsPerRecipe = 1295;
const mixerBowlTare = 295;

const recipes = {
  branca: { label: 'Massa branca', flour: 675, cocoa: 0 },
  chocolate: { label: 'Massa de chocolate', flour: 565, cocoa: 110 },
};

const portions = {
  0.5: 'Meia receita',
  1: 'Receita inteira',
  2: 'Receita dobrada',
};

const addIns = {
  nenhum: null,
  leite: 'Gotas de chocolate ao leite',
  'meio-amargo': 'Gotas de chocolate meio amargo',
  branco: 'Gotas de chocolate branco',
};

function finishingIngredients(recipeId, addInId) {
  const recipe = recipes[recipeId];
  const ingredients = [{ id: 'farinha', name: 'Farinha de trigo', amount: recipe.flour, unit: 'g' }];
  if (recipe.cocoa) {
    ingredients.push({ id: 'chocolate', name: 'Chocolate em pó 50%', amount: recipe.cocoa, unit: 'g' });
  }
  if (addIns[addInId]) {
    ingredients.push({ id: 'gotas', name: addIns[addInId], amount: 400, unit: 'g' });
  }
  return ingredients;
}

function scaleRows(ingredients, factor) {
  return ingredients.map(({ amount, name, plural, ...ingredient }) => {
    const quantity = amount * factor;
    return { ...ingredient, quantity, name: quantity > 1 && plural ? plural : name };
  });
}

function scaleIngredients(recipeId, factor, addInId) {
  const finishing = finishingIngredients(recipeId, addInId);
  const dry = finishing.filter(item => item.id !== 'gotas');
  const drops = finishing.filter(item => item.id === 'gotas');
  return scaleRows([...dry, ...commonIngredients, ...drops], factor);
}

function recipeBatch(factor, white, addInId) {
  const total = factor * cookiesPerRecipe;
  if (!Object.hasOwn(portions, factor) || !Number.isInteger(white) || white < 0 || white > total) {
    throw new RangeError('Divisão de cookies inválida.');
  }
  const groups = [{ label: 'Base comum · ' + total + ' cookies', ingredients: scaleRows(commonIngredients, factor) }];
  for (const [id, count] of [['branca', white], ['chocolate', total - white]]) {
    if (count === 0) continue;
    groups.push({
      label: recipes[id].label + ' · ' + count + (count === 1 ? ' cookie' : ' cookies'),
      ingredients: scaleRows(finishingIngredients(id, addInId), count / cookiesPerRecipe)
        .map(item => ({ ...item, id: id + ':' + item.id })),
    });
  }
  return groups;
}

function splitBaseByWeight(gross, white, total) {
  const net = Math.round((gross - mixerBowlTare) * 10) / 10;
  const whiteWeight = Math.round(net * white / total * 10) / 10;
  return { net, white: whiteWeight, chocolate: Math.round((net - whiteWeight) * 10) / 10 };
}

function batchPreparation(white, chocolate, addInId) {
  const steps = [
    'Bata a manteiga em temperatura ambiente por 1 minuto. Adicione os dois açúcares e bata por mais 3 minutos.',
    'Acrescente a baunilha e os ovos inteiros indicados. Misture bem e incorpore o amido, o bicarbonato e o sal.',
  ];
  if (white && chocolate) {
    steps.push('Pese a tigela com a base e informe o valor em “Dividir a base na balança”. Separe o peso indicado para cada massa antes de adicionar farinha e chocolate em pó.');
  }
  if (white) steps.push('Na porção branca, incorpore a farinha separada para ela.');
  if (chocolate) steps.push('Na porção de chocolate, misture a farinha e o chocolate em pó. Incorpore à base dessa porção.');
  if (addIns[addInId]) steps.push('Acrescente as gotas nas quantidades indicadas para cada porção.');
  steps.push('Leve à geladeira por 30 minutos.');
  return steps;
}
