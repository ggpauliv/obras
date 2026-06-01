# Pawliv Obras — Protótipo (React + TypeScript)

Aplicação de gestão de obras construída com **React 18 + TypeScript**, **Create React App** e **Tailwind CSS** (compilado localmente). Todas as telas compartilham um layout único (sidebar + topbar) e a navegação é feita via React Router.

## Como rodar localmente

### Pré-requisito
Instalar as dependências (uma vez):
```
npm install
```

### Iniciar
```
npm start
```
- Clique duplo no `INICIAR.bat` faz o mesmo.
- O sistema abre em: http://localhost:3000

### Acessar de outro dispositivo (ex.: celular)
Com o `npm start` rodando, acesse pelo navegador do celular (mesmo Wi‑Fi):
```
http://SEU_IP_LOCAL:3000
```
(descubra o IP com `ipconfig` no Windows)

## Scripts
| Comando | O que faz |
|---------|-----------|
| `npm start` | Servidor de desenvolvimento (hot reload) |
| `npm run build` | Build de produção otimizado (pasta `build/`) |
| `npm test` | Testes (CRA) |
| `npx tsc --noEmit` | Checagem de tipos TypeScript |

## Navegação

O sistema abre na tela de **Login**. Clique em **Entrar** para acessar o Dashboard.
A navegação entre telas é feita pela **sidebar** (no celular, pelo botão **☰** que abre o menu em gaveta).

## Telas

| Tela | Rota |
|------|------|
| Login | /login |
| Dashboard | /dashboard |
| Obras | /obras |
| Detalhe da Obra | /obra-detalhe |
| Fases / Gantt | /obra-fases |
| Financeiro | /obra-financeiro |
| Fotos | /obra-fotos |
| Auditoria | /obra-auditoria |
| Progresso | /progresso |
| Importar Documento (IA) | /importar |
| Fornecedores | /fornecedores |
| Usuários | /usuarios |
| Configurações | /configuracoes |

## Estrutura do projeto

```
src/
  index.tsx             # ponto de entrada
  App.tsx               # rotas
  index.css             # Tailwind + estilos base
  config/nav.ts         # itens do menu + metadados das rotas
  layouts/AppLayout.tsx # layout (sidebar + topbar + conteúdo)
  components/           # Sidebar, TopBar, ObraTabs
  pages/                # uma página por tela
tailwind.config.js      # tema (paleta Material-3, espaçamentos, tipografia)
```

> Observação: este é um protótipo navegável — os dados são fictícios e as ações
> (salvar, exportar, etc.) são apenas demonstrativas.
