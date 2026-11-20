const patyCatalog = (() => {
  // Valores de referência das abas Massa Branca, Massa Preta, Custos e Embalagem.
  // A última coluna identifica um fornecedor de referência, quando consta no Excel.
  const items = [
    ['farinha', 'Farinha de trigo', 'g', 1000, 3.39, 'Tauste'],
    ['amido', 'Amido de milho', 'g', 200, 5.29, ''],
    ['bicarbonato', 'Bicarbonato de sódio', 'g', 1000, 19, 'Mercadão'],
    ['sal', 'Sal', 'g', 1000, 2.69, ''],
    ['manteiga', 'Manteiga sem sal', 'g', 500, 4.98, 'Tauste'],
    ['mascavo', 'Açúcar mascavo', 'g', 1000, 8, 'Mercadão'],
    ['cristal', 'Açúcar cristal', 'g', 1000, 2.29, 'Tauste'],
    ['ovos', 'Ovos grandes', 'un.', 12, 10, 'Tauste'],
    ['baunilha', 'Essência de baunilha', 'mL', 30, 2.15, 'Casa do Confeiteiro'],
    ['chocolate', 'Chocolate em pó 50%', 'g', 1000, 40, 'Mercadão'],
    ['gotas-leite', 'Gotas ao leite', 'g', 200, 6.94, 'Casa do Confeiteiro'],
    ['gotas-amargo', 'Gotas meio amargo', 'g', 200, 6.97, 'Casa do Confeiteiro'],
    ['gotas-branco', 'Gotas brancas', 'g', 200, 9.22, 'Casa do Confeiteiro'],
    ['nozes', 'Nozes', 'g', 1000, 72, 'Mercadão'],
    ['macadamia', 'Macadâmias', 'g', 1000, 105, 'Mercadão'],
    ['confeitos', "M&M's", 'g', 80, 4.69, 'Tauste'],
    ['nutella', 'Nutella', 'g', 140, 8.87, 'Tauste'],
    ['doce-leite', 'Doce de leite', 'g', 400, 8.98, 'Tauste'],
    ['saco', 'Embalagem plástica', 'un.', 100, 4.9, 'Casa do Confeiteiro'],
    ['juta', 'Cordão de juta', 'm', 200, 30, ''],
    ['tag', 'Impressão / etiqueta', 'un.', 80, 13.2, ''],
  ].map(([id, name, unit, pack, price, supplier]) => ({ id, name, unit, pack, price, supplier, minimum: 0 }));

  const packaging = [['saco', 1], ['juta', 0.2], ['tag', 1]];
  const flavors = [
    ['baunilha-leite', 'Baunilha · gotas ao leite', 'branca', [['gotas-leite', 400]]],
    ['baunilha-amargo', 'Baunilha · gotas meio amargo', 'branca', [['gotas-amargo', 400]]],
    ['baunilha-branco', 'Baunilha · gotas brancas', 'branca', [['gotas-branco', 400]]],
    ['chocolate-leite', 'Chocolate · gotas ao leite', 'chocolate', [['gotas-leite', 400]]],
    ['chocolate-amargo', 'Chocolate · gotas meio amargo', 'chocolate', [['gotas-amargo', 400]]],
    ['chocolate-branco', 'Chocolate · gotas brancas', 'chocolate', [['gotas-branco', 400]]],
    ['nozes', 'Baunilha · nozes e gotas ao leite', 'branca', [['nozes', 270], ['gotas-leite', 100]]],
    ['macadamia', 'Baunilha · macadâmias e gotas brancas', 'branca', [['macadamia', 270], ['gotas-branco', 100]]],
    ['confeitos', "Chocolate · M&M's e gotas meio amargo", 'chocolate', [['confeitos', 200], ['gotas-amargo', 200]]],
    ['nutella', 'Baunilha · Nutella e gotas meio amargo', 'branca', [['nutella', 520], ['gotas-amargo', 400]]],
  ];

  const products = flavors.map(([id, name, base, additions]) => ({
    id, name, yield: base === 'branca' ? 26 : 20, price: null, overhead: 0,
    ingredients: [...scaleIngredients(base, 1, 'nenhum').map(item => [item.id, item.quantity]), ...additions],
    packaging: packaging.map(row => [...row]),
  }));

  return { items, products };
})();
