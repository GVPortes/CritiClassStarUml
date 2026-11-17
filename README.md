# CritiClass

**Priorize o que precisa ser testado antes mesmo de escrever a primeira linha de código.**

CritiClass é uma extensão para o [StarUML](https://staruml.io/) que analisa modelos UML e identifica as classes estruturalmente mais críticas de um sistema, auxiliando na definição de prioridades de teste ainda durante a fase de design.

A ferramenta extrai métricas de complexidade, acoplamento, herança e estrutura de classes, combina esses indicadores em um Score de Criticidade configurável e utiliza o princípio de Pareto para identificar os 20% de classes que merecem maior atenção durante o planejamento dos testes.

<p align="center">
  <img src="https://img.shields.io/badge/StarUML-%3E%3D3.0.0-1F4E3D?style=flat-square" alt="StarUML">
  <img src="https://img.shields.io/badge/M%C3%A9tricas-CK%20%2B%20Lorenz%20%26%20Kidd-2E6B55?style=flat-square" alt="Métricas">
  <img src="https://img.shields.io/badge/Exporta%C3%A7%C3%A3o-XLSX%20%7C%20CSV-D97706?style=flat-square" alt="Exportação">
  <img src="https://img.shields.io/badge/Licen%C3%A7a-MIT-blue?style=flat-square" alt="Licença">
</p>

---

## O problema

O planejamento de testes de software envolve decidir onde concentrar esforços. Entretanto, nem todas as classes de um sistema apresentam o mesmo nível de complexidade estrutural.

Classes com muitas responsabilidades, alto acoplamento, hierarquias profundas ou grande quantidade de operações podem representar pontos de maior atenção durante a implementação e manutenção do software.

Tradicionalmente, parte dessas características é investigada durante a análise do código-fonte. O CritiClass propõe antecipar essa investigação para a etapa de modelagem UML.

Essa abordagem está alinhada ao conceito de **Shift-Left Testing**, levando indicadores estruturais para momentos anteriores do ciclo de desenvolvimento.

## Como o CritiClass funciona

A análise é realizada diretamente sobre o modelo aberto no StarUML.

<p align="center">
  <img src="docs/images/criticlass-workflow.svg" alt="Fluxo de funcionamento do CritiClass" width="850">
</p>

O processamento é dividido em quatro etapas:

1. **Leitura do modelo:** identificação das classes, interfaces e relacionamentos presentes no projeto.
2. **Extração de métricas:** cálculo dos indicadores de Chidamber & Kemerer e Lorenz & Kidd.
3. **Normalização e priorização:** conversão dos indicadores para uma escala comum e cálculo do Score de Criticidade.
4. **Relatório:** geração de um ranking de criticidade e exportação dos resultados para Excel ou CSV.

### Score de Criticidade

As métricas possuem escalas e unidades diferentes. Para permitir sua combinação, o CritiClass utiliza normalização Min-Max, transformando os valores para o intervalo de 0 a 1.

A normalização é calculada por:

$$
x_{\text{norm}} = \frac{x - x_{\min}}{x_{\max} - x_{\min}}
$$

Quando os valores mínimo e máximo são iguais ($x_{\max} = x_{\min}$), o resultado normalizado é definido como $0$.

Após a normalização, é calculado o Score de Criticidade por meio de uma média ponderada:

$$
\text{Score} = \frac{\sum (w_m \cdot x_{\text{norm}, m})}{\sum w_m}
$$

Os pesos são configuráveis, permitindo adaptar a análise às características e aos objetivos de cada projeto.

As classes são ordenadas pelo Score em ordem decrescente. As primeiras $\lceil 0{,}20 \times N \rceil$ classes recebem a classificação **ALTA (Top 20%)**.

Esse resultado representa uma priorização estrutural para orientar o planejamento dos testes, não uma previsão estatística de defeitos.

---

## Métricas analisadas

O CritiClass implementa dois conjuntos clássicos de métricas orientadas a objetos.

### Chidamber & Kemerer (CK)

| Métrica      | Descrição                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| WMC          | Weighted Methods per Class. Soma dos pesos das operações da classe. Peso padrão: 1 por operação.                                |
| DIT          | Depth of Inheritance Tree. Maior caminho da classe até a raiz da hierarquia de herança.                                         |
| NOC          | Number of Children. Quantidade de subclasses diretas.                                                                           |
| CBO          | Coupling Between Object Classes. Quantidade de classes e interfaces distintas acopladas.                                        |
| Ce           | Efferent Coupling. Quantidade de classes e interfaces das quais a classe depende.                                               |
| Ca           | Afferent Coupling. Quantidade de classes e interfaces que dependem da classe.                                                   |
| RFC (aprox.) | Response For a Class. Operações da própria classe somadas às operações distintas de classes e interfaces diretamente acopladas. |
| LCOM         | Lack of Cohesion in Methods. Não calculada, pois depende da análise de acesso aos atributos no corpo dos métodos.               |

### Lorenz & Kidd (L&K)

| Métrica | Descrição                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| NIV     | Number of Instance Variables. Atributos de instância.                                                        |
| NCV     | Number of Class Variables. Atributos estáticos.                                                              |
| NIM     | Number of Instance Methods. Operações de instância.                                                          |
| NCM     | Number of Class Methods. Operações estáticas.                                                                |
| PIM     | Public Instance Methods. Operações públicas de instância.                                                    |
| NMO     | Number of Methods Overridden. Operações que sobrescrevem métodos herdados.                                   |
| NMI     | Number of Methods Inherited. Operações herdadas não privadas e não sobrescritas.                             |
| NMA     | Number of Methods Added. Operações de instância introduzidas pela classe, calculadas por $\text{NIM} - \text{NMO}$. |
| SIX     | Specialization Index. Índice de especialização: $\frac{\text{NMO} \times \text{DIT}}{\text{NMO} + \text{NMA} + \text{NMI}}$. |
| APPM    | Average Parameters per Method. Média de parâmetros de entrada por operação, excluindo parâmetros de retorno. |

**Observação metodológica:** algumas métricas tradicionais dependem de informações disponíveis somente na implementação. O CritiClass considera as informações observáveis nos diagramas UML e documenta explicitamente as aproximações utilizadas.

---

## Relatórios e exportação

A análise pode ser exportada para Excel (.xlsx) ou CSV (.csv).

O relatório Excel é organizado em três abas:

### 1. Métricas

Apresenta os valores brutos de todas as métricas calculadas para cada classe do modelo.

### 2. Priorização (Top 20%)

Apresenta o ranking das classes, incluindo:

- Score de Criticidade;
- Soma Ponderada;
- Classificação de prioridade;
- Métricas normalizadas;
- Pesos configurados;
- Valores mínimos e máximos observados no modelo.

As classes classificadas como ALTA (Top 20%) recebem destaque visual no relatório.

### 3. Legenda

Reúne as definições, siglas e informações metodológicas das métricas utilizadas.

---

## Configuração de pesos

O CritiClass permite personalizar a influência de cada métrica no cálculo do Score de Criticidade.

Por exemplo:

```text
WMC=2, CBO=3, RFC=2, DIT=0
```

Nesse cenário, o acoplamento (CBO) terá maior influência na priorização, enquanto DIT não contribuirá para o Score.

Os pesos padrão são iguais a 1.0 para todas as métricas.

---

## Instalação

### Requisitos

- StarUML versão 3.0.0 ou superior.
- Node.js e Yarn ou npm para execução dos testes de desenvolvimento.

### Windows

Copie a pasta do projeto para o diretório de extensões do StarUML:

```powershell
Copy-Item -Path ".\*" -Destination "$env:APPDATA\StarUML\extensions\user\CritiClassStarUml" -Recurse -Force
```

### macOS

Crie um link simbólico para o diretório de extensões:

```bash
ln -s "$(pwd)" "$HOME/Library/Application Support/StarUML/extensions/user/CritiClassStarUml"
```

### Ativação

1. Abra o StarUML.
2. Acesse **Debug → Reload**.
3. Localize o menu **CritiClass** na barra superior.

## Comandos disponíveis

| Comando                       | Atalho           | Descrição                                                                      |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------ |
| Gerar métricas (CK + L&K)     | Ctrl + Shift + M | Executa a análise, gera o relatório Excel e apresenta as classes prioritárias. |
| Exportar métricas (.csv)      | —                | Exporta os valores das métricas em CSV (UTF-8 com BOM).                        |
| Configurar pesos das métricas | —                | Permite personalizar os pesos utilizados no Score.                             |
| Restaurar pesos padrão        | —                | Retorna todos os pesos para 1.0.                                               |

---

## Arquitetura do projeto

O projeto foi estruturado para separar a integração com a API do StarUML das regras de cálculo e priorização.

```text
CritiClassStarUml/
├── package.json
├── main.js
├── menus/
│   └── criticlass.json
├── keymaps/
│   └── criticlass.json
├── src/
│   ├── modelReader.js
│   ├── exporter.js
│   └── metrics/
│       ├── ck.js
│       ├── lk.js
│       ├── normalizer.js
│       └── prioritizer.js
└── test/
    ├── fixtures/
    │   └── sampleModel.js
    ├── ck.test.js
    ├── lk.test.js
    ├── normalizer.test.js
    ├── prioritizer.test.js
    ├── exporter.test.js
    └── modelReader.test.js
```

### Testes automatizados

A lógica de cálculo e priorização possui testes unitários independentes da execução do StarUML.

Para executar:

```bash
yarn test
```

Ou:

```bash
npm test
```

---

## Tecnologias e conceitos

- JavaScript
- StarUML Extension API
- UML e Engenharia de Software
- Métricas de software orientadas a objetos
- Normalização Min-Max
- Média ponderada
- Princípio de Pareto
- Testes unitários
- OpenXML e exportação de planilhas

---

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
