# CritiClass — StarUML Object-Oriented Metrics Extension

Extensão para o **StarUML** que coleta métricas orientadas a objetos de **Chidamber & Kemerer (CK)** e **Lorenz & Kidd (L&K)** diretamente a partir de diagramas de classes UML, gerando uma planilha com uma linha por classe.

O projeto faz parte de um TCC de Engenharia de Software sobre **priorização de testes na fase de design** (antes da existência do código-fonte), inspirado na estrutura do plugin [PickClass](https://github.com/YanPaivaAndrade/PickClassStarUml) (MIT).

---

## Checklist de Progresso

### Fase 1 — Coleta e Exportação de Métricas
- [x] **Etapa 1 — Esqueleto do Plugin**
  - [x] Configuração do manifesto (`package.json`)
  - [x] Registro do comando `criticlass:generate-metrics` (`main.js`)
  - [x] Menu superior **CritiClass → Gerar métricas (CK + L&K)** (`menus/criticlass.json`)
  - [x] Atalho de teclado `Ctrl+Shift+M` (`keymaps/criticlass.json`)
- [x] **Etapa 2 — Leitura do Modelo (`src/modelReader.js`)**
  - [x] Coleta global de `UMLClass`, `UMLInterface`, `UMLGeneralization`, `UMLAssociation`, `UMLDependency` e `UMLInterfaceRealization`
  - [x] Filtro de perfis (`UMLProfile`) e deduplicação por `_id`
  - [x] Extração de atributos (`name`, `visibility`, `isStatic`) e operações (`name`, `visibility`, `isStatic`, `params` excluindo retorno)
  - [x] Mapeamento de herança (`parents` e classes filhas) via `UMLGeneralization`
  - [x] Mapeamento de acoplamentos (`relations` com `kind`, `targetId` e `direction`), ignorando autoassociações e registrando ambos os sentidos quando a navegabilidade não é especificada
- [ ] **Etapa 3 — Métricas de Chidamber & Kemerer (`src/metrics/ck.js`) + Testes (Jest)**
  - [ ] `WMC` (Weighted Methods per Class — peso 1 por operação)
  - [ ] `DIT` (Depth of Inheritance Tree — maior caminho até a raiz, com proteção contra ciclos e suporte a herança múltipla)
  - [ ] `NOC` (Number of Children — subclasses diretas)
  - [ ] `CBO` (Coupling Between Object Classes — classes/interfaces distintas acopladas)
  - [ ] `Ce` e `Ca` (Acoplamento eferente/saída e aferente/entrada)
  - [ ] `RFC` (Response For a Class — aproximação: operações da classe + operações distintas das classes diretamente acopladas)
  - [ ] `LCOM` (marcado como `N/A` na fase de design)
- [ ] **Etapa 4 — Métricas de Lorenz & Kidd (`src/metrics/lk.js`) + Testes (Jest)**
  - [ ] `NIV` e `NCV` (atributos de instância e de classe/estáticos)
  - [ ] `NIM` e `NCM` (operações de instância e de classe/estáticas)
  - [ ] `PIM` (operações de instância públicas)
  - [ ] `NMO` (operações sobrescritas na hierarquia de herança)
  - [ ] `NMI` (operações herdadas não privadas e não sobrescritas)
  - [ ] `NMA` (operações novas adicionadas = `NIM - NMO`)
  - [ ] `SIX` (Specialization Index = `(NMO * DIT) / (NMO + NMA + NMI)`)
  - [ ] `APPM` (média de parâmetros por operação, sem contar retorno)
- [ ] **Etapa 5 — Exportação e Interface (`src/exporter.js`)**
  - [ ] Exportação de planilha `.xlsx` (e `.csv` opcional) com uma linha por classe
  - [ ] Aba **Legenda** explicando cada métrica e limitações de design (`LCOM = N/A`, `WMC` com peso 1, `RFC` aproximado)
  - [ ] Diálogo final no StarUML informando o arquivo salvo e o total de classes analisadas

### Fase 2 — Priorização de Testes (Futura)
- [ ] Normalização min-max das métricas coletadas
- [ ] Pesos configuráveis e cálculo do score de criticidade por classe
- [ ] Indicação automática do ranking e das ~20% de classes mais críticas para teste

---

## Estrutura do Projeto

```text
CritiClassStarUml/
├── package.json
├── main.js              # Ponto de entrada (init) e registro de comandos no StarUML
├── menus/
│   └── criticlass.json  # Definição do menu "CritiClass -> Gerar métricas (CK + L&K)"
├── keymaps/
│   └── criticlass.json  # Atalho de teclado (Ctrl+Shift+M)
└── src/
    └── modelReader.js   # Conversão do repositório do StarUML para objetos JS puros
```

---

## Como Instalar e Testar no StarUML

### 1. Copiar ou criar link na pasta de extensões do StarUML

**No Windows (PowerShell):**
```powershell
Copy-Item -Path ".\*" -Destination "$env:APPDATA\StarUML\extensions\user\CritiClassStarUml" -Recurse -Force
```

**No macOS (Terminal):**
```bash
ln -s "$(pwd)" "$HOME/Library/Application Support/StarUML/extensions/user/CritiClassStarUml"
```

### 2. Recarregar e executar
1. No StarUML, acesse **Debug → Reload**.
2. Abra o console de inspeção em **Debug → Show DevTools** (aba **Console**).
3. Abra um modelo `.mdj` com um diagrama de classes.
4. Acione **CritiClass → Gerar métricas (CK + L&K)** no menu ou pressione **`Ctrl+Shift+M`**.
