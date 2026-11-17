# CritiClass — StarUML Object-Oriented Metrics & Test Prioritization Extension

Extensão para o **StarUML** que coleta métricas orientadas a objetos de **Chidamber & Kemerer (CK)** e **Lorenz & Kidd (L&K)** diretamente a partir de diagramas de classes UML, realiza a **normalização Min-Max**, calcula um **Score de Criticidade** com pesos configuráveis e destaca automaticamente as **~20% de classes mais críticas para priorização de testes** na fase de design.

O projeto faz parte de um TCC de Engenharia de Software sobre **priorização de testes na fase de design** (antes da existência do código-fonte), inspirado na estrutura do plugin [PickClass](https://github.com/YanPaivaAndrade/PickClassStarUml) (MIT).

---

## Checklist de Progresso

### Fase 1 — Coleta e Exportação de Métricas (Concluída)
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
- [x] **Etapa 3 — Métricas de Chidamber & Kemerer (`src/metrics/ck.js`) + Testes (`test/ck.test.js`)**
  - [x] `WMC` (Weighted Methods per Class — peso 1 por operação, com ponto de extensão para pesos)
  - [x] `DIT` (Depth of Inheritance Tree — maior caminho até a raiz, com proteção contra ciclos e suporte a herança múltipla)
  - [x] `NOC` (Number of Children — subclasses diretas)
  - [x] `CBO` (Coupling Between Object Classes — classes/interfaces distintas acopladas)
  - [x] `Ce` e `Ca` (Acoplamento eferente/saída e aferente/entrada)
  - [x] `RFC` (Response For a Class — aproximação: operações da classe + operações distintas das classes diretamente acopladas)
  - [x] `LCOM` (marcado como `N/A` na fase de design)
- [x] **Etapa 4 — Métricas de Lorenz & Kidd (`src/metrics/lk.js`) + Testes (`test/lk.test.js`)**
  - [x] `NIV` e `NCV` (atributos de instância e de classe/estáticos)
  - [x] `NIM` e `NCM` (operações de instância e de classe/estáticas)
  - [x] `PIM` (operações de instância públicas)
  - [x] `NMO` (operações sobrescritas na hierarquia de herança)
  - [x] `NMI` (operações herdadas não privadas e não sobrescritas)
  - [x] `NMA` (operações novas adicionadas = `NIM - NMO`)
  - [x] `SIX` (Specialization Index = `(NMO * DIT) / (NMO + NMA + NMI)`)
  - [x] `APPM` (média de parâmetros por operação, sem contar retorno)
- [x] **Etapa 5 — Exportação e Interface (`src/exporter.js` + `test/exporter.test.js`)**
  - [x] Exportação de planilha `.xlsx` (e `.csv` opcional) com uma linha por classe
  - [x] Aba **Legenda** explicando cada métrica e limitações de design (`LCOM = N/A`, `WMC` com peso 1, `RFC` aproximado)
  - [x] Diálogo final no StarUML informando o arquivo salvo e o total de classes analisadas

### Fase 2 — Priorização de Testes (Concluída)
- [x] **Normalização Min-Max (`src/metrics/normalizer.js` + `test/normalizer.test.js`)**
  - [x] Cálculo de limites `[min, max]` por métrica numérica e normalização no intervalo `[0, 1]` (tratando `max === min` como `0`)
- [x] **Pesos Configuráveis e Score de Criticidade (`src/metrics/prioritizer.js` + `test/prioritizer.test.js`)**
  - [x] Pesos configuráveis por métrica (padrão `1.0`), persistidos no StarUML via menu **Configurar pesos das métricas...** e opção **Restaurar pesos padrão (1.0)**
  - [x] Cálculo da média ponderada normalizada (`Score` em `[0, 1]`) e da `Soma Ponderada`
- [x] **Ranking e Indicação das ~20% de Classes Mais Críticas**
  - [x] Ordenação por `Score` decrescente (com critérios determinísticos de desempate: `Soma Ponderada`, `CBO`, `RFC`, `WMC` e ordem alfabética)
  - [x] Classificação automática das `ceil(0.20 * N)` primeiras classes como **`ALTA (Top 20%)`**
  - [x] Geração da aba **"Priorização (Top 20%)"** na planilha `.xlsx` (com ranking, scores, métricas normalizadas, pesos configurados e limites `min`/`max`) e exibição das classes críticas no diálogo final do StarUML

---

## Estrutura do Projeto

```text
CritiClassStarUml/
├── package.json
├── main.js                   # Ponto de entrada (init), comandos, configuração de pesos e diálogos no StarUML
├── menus/
│   └── criticlass.json       # Menu "CritiClass" (geração .xlsx/.csv e configuração de pesos)
├── keymaps/
│   └── criticlass.json       # Atalho de teclado (Ctrl+Shift+M)
├── src/
│   ├── modelReader.js        # Conversão do repositório do StarUML para objetos JS puros
│   ├── exporter.js           # Geração de .xlsx (abas "Métricas", "Priorização (Top 20%)" e "Legenda") e .csv
│   └── metrics/
│       ├── ck.js             # Funções puras das métricas de Chidamber & Kemerer
│       ├── lk.js             # Funções puras das métricas de Lorenz & Kidd
│       ├── normalizer.js     # Normalização Min-Max [0, 1] das métricas numéricas
│       └── prioritizer.js    # Pesos configuráveis, Score de Criticidade, Ranking e corte Top 20%
└── test/
    ├── fixtures/
    │   └── sampleModel.js    # Modelo de referência (Person, Student, Professor, Course) e gabarito
    ├── ck.test.js            # Testes unitários das métricas CK
    ├── lk.test.js            # Testes unitários das métricas L&K
    ├── normalizer.test.js    # Testes unitários da normalização Min-Max
    ├── prioritizer.test.js   # Testes unitários do cálculo de Score, Ranking, Top 20% e parser de pesos
    ├── exporter.test.js      # Testes unitários da exportação (.xlsx, .csv, Priorização e Legenda)
    └── modelReader.test.js   # Testes unitários do leitor de modelo
```

---

## Como Instalar e Usar no StarUML

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
2. Abra um modelo `.mdj` com um diagrama de classes.
3. *(Opcional)* Ajuste os pesos das métricas em **CritiClass → Configurar pesos das métricas...**.
4. Acione **CritiClass → Gerar métricas (CK + L&K)** no menu ou pressione **`Ctrl+Shift+M`**.
5. O arquivo `<NomeDoProjeto>-metrics.xlsx` será salvo na sua pasta de **Downloads** (contendo as abas **Métricas**, **Priorização (Top 20%)** e **Legenda**) e um diálogo exibirá o resumo das classes mais críticas recomendadas para teste.

---

## Como Executar os Testes Unitários

Com Node.js e Yarn/NPM instalados:
```bash
yarn test
# ou
npm test
```
