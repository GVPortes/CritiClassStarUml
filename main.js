const { readModel } = require("./src/modelReader");

const COMMAND_ID = "criticlass:generate-metrics";
const COMMAND_LABEL = "Gerar métricas (CK + L&K)";

function formatTargetNames(ids, targetsById, emptyLabel) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return emptyLabel;
  }
  return ids
    .map((id) => (targetsById[id] ? targetsById[id].name : id))
    .join(", ");
}

function formatCoupledTargets(relations, targetsById) {
  if (!Array.isArray(relations) || relations.length === 0) {
    return "nenhuma";
  }

  const byTarget = new Map();
  relations.forEach((rel) => {
    const targetName = targetsById[rel.targetId] ? targetsById[rel.targetId].name : rel.targetId;
    if (!byTarget.has(rel.targetId)) {
      byTarget.set(rel.targetId, { name: targetName, details: [] });
    }
    byTarget.get(rel.targetId).details.push(`${rel.direction}:${rel.kind}`);
  });

  return Array.from(byTarget.values())
    .map((entry) => `${entry.name} (${entry.details.join(", ")})`)
    .join(", ");
}

function handleGenerateMetrics() {
  const project = app.project.getProject();
  if (!project) {
    console.warn("[CritiClass] Nenhum projeto aberto.");
    return;
  }

  const modelData = readModel(project);
  const { projectName, classes, targetsById, childrenById, counts, unconfirmedApiWarnings } = modelData;

  console.log(
    `[CritiClass] Projeto: "${projectName}" | Classes: ${counts.classes} | Interfaces: ${counts.interfaces} | ` +
      `Generalizations: ${counts.generalizations} | Associations: ${counts.associations} | ` +
      `Dependencies: ${counts.dependencies} | InterfaceRealizations: ${counts.interfaceRealizations}`
  );

  classes.forEach((cls) => {
    const className = cls.name || "(sem nome)";
    const parentsText = formatTargetNames(cls.parents, targetsById, "nenhum");
    const childrenIds = childrenById[cls.id] || [];
    const childrenText = formatTargetNames(childrenIds, targetsById, "nenhuma");
    const coupledText = formatCoupledTargets(cls.relations, targetsById);

    console.log(
      `[CritiClass] Classe: ${className} (isAbstract=${cls.isAbstract}, attrs=${cls.attributes.length}, ops=${cls.operations.length}) | ` +
        `Pais: [${parentsText}] | Filhas: [${childrenText}] | Classes acopladas: [${coupledText}]`
    );
  });

  modelData.rawGeneralizations.forEach((gen) => {
    console.log(
      `[CritiClass][Generalization bruta] source="${gen.sourceName}" -> target="${gen.targetName}" ` +
        `(guardada em "${gen.ownerName}"; plugin interpreta: filha="${gen.sourceName}", mãe="${gen.targetName}")`
    );
  });

  unconfirmedApiWarnings.forEach((warning) => {
    console.warn(`[CritiClass][Aviso API StarUML] ${warning}`);
  });
}

function init() {
  app.commands.register(COMMAND_ID, handleGenerateMetrics, COMMAND_LABEL);
}

exports.init = init;
