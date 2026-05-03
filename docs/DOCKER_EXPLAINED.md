# Explicação do Docker e Docker Compose

Este documento detalha como o ambiente de teste de performance é construído e orquestrado usando Docker.

---

## 1. Dockerfile (Customização do k6)

O k6 padrão não possui suporte nativo para bancos de dados SQL. Por isso, usamos um **Multi-stage Build** para compilar uma versão customizada.

### Stage 1: Builder (Compilação)
- **`FROM golang:alpine`**: Usa a imagem oficial do Go para compilar a extensão.
- **`RUN go install ... xk6@latest`**: Instala o `xk6`, que é o utilitário usado para criar builds customizados do k6.
- **`RUN xk6 build --with github.com/grafana/xk6-sql`**: Comando principal que gera um executável do k6 incluindo a extensão `xk6-sql` (necessária para falar com o Oracle).

### Stage 2: Final (Execução)
- **`FROM alpine:latest`**: Uma imagem extremamente leve para rodar o binário final.
- **`COPY --from=builder /go/k6 /usr/bin/k6`**: Copia apenas o executável compilado no primeiro estágio, mantendo a imagem final pequena.
- **`ENTRYPOINT ["k6"]`**: Define o k6 como o comando principal que será executado ao iniciar o container.

---

## 2. Docker Compose (Orquestração)

O arquivo `docker-compose.yml` gerencia dois serviços principais que trabalham em conjunto.

### A. Serviço `oracle-db`
- **Imagem**: `gvenzl/oracle-xe:latest`. Uma versão leve (Express Edition) do banco Oracle.
- **Variáveis de Ambiente**: Define a senha do sistema e as credenciais de um usuário da aplicação (`teste_user`).
- **Ports**: Mapeia a porta `1521` (padrão do Oracle) para que o banco seja acessível externamente se necessário.
- **Healthcheck**: 
    - O Oracle é um banco pesado e demora para iniciar completamente.
    - O teste `healthcheck.sh` garante que o banco está pronto para receber conexões antes que o k6 tente rodar.

### B. Serviço `k6`
- **Build**: Indica que o container deve ser montado usando o `Dockerfile` local.
- **Volumes**: Mapeia a pasta atual do seu computador para `/scripts` dentro do container, permitindo que o k6 leia o arquivo `performance-test.js`. O sufixo `:Z` é usado para compatibilidade com SELinux (comum em distribuições Linux como Fedora).
- **Variáveis de Ambiente (`DB_URL`)**: Passa a string de conexão para o script. Note que o host usado é `oracle-db` (o nome do serviço no compose).
- **Depends_on**: Garante que o k6 só comece a rodar quando o `oracle-db` estiver no estado `service_healthy`.
- **Command**: O comando padrão que será executado: `run /scripts/performance-test.js`.

---

## Como Iniciar o Ambiente
Para subir todo o ambiente e iniciar o teste automaticamente, execute:
```bash
docker-compose up --build
```
Isso irá construir a imagem do k6, subir o banco de dados e, assim que o banco estiver pronto, disparar o teste de performance.
