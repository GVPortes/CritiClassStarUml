# CritiClass — StarUML Object-Oriented Metrics Extension

Extensão para o **StarUML** que coleta métricas orientadas a objetos de **Chidamber & Kemerer (CK)** e **Lorenz & Kidd (L&K)** diretamente a partir de diagramas de classes UML, gerando uma planilha (`.xlsx` com aba de **Métricas** e aba de **Legenda**, ou `.csv`) com uma linha por classe.

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

### Fase 2 — Priorização de Testes (Futura)
- [ ] Normalização min-max das métricas coletadas
- [ ] Pesos configuráveis e cálculo do score de criticidade por classe
- [ ] Indicação automática do ranking e das ~20% de classes mais críticas para teste

---

## Estrutura do Projeto

```text
CritiClassStarUml/
├── package.json
├── main.js                   # Ponto de entrada (init), comandos e diálogo final no StarUML
├── menus/
│   └── criticlass.json       # Menu "CritiClass -> Gerar métricas (CK + L&K)" e exportação CSV
├── keymaps/
│   └── criticlass.json       # Atalho de teclado (Ctrl+Shift+M)
├── src/
│   ├── modelReader.js        # Conversão do repositório do StarUML para objetos JS puros
│   ├── exporter.js           # Geração de .xlsx (abas "Métricas" e "Legenda") e .csv
│   └── metrics/
│       ├── ck.js             # Funções puras das métricas de Chidamber & Kemerer
│       └── lk.js             # Funções puras das métricas de Lorenz & Kidd
└── test/
    ├── fixtures/
    │   └── sampleModel.js    # Modelo de referência (Person, Student, Professor, Course) e gabarito
    ├── ck.test.js            # Testes unitários das métricas CK
    ├── lk.test.js            # Testes unitários das métricas L&K
    ├── exporter.test.js      # Testes unitários da exportação (.xlsx, .csv e aba Legenda)
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

*(Opcional: caso deseje instalar o SheetJS e o Jest via gerenciador de pacotes, execute `yarn install` ou `npm install` na pasta do projeto. O exportador também possui geração nativa OpenXML `.xlsx` embutida caso `node_modules` não esteja presente).*

### 2. Recarregar e executar
1. No StarUML, acesse **Debug → Reload**.
2. Abra um modelo `.mdj` com um diagrama de classes.
3. Acione **CritiClass → Gerar métricas (CK + L&K)** no menu ou pressione **`Ctrl+Shift+M`** (ou escolha **CritiClass → Exportar métricas (.csv)**).
4. O arquivo `<NomeDoProjeto>-metrics.xlsx` será salvo na sua pasta de **Downloads** (contendo as abas **Métricas** e **Legenda**) e um diálogo confirmará o total de classes analisadas.

---

## Como Executar os Testes Unitários

Com Node.js e Yarn/NPM instalados:
```bash
yarn test
# ou
npm test
```
