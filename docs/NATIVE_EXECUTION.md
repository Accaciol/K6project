# Guia de Execução Nativa e Testes Remotos (Sem Docker/Podman)

Este guia explica como configurar o ambiente de teste diretamente no seu sistema operacional (Linux ou Windows) para testar servidores Oracle externos.

---

## 1. Pré-requisitos Gerais

Para rodar o k6 com suporte a Oracle nativamente, você precisa de:
1.  **Go (Golang):** Necessário para compilar a versão customizada do k6.
2.  **xk6:** Utilitário para construir o binário do k6 com extensões.
3.  **Oracle Instant Client:** Bibliotecas básicas da Oracle para permitir a conexão.

---

## 2. Instalação e Compilação

### No Linux (Ubuntu/Debian/Fedora)
1.  **Instale o Go:**
    ```bash
    sudo apt install golang  # Ubuntu/Debian
    # ou
    sudo dnf install golang  # Fedora
    ```
2.  **Instale o xk6:**
    ```bash
    go install go.k6.io/xk6/cmd/xk6@latest
    ```
3.  **Compile o k6 com driver Oracle:**
    ```bash
    ~/go/bin/xk6 build --with github.com/grafana/xk6-sql --with github.com/denyshuzovskyi/xk6-sql-driver-oracle
    ```

### No Windows
1.  **Instale o Go:** Baixe o instalador oficial em [go.dev/dl](https://go.dev/dl/) e siga o assistente.
2.  **Instale o xk6:**
    Abra o PowerShell ou CMD e rode:
    ```powershell
    go install go.k6.io/xk6/cmd/xk6@latest
    ```
3.  **Instale o GCC (C Compiler):** O driver Oracle exige um compilador C. Recomenda-se o **MSYS2** ou **MinGW-w64**.
4.  **Compile o k6:**
    No PowerShell:
    ```powershell
    & $env:GOPATH\bin\xk6.exe build --with github.com/grafana/xk6-sql --with github.com/denyshuzovskyi/xk6-sql-driver-oracle
    ```

---

## 3. Configuração do Oracle Instant Client

O driver exige as bibliotecas nativas da Oracle na máquina.

### Linux
1.  Baixe o "Instant Client Basic Light" (ZIP) no site da Oracle.
2.  Extraia em uma pasta (ex: `/opt/oracle/instantclient`).
3.  Configure o caminho:
    ```bash
    export LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH
    ```

### Windows
1.  Baixe o "Instant Client Basic Light" (ZIP) para Windows x64.
2.  Extraia em uma pasta (ex: `C:\oracle\instantclient`).
3.  Adicione essa pasta ao **PATH** do sistema:
    *   Pesquise por "Editar as variáveis de ambiente do sistema".
    *   Em "Variáveis de Ambiente", procure "Path" em "Variáveis do Sistema".
    *   Clique em "Novo" e adicione o caminho `C:\oracle\instantclient`.

---

## 4. Conectando a um Banco de Dados Externo

Para testar um servidor remoto, você não altera o código JS, apenas a **String de Conexão** via variável de ambiente.

### Formato da URL
`oracle://USUARIO:SENHA@IP_DO_SERVIDOR:PORTA/NOME_DO_SERVICO`

### Como rodar (Exemplos)

**Linux:**
```bash
export DB_URL="oracle://admin:senha123@200.150.10.50:1521/XEPDB1"
./k6 run scripts/performance-test.js
```

**Windows (PowerShell):**
```powershell
$env:DB_URL="oracle://admin:senha123@200.150.10.50:1521/XEPDB1"
.\k6.exe run scripts\performance-test.js
```

---

## 6. Execução em Windows sem Privilégios de Admin (Modo Portátil)

Se você estiver em uma máquina Windows onde não possui permissões de administrador para instalar o Go ou configurar variáveis de ambiente do sistema:

1.  **Binário Pré-compilado:** Utilize o arquivo `k6_windows.exe` já disponível na raiz deste projeto.
2.  **Oracle Instant Client Portátil:**
    *   Baixe o arquivo **Instant Client "Basic Light" ZIP** no site da Oracle.
    *   Extraia todo o conteúdo do ZIP (especialmente as arquivos `.dll` como `oci.dll`) para a **mesma pasta** onde está o `k6_windows.exe`.
3.  **Execução:**
    *   Abra o terminal (PowerShell ou CMD) na pasta do projeto.
    *   O Windows carregará as DLLs da pasta local automaticamente.
    *   Roda o comando normalmente:
      ```powershell
      $env:DB_URL="oracle://usuario:senha@host:1521/servico"
      .\k6_windows.exe run scripts\performance-test.js
      ```

Este método não exige instalação nem alteração nas configurações do sistema.
