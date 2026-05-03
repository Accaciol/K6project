# Guia Avançado de Testes de Performance (k6 + Oracle)

Este documento explica as funcionalidades avançadas implementadas para tornar o teste mais realista, observável e otimizado.

---

## 1. Limitação de Recursos (Docker)
No arquivo `docker-compose.yml`, adicionamos limites de hardware para o banco de dados.
*   **Por que fazer isso?** Se o Oracle tiver recursos infinitos, o teste de estresse demorará muito para mostrar falhas. Ao limitar a **1 CPU** e **2GB de RAM**, conseguimos simular um servidor real sob pressão e ver exatamente quando o banco começa a ficar lento.
*   **Onde ver:** Seção `deploy.resources.limits` no `docker-compose.yml`.

---

## 2. Relatório Visual (HTML Report)
Agora, ao final de cada teste, o k6 gera automaticamente um arquivo chamado `summary.html`.
*   **O que é:** Um dashboard completo com gráficos de latência, requisições por segundo e taxa de sucesso.
*   **Como funciona:** Utilizamos a função `handleSummary` no final do script `performance-test.js` para converter os dados brutos do k6 em uma interface visual.
*   **Como visualizar:** Basta abrir o arquivo `summary.html` gerado na pasta do projeto em qualquer navegador.

---

## 3. Dados Dinâmicos (Evitando o Cache)
Bancos de dados modernos como o Oracle são inteligentes e guardam resultados repetidos na memória (cache). Se enviarmos sempre a mesma mensagem, o teste será "mentiroso" porque o banco não fará o esforço real de gravar no disco.
*   **O que fizemos:** Criamos a função `getRandomMessage()` que sorteia frases diferentes e adiciona números aleatórios a cada inserção.
*   **Benefício:** Isso força o Oracle a realizar operações reais de I/O (entrada e saída de disco) em cada iteração, tornando o teste muito mais fiel à realidade.

---

## 4. Otimização com Índices
No `setup` do script, adicionamos um comando para criar um índice:
`CREATE INDEX idx_category ON test_performance(category_id)`.
*   **O que é um Índice:** Imagine um índice de um livro. Em vez de ler o livro todo para achar um capítulo, você vai direto na página certa.
*   **Impacto no Teste:** Sem esse índice, a consulta de **JOIN** (que cruza as tabelas de mensagens e categorias) ficaria cada vez mais lenta à medida que a tabela crescesse. Com o índice, o Oracle encontra as relações instantaneamente, permitindo que o sistema suporte muito mais usuários simultâneos.

---

## 5. Configuração de Cenários (Options)
O objeto `options` no script define como a carga será aplicada. Abaixo estão os principais parâmetros utilizados:

*   **`executor`**: Define o "motor" do teste.
    *   `ramping-vus`: Sobe/desce a carga gradualmente (usado no Stress e Spike tests).
    *   `constant-vus`: Mantém um número fixo de usuários (usado no Soak test).
*   **`startVUs`**: Com quantos usuários o teste começa no segundo zero.
*   **`stages`**: Uma lista de durações e alvos de usuários para criar a "rampa" de carga.
*   **`vus`**: Quantidade de usuários simultâneos (em executores constantes).
*   **`startTime`**: Um atraso planejado para que um cenário comece após o outro, permitindo encadear testes diferentes no mesmo arquivo.
*   **`thresholds`**: Critérios de sucesso/falha. Ex: `iteration_duration: ['avg<1000']` define que a média das transações deve ser menor que 1s.

---

## 6. Resumo do Fluxo Avançado
1.  **Docker** limita o poder do banco.
2.  **Setup** prepara as tabelas e cria os índices de velocidade.
3.  **Default** implementa uma carga mista e realista:
    *   **70% SELECT:** Consultas de leitura pesada.
    *   **20% INSERT:** Gravação de novos dados dinâmicos para evitar o cache.
    *   **10% UPDATE:** Atualização de registros existentes, testando locks de escrita.
4.  **HandleSummary** gera o relatório visual para análise.

---

## Como Executar e Ver os Resultados
1.  Rode o comando: `docker-compose up --build`
2.  Aguarde o término do teste (aprox. 2 minutos).
3.  Abra o arquivo `summary.html` na raiz do seu projeto para ver o gráfico de performance.
