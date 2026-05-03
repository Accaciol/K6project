/**
 * Script de Teste de Performance com k6 e Oracle
 * 
 * Este script simula uma carga de trabalho em um banco de dados Oracle,
 * realizando inserções e consultas simultâneas para medir o desempenho.
 */

// Importação das extensões necessárias
import sql from 'k6/x/sql'; // Extensão SQL para k6
import oracle from 'k6/x/sql/driver/oracle'; // Driver específico para conexão com Oracle
import { check, sleep } from 'k6'; // Funções auxiliares do k6 (validações e pausas)
import { Counter } from 'k6/metrics'; // Importa a métrica de contador para rastrear erros
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js"; // Gerador de relatório visual

// Métrica customizada para contar falhas em operações de banco de dados
const dbErrors = new Counter('db_errors');

/**
 * Função para abrir a conexão com o banco de dados.
 * Utiliza variáveis de ambiente (DB_URL) para maior flexibilidade.
 */
function openDB() {
    try {
        const dbUrl = __ENV.DB_URL; // Obtém a URL de conexão do ambiente (configurada no docker-compose)
        console.log(`--- [INIT] Tentando conectar ao Oracle: ${dbUrl}`);
        
        // Abre a conexão usando o driver Oracle importado
        return sql.open(oracle, dbUrl);
    } catch (e) {
        console.error(`--- [ERRO CRÍTICO] Falha ao abrir conexão: ${e}`);
        throw e;
    }
}

// Inicializa o objeto de conexão com o banco
const db = openDB();

/**
 * Função utilitária para gerar mensagens aleatórias para inserção.
 */
function getRandomMessage() {
    const messages = ["Sucesso", "Erro", "Login", "CPU Alta", "Compra", "Alerta"];
    return `${messages[Math.floor(Math.random() * messages.length)]} ${Math.floor(Math.random() * 1000)}`;
}

/**
 * Configurações de Cenário do k6 (Options)
 * Define como o teste se comportará (usuários virtuais, duração, etc).
 */
export const options = {
  scenarios: {
    // 1. Stress Test: Tenta encontrar o limite do banco aumentando a carga gradualmente
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 }, // Sobe para 20 usuários
        { duration: '2m', target: 20 }, // Mantém 20
        { duration: '1m', target: 50 }, // Sobe para 50 (pode começar a lentidão)
        { duration: '2m', target: 50 }, // Mantém 50
        { duration: '1m', target: 0 },  // Desce para 0
      ],
      startTime: '0s',
    },
    // 2. Spike Test: Simula um surto repentino de acessos
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 }, // Salto brusco de 0 para 100 usuários
        { duration: '30s', target: 100 }, // Mantém o pico por 30s
        { duration: '10s', target: 0 },   // Queda brusca
      ],
      startTime: '7m', // Inicia após o stress test
    },
    // 3. ENDURANCE Soak Test: Verifica a estabilidade por um longo período (identifica vazamentos de memória no banco)
    soak_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10m', // Roda por 10 minutos constantes
      startTime: '8m',
    },
  },
  thresholds: {
    // Define critérios de sucesso/falha
    'iteration_duration': ['avg<1000'], // A média de cada transação deve ser menor que 1s (ajustado para Oracle)
    'db_errors': ['count<10'],           // O teste falha se houver mais de 10 erros de banco
  },
};

/**
 * [LIFECYCLE] SETUP
 * Esta função roda apenas UMA vez no início de tudo.
 * Ideal para preparar o banco de dados (criar tabelas, índices, dados iniciais).
 */
export function setup() {
  console.log('--- [SETUP] Iniciando preparação do banco ---');
  try {
    // Criação das tabelas de teste
    db.exec(`CREATE TABLE test_categories (cat_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name VARCHAR2(50))`);
    
    // Inserção de dados básicos de categoria
    db.exec("INSERT INTO test_categories (name) VALUES ('Log')");
    db.exec("INSERT INTO test_categories (name) VALUES ('Error')");
    db.exec("INSERT INTO test_categories (name) VALUES ('Info')");
    
    // Tabela principal onde os registros de performance serão gravados
    db.exec(`CREATE TABLE test_performance (id NUMBER GENERATED ALWAYS AS IDENTITY, category_id NUMBER, msg VARCHAR2(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // Criação de índice para otimizar as consultas futuras
    db.exec(`CREATE INDEX idx_category ON test_performance(category_id)`);
    
    console.log('--- [SETUP] Banco preparado com sucesso! ---');
  } catch (e) {
    // Loga erro caso as tabelas já existam ou haja falha na permissão
    console.log('--- [SETUP] Aviso/Erro: ' + e);
  }
}

/**
 * [LIFECYCLE] DEFAULT FUNCTION
 * Este é o coração do teste. Cada Usuário Virtual (VU) executa esta função repetidamente.
 * Implementa uma distribuição probabilística de carga:
 * - 70% SELECT (Consultas)
 * - 20% INSERT (Inserções)
 * - 10% UPDATE (Atualizações)
 */
export default function () {
  const vuId = __VU; // ID do usuário virtual atual
  const rand = Math.random(); // Gera um número entre 0 e 1 para decidir a operação

  try {
      if (rand < 0.70) {
          // --- 1. [70%] SELECT: Consulta para contar o total de registros ---
          const rows = db.query(`SELECT count(*) as total FROM test_performance`);
          
          if (vuId === 1 && Math.random() < 0.1) { 
            console.log(`[VU 1 - SELECT] Total de registros: ${rows[0].TOTAL}`);
          }
      } 
      else if (rand < 0.90) {
          // --- 2. [20%] INSERT: Realiza uma inserção no banco de dados ---
          const categoryId = Math.floor(Math.random() * 3) + 1; // Escolhe uma categoria aleatória (1 a 3)
          const message = getRandomMessage(); // Gera uma mensagem aleatória
          db.exec(`INSERT INTO test_performance (category_id, msg) VALUES (${categoryId}, '${message}')`);
          
          if (vuId === 1 && Math.random() < 0.1) {
            console.log(`[VU 1 - INSERT] Nova mensagem inserida.`);
          }
      } 
      else {
          // --- 3. [10%] UPDATE: Atualiza a última mensagem inserida ---
          // Esta operação simula a edição de dados existentes
          db.exec(`UPDATE test_performance SET msg = 'EDITADO: ' || msg WHERE id = (SELECT max(id) FROM test_performance)`);
          
          if (vuId === 1 && Math.random() < 0.1) {
            console.log(`[VU 1 - UPDATE] Registro atualizado.`);
          }
      }
  } catch (e) {
      dbErrors.add(1); // Incrementa o contador de erros customizado quando algo falha
      console.error(`[VU ${vuId}] Erro na execução: ${e}`);
  }

  // Pausa de 2 segundos entre as iterações para simular tempo de pensamento do usuário
  sleep(2.0);
}

/**
 * [LIFECYCLE] TEARDOWN
 * Esta função roda apenas UMA vez ao final de todos os testes.
 * Ideal para limpar dados ou fechar conexões remanescentes.
 */
export function teardown() {
  console.log('--- [TEARDOWN] Finalizando teste e fechando conexão ---');
  db.close();
}

/**
 * [LIFECYCLE] HANDLE SUMMARY
 * Função responsável por processar os resultados finais do k6.
 * Aqui, transformamos as métricas brutas em um relatório HTML visual.
 */
export function handleSummary(data) {
    console.log('--- [SUMMARY] Gerando relatório visual... ---');
    return { 
        // O caminho aponta para o volume montado no Docker (/scripts/results/)
        "/scripts/results/summary.html": htmlReport(data) 
    };
}
