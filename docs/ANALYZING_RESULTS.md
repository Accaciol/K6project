# Guia de Análise de Relatórios de Performance (k6)

Este guia explica os conceitos fundamentais e as métricas que você deve observar ao analisar o arquivo `summary.html` gerado pelos testes.

---

## 1. Métricas de Tempo (Latência)

A latência é o tempo que o banco de dados leva para processar uma operação. No k6, olhamos principalmente para `iteration_duration` ou métricas personalizadas.

*   **Average (Média):** A média simples de todos os tempos. Pode ser enganosa se houver alguns poucos casos muito lentos (outliers).
*   **Min / Max:** O tempo da operação mais rápida e da mais lenta. Útil para ver a amplitude do comportamento.
*   **Percentis (p90, p95, p99) - O MAIS IMPORTANTE:**
    *   **p90:** Significa que 90% das requisições foram mais rápidas que este valor.
    *   **p95:** 95% das requisições foram mais rápidas.
    *   **p99:** "O pior caso comum". Apenas 1% das requisições foram mais lentas que isso.
    *   **Por que importa?** Se o seu p99 estiver muito alto (ex: 5 segundos), significa que 1 a cada 100 usuários está tendo uma experiência péssima, mesmo que a média pareça boa.

---

## 2. Taxa de Transferência (Throughput)

Mede quanto trabalho o sistema está realizando.

*   **Iterations/s (ou Requests/s):** Quantas operações de banco (Insert/Select) estão ocorrendo por segundo.
*   **Análise:** 
    *   Se o número de usuários (VUs) aumenta e as requisições/s param de crescer, você atingiu o **ponto de saturação**. O sistema não consegue processar mais nada, independentemente de quanta carga você envie.

---

## 3. Taxa de Erro (Checks & Counters)

*   **db_errors:** No seu script, criamos esse contador. Ele deve ser idealmente **0**.
*   **O que observar:** Se os erros começarem a subir junto com o aumento de VUs, o banco pode estar recusando conexões por falta de memória ou estourando o limite de processos.

---

## 4. O que procurar durante o Stress Test?

O teste de estresse aumenta a carga gradualmente. Procure por:

1.  **O "Joelho" da Curva:** O momento em que o tempo de resposta começa a subir exponencialmente enquanto o número de requisições/s estabiliza. Esse é o seu limite real.
2.  **Degradação Gradual:** O sistema fica mais lento aos poucos ou "morre" de uma vez? Um bom sistema degrada devagar.
3.  **Recuperação:** Após o pico de carga (Spike Test), o sistema volta ao normal rapidamente? Se continuar lento após a carga baixar, pode haver um vazamento de memória ou conexões presas.

---

## 5. Itens Específicos para este Projeto (Oracle)

*   **Contenção de Locks:** Se muitos usuários tentarem inserir na mesma tabela ao mesmo tempo, o Oracle pode enfileirar as requisições. Isso aparecerá como um aumento súbito no `p95` da latência.
*   **Uso de CPU:** Como limitamos o Docker a 1 CPU, observe se a latência sobe quando o banco atinge 100% de uso desse recurso.
*   **Eficiência do Índice:** Se o tempo de consulta (Select) aumentar drasticamente conforme a tabela `test_performance` cresce, seu índice pode não estar sendo tão eficiente quanto o esperado ou o banco está sofrendo com I/O de disco.

---

## 6. Glossário Rápido

*   **VU (Virtual User):** Simula um usuário real rodando o script em loop.
*   **Iteration:** Uma execução completa da função `default` do seu script.
*   **Threshold (Limiar):** Uma meta definida. Se o resultado for pior que o limite (ex: avg > 1s), o k6 marca o teste como "Falha".
