# ⚡ Quick Deploy Checklist

## 🚀 Deploy em 4 Passos

### 1️⃣ SSH na VPS
```bash
ssh root@hkfazendas.com
```

### 2️⃣ Backup (opcional mas recomendado)
```bash
cd /home/pawliv/obras
sudo bash deploy-backup.sh
```

### 3️⃣ Deploy
```bash
sudo bash deploy.sh
```

### 4️⃣ Verificar
```bash
sudo bash deploy-health-check.sh
```

---

## ✅ Se Tudo Correu Bem

```
✅ API respondendo em /api/health
✅ Frontend carregando em https://hkfazendas.com
✅ Campo tipo_orcamento em orcamentos
✅ Containers rodando
```

👉 **Vá em https://hkfazendas.com → Aprovar Orçamentos**

---

## ❌ Se Deu Problema

### Opção 1: Health Check
```bash
sudo bash deploy-health-check.sh
```

### Opção 2: Ver logs
```bash
docker-compose logs -f
```

### Opção 3: Rollback (último recurso)
```bash
sudo bash deploy-rollback.sh
```

---

## 📊 Scripts Disponíveis

| Script | O que faz |
|--------|-----------|
| `deploy.sh` | Deploy completo (git + DB + build + restart) |
| `deploy-backup.sh` | Backup do DB antes de deploy |
| `deploy-health-check.sh` | Verifica saúde de todos os serviços |
| `deploy-rollback.sh` | Volta para versão anterior |

---

## 🔗 URLs

- **Frontend**: https://hkfazendas.com
- **Backend API**: https://hkfazendas.com/api
- **Health Check**: https://hkfazendas.com/api/health

---

## 📝 Logs

```bash
# Todos
docker-compose logs -f

# Por serviço
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

---

## ✨ O Que Tem de Novo

✅ Módulo de Aprovação de Orçamentos
- Nova página `/orcamentos/aprovacao`
- Seleção e remoção em lote
- Geração automática de despesas/fases/fornecedores

---

Tempo esperado: **3-5 minutos** ⏱️
