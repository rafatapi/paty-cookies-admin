// cookie.xlsx: “Massa Branca” e “Massa Preta”, coluna D (quantidades normalizadas).
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

function scaleIngredients(recipeId, factor, addInId) {
  const recipe = recipes[recipeId];
  const ingredients = [
    { id: 'farinha', name: 'Farinha de trigo', amount: recipe.flour, unit: 'g' },
    ...commonIngredients,
  ];
  if (recipe.cocoa) {
    ingredients.splice(1, 0, { id: 'chocolate', name: 'Chocolate em pó 50%', amount: recipe.cocoa, unit: 'g' });
  }
  if (addIns[addInId]) {
    ingredients.push({ id: 'gotas', name: addIns[addInId], amount: 400, unit: 'g' });
  }
  return ingredients.map(({ amount, name, plural, ...ingredient }) => {
    const quantity = amount * factor;
    return { ...ingredient, quantity, name: quantity > 1 && plural ? plural : name };
  });
}

// Adaptado da aba “Receita” para as duas massas.
function preparationSteps(recipeId, addInId) {
  const dryIngredients = recipes[recipeId].cocoa
    ? 'a farinha, o chocolate em pó, o amido, o bicarbonato e o sal'
    : 'a farinha, o amido, o bicarbonato e o sal';
  const steps = [
    'Misture ' + dryIngredients + '. Reserve.',
    'Bata a manteiga em temperatura ambiente por 1 minuto. Adicione os dois açúcares e bata por mais 3 minutos.',
    'Acrescente o ovo e a baunilha. Misture bem.',
    'Junte a mistura de secos aos poucos, até incorporar.',
  ];
  if (addIns[addInId]) steps.push('Acrescente as gotas de chocolate.');
  steps.push('Leve à geladeira por 30 minutos.');
  return steps;
}