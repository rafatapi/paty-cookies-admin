# Cookies Paty

Aplicação de gestão em HTML, CSS e JavaScript. Inclui calculadora de massas, fichas técnicas, estoque, produção, encomendas, caixa e backup.

## Começar

1. Abra `index.html` no navegador. Para usar a mesma base de dados ao longo do tempo, mantenha o mesmo navegador e endereço.
2. Em **Estoque**, registre como **Saldo inicial** as quantidades que você contou. Registre compras novas como **Compra**. A quantidade é o total comprado na unidade de controle exibida na tabela. Exemplo: duas embalagens de 500 g entram como 1.000 g e duas embalagens.
3. Em **Fichas e preços**, confira as composições, rendimentos e preços dos insumos. Cadastre o preço de venda atual. A margem estimada considera o custo direto cadastrado e o valor de outros custos por cookie.
4. Em **Pedidos**, registre sabores, quantidades, preços e a data de entrega. Em **Produção**, confira a demanda, calcule o lote e a lista de compras. Ao confirmar a produção, os ingredientes são baixados pelo número planejado e as embalagens pelo número efetivamente produzido e embalado.
5. Volte ao pedido para registrar o recebimento e a entrega. A entrega consome os lotes mais antigos disponíveis. O recebimento entra no caixa, e o custo dos lotes aparece no resultado do pedido entregue.
6. Em **Dados**, exporte um backup regularmente. Os registros são locais, sem sincronização automática. Abrir um backup em outro aparelho substitui a base daquele navegador após confirmação.

A quantidade em estoque é registrada em gramas, mililitros, metros ou unidades. O custo estimado usa o preço de referência da embalagem, atualizado ao registrar uma compra. Os custos de lotes anteriores são preservados. O saldo de caixa representa entradas menos saídas pagas no período e inclui compras de estoque.

## Instalar no iPhone

Sirva por HTTPS apenas os arquivos necessários à aplicação: `index.html`, `*.js`, `*.css`, `manifest.webmanifest` e `assets/`. Mantenha `dados/` fora da hospedagem porque contém a planilha e registros históricos com nomes de clientes. O acesso à versão hospedada deve ser compatível com a privacidade das fichas.

1. Abra o endereço no Safari. Em **Compartilhar**, escolha **Adicionar à Tela de Início** e **Abrir como App**, se disponível.
2. Abra pelo ícone com internet e aguarde **Pronto para offline**.
3. Teste em modo avião. Antes de começar a operar, faça um lançamento de teste e confira se reaparece ao fechar e abrir o aplicativo.

Para testar a PWA no computador, sirva os arquivos com uma hospedagem local em `localhost`. Abrir o HTML pelo Explorador permite usar a calculadora e, nos navegadores que oferecem IndexedDB para arquivos locais, os controles de gestão. A base de `file:` e a de um endereço hospedado são independentes.

## Migração do Excel

A planilha original fica em `dados/origem/cookie.xlsx`. Para incorporar a aba **Balanço**, abra **Dados → Importar histórico** e selecione `dados/origem/historico-excel.json`. A importação pode ser repetida sem duplicar registros e não gera saldos de estoque ou pedidos em aberto. O histórico contém 14 despesas, somando R$ 229,61, e 12 encomendas, somando R$ 220,00. A fórmula original de encomendas começava na linha 4 e deixava de fora I3, de R$ 22,00.

- **Massa Branca** e **Massa Preta** fornecem a receita normalizada (coluna D). A calculadora mantém as porções meia, inteira e dobrada. Um quarto proporcional de massa branca usaria 168,75 g de farinha, enquanto M3 informa 141,25 g.
- **Custos**, as abas de massas e **Embalagem** fornecem insumos, preços e embalagens de referência. O custo inicial de embalagem é R$ 0,244 por cookie. Preços antigos precisam ser conferidos antes de orçar.
- **Plan2** serve de catálogo inicial com dez sabores. O rendimento inicial é de 26 para massa branca e 20 para chocolate, conforme as abas de massas. **Plan2** usa 26 também para chocolate. Para nozes e macadâmias, foram adotados 270 g da aba **Massa Branca** e 100 g de gotas. Para M&M's, a composição inicial segue **Plan2** com 200 g de confeitos e 200 g de gotas meio amargo. O doce de leite já está no cadastro de insumos e pode ser usado em uma nova ficha.
- **Estudo** e **200un** ficam como referências. **Produção** recalcula o consumo e a compra para qualquer quantidade usando o rendimento, o preço e o estoque cadastrados.

Após alterar arquivos do app, incremente a versão do cache em `sw.js` para distribuir a atualização.
