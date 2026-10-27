# Atlas — Guia de Viagens pelo Mundo

Aplicação web em HTML, CSS e JavaScript puro, com Firebase Cloud Firestore e API pública Open-Meteo. Projeto individual para a Atividade 2.

## Funcionalidades

- **C — Create:** formulário para adicionar destinos, notas, status, data, orçamento e foto.
- **R — Read:** destinos recuperados do Firestore e apresentados em cards, com busca e filtros.
- **U — Update:** edição de registros existentes no Firestore.
- **D — Delete:** exclusão de registros do Firestore com confirmação.
- **API externa:** busca de cidades pela Open-Meteo Geocoding e clima atual pela Open-Meteo Forecast, sem chave de API.
- **Extras:** orçamento estimado informado pelo usuário, atalhos para mapa e pesquisa externa de passagens, inspirações para explorar.
- **Responsivo:** adapta-se a desktop, tablet e celular.

## 1. Configure o Firebase (necessário)

1. Acesse https://console.firebase.google.com/ e crie um projeto (ou use um que você controle).
2. Em **Visão geral do projeto > Adicionar app > Web**, registre o app e copie a configuração `firebaseConfig`.
3. Cole os valores em `firebase-config.js`. Isso não é uma chave secreta de servidor, mas você deve proteger o banco com regras adequadas.
4. Acesse **Criação > Firestore Database > Criar banco de dados** e selecione o local.
5. Abra a aba **Regras** e publique regras de acesso. O arquivo `firestore.rules` contém uma opção **apenas para apresentação escolar temporária**, com acesso público a todos os destinos. **Não use em produção**, pois qualquer visitante pode alterar ou apagar os dados. Para um site público permanente, implemente Firebase Authentication e regras por usuário.
6. Os registros ficam na coleção `destinos`, criada automaticamente no primeiro cadastro.

Não use apenas `localStorage` para a entrega: o CRUD deve ser feito no Firestore.

## 2. Rodar localmente

Por usar módulos JavaScript, abra com servidor HTTP, não dando duplo clique no HTML.

- Com VS Code: instale a extensão Live Server e clique em **Go Live**.
- Alternativa com Python: `python -m http.server 5500`, na pasta do projeto, e abra http://localhost:5500.

## 3. Publicação na Vercel

1. Envie os arquivos desta pasta à raiz de um repositório no GitHub.
2. Na Vercel, clique em **Add New > Project**, importe o repositório e selecione **Other** como framework.
3. Não é necessário comando de build; pasta de saída padrão `.` (ou vazia, conforme a interface).
4. Clique em **Deploy**. O endereço ficará no formato `nome-do-projeto.vercel.app`.
5. Confira se consegue criar, consultar, editar e excluir um destino pela URL publicada, além de consultar o clima.

## Observações

- O clima representa condições atuais, **não** previsão para datas de viagens futuras.
- O orçamento é preenchido manualmente, não é uma cotação real.
- A pesquisa de passagens é um link externo, sem preços fictícios.
- A Open-Meteo é gratuita para uso não comercial, sem cadastro e pede atribuição. https://open-meteo.com/
- As imagens demonstrativas usam URLs públicas do Unsplash e precisam de conexão de internet.
- O Firebase é o único serviço que requer criação/configuração de projeto para cumprir o enunciado.
