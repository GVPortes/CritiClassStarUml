function isInstanceOf(element, typeName) {
  if (!element || typeof element !== "object") {
    return false;
  }
  if (typeof type !== "undefined" && type[typeName]) {
    return element instanceof type[typeName];
  }
  if (element._type === typeName) {
    return true;
  }
  return Boolean(element.constructor && element.constructor.name === typeName);
}

function resolveParameterType(paramType) {
  if (!paramType) {
    return "";
  }
  if (typeof paramType === "string") {
    return paramType;
  }
  if (typeof paramType === "object") {
    return paramType.name || paramType._id || "";
  }
  return String(paramType);
}

function isExplicitlyNavigable(navigableValue) {
  return navigableValue === true || navigableValue === "navigable";
}

function isExplicitlyNotNavigable(navigableValue) {
  return (
    navigableValue === false ||
    navigableValue === "notNavigable" ||
    navigableValue === "none"
  );
}

function getAssociationKind(end1, end2) {
  const agg1 = end1 ? end1.aggregation : "none";
  const agg2 = end2 ? end2.aggregation : "none";
  if (agg1 === "composite" || agg2 === "composite") {
    return "composition";
  }
  if (agg1 === "shared" || agg2 === "shared") {
    return "aggregation";
  }
  return "association";
}

function collectModelElements(rootElement) {
  const visitedIds = new Set();
  const collected = {
    classes: [],
    interfaces: [],
    generalizations: [],
    associations: [],
    dependencies: [],
    interfaceRealizations: []
  };

  function traverse(element) {
    if (!element || typeof element !== "object") {
      return;
    }

    // Ignore UML profiles and standard libraries
    if (isInstanceOf(element, "UMLProfile")) {
      return;
    }

    const elementId = element._id;
    if (elementId) {
      if (visitedIds.has(elementId)) {
        return;
      }
      visitedIds.add(elementId);
    }

    if (isInstanceOf(element, "UMLClass")) {
      collected.classes.push(element);
    } else if (isInstanceOf(element, "UMLInterface")) {
      collected.interfaces.push(element);
    } else if (isInstanceOf(element, "UMLGeneralization")) {
      collected.generalizations.push(element);
    } else if (isInstanceOf(element, "UMLAssociation")) {
      collected.associations.push(element);
    } else if (isInstanceOf(element, "UMLDependency")) {
      collected.dependencies.push(element);
    } else if (isInstanceOf(element, "UMLInterfaceRealization")) {
      collected.interfaceRealizations.push(element);
    }

    if (Array.isArray(element.ownedElements)) {
      element.ownedElements.forEach(traverse);
    }
  }

  traverse(rootElement);
  return collected;
}

function buildUnconfirmedApiWarnings(collected) {
  const warnings = [];

  // 1. UMLAttribute properties (.visibility, .isStatic)
  let sampleAttr = null;
  for (const cls of collected.classes) {
    if (Array.isArray(cls.attributes) && cls.attributes.length > 0) {
      sampleAttr = cls.attributes[0];
      break;
    }
  }
  if (!sampleAttr) {
    warnings.push(
      "UMLAttribute (.visibility, .isStatic): ainda não confirmado no PickClass (nenhum atributo presente no modelo aberto para inspecionar)."
    );
  } else {
    const hasVisibility = "visibility" in sampleAttr;
    const hasIsStatic = "isStatic" in sampleAttr;
    warnings.push(
      `UMLAttribute (.visibility, .isStatic): não constava no PickClass; inspecionado no modelo atual -> visibility=${hasVisibility ? JSON.stringify(sampleAttr.visibility) : "AUSENTE"}, isStatic=${hasIsStatic ? JSON.stringify(sampleAttr.isStatic) : "AUSENTE"} (chaves: ${Object.keys(sampleAttr).join(", ")}).`
    );
  }

  // 2. UMLOperation (.visibility, .isStatic, .parameters) & UMLParameter (.name, .type, .direction)
  let sampleOp = null;
  let sampleParam = null;
  for (const cls of collected.classes) {
    if (Array.isArray(cls.operations) && cls.operations.length > 0) {
      if (!sampleOp) {
        sampleOp = cls.operations[0];
      }
      for (const op of cls.operations) {
        if (Array.isArray(op.parameters) && op.parameters.length > 0) {
          sampleParam = op.parameters[0];
          break;
        }
      }
      if (sampleOp && sampleParam) {
        break;
      }
    }
  }

  if (!sampleOp) {
    warnings.push(
      "UMLOperation (.visibility, .isStatic, .parameters): ainda não confirmado no PickClass (nenhuma operação presente no modelo aberto para inspecionar)."
    );
  } else {
    warnings.push(
      `UMLOperation (.visibility, .isStatic, .parameters): não constava no PickClass; inspecionado no modelo atual -> visibility=${JSON.stringify(sampleOp.visibility)}, isStatic=${JSON.stringify(sampleOp.isStatic)}, parameters=${Array.isArray(sampleOp.parameters) ? `Array(${sampleOp.parameters.length})` : "AUSENTE"} (chaves: ${Object.keys(sampleOp).join(", ")}).`
    );
  }

  if (!sampleParam) {
    warnings.push(
      "UMLParameter (.name, .type, .direction === 'return'): ainda não confirmado no PickClass (nenhum parâmetro de operação presente no modelo aberto para inspecionar)."
    );
  } else {
    warnings.push(
      `UMLParameter (.name, .type, .direction): não constava no PickClass; inspecionado no modelo atual -> name=${JSON.stringify(sampleParam.name)}, direction=${JSON.stringify(sampleParam.direction)}, type=${JSON.stringify(resolveParameterType(sampleParam.type))} (chaves: ${Object.keys(sampleParam).join(", ")}).`
    );
  }

  // 3. UMLAssociationEnd (.navigable values for directed vs undirected)
  if (collected.associations.length === 0) {
    warnings.push(
      "UMLAssociationEnd (.navigable em associação direcionada vs. sem navegabilidade): PickClass só testava end2.navigable == 'unspecified' (nenhuma associação presente no modelo aberto)."
    );
  } else {
    const navSamples = collected.associations.map((assoc) => {
      const end1Name = assoc.end1 && assoc.end1.reference ? assoc.end1.reference.name : "?";
      const end2Name = assoc.end2 && assoc.end2.reference ? assoc.end2.reference.name : "?";
      const nav1 = assoc.end1 ? assoc.end1.navigable : undefined;
      const nav2 = assoc.end2 ? assoc.end2.navigable : undefined;
      return `${end1Name}[end1.navigable=${JSON.stringify(nav1)}] <-> ${end2Name}[end2.navigable=${JSON.stringify(nav2)}]`;
    });
    warnings.push(
      `UMLAssociationEnd (.navigable): PickClass só testava 'unspecified'; valores encontrados neste modelo -> ${navSamples.join(" | ")}.`
    );
  }

  // 4. UMLDependency & UMLInterfaceRealization (.source, .target)
  if (collected.dependencies.length === 0) {
    warnings.push(
      "UMLDependency (.source, .target): não constava no PickClass (nenhuma UMLDependency presente no modelo aberto para confirmar)."
    );
  } else {
    const dep = collected.dependencies[0];
    warnings.push(
      `UMLDependency (.source, .target): inspecionado no modelo atual -> source=${dep.source ? dep.source.name : "AUSENTE"}, target=${dep.target ? dep.target.name : "AUSENTE"} (chaves: ${Object.keys(dep).join(", ")}).`
    );
  }

  if (collected.interfaceRealizations.length === 0) {
    warnings.push(
      "UMLInterfaceRealization (.source, .target): não constava no PickClass (nenhuma UMLInterfaceRealization presente no modelo aberto para confirmar)."
    );
  } else {
    const ir = collected.interfaceRealizations[0];
    warnings.push(
      `UMLInterfaceRealization (.source, .target): inspecionado no modelo atual -> source=${ir.source ? ir.source.name : "AUSENTE"}, target=${ir.target ? ir.target.name : "AUSENTE"} (chaves: ${Object.keys(ir).join(", ")}).`
    );
  }

  return warnings;
}

function mapClassifierToPlainObject(classifier) {
  const rawAttributes = Array.isArray(classifier.attributes) ? classifier.attributes : [];
  const rawOperations = Array.isArray(classifier.operations) ? classifier.operations : [];

  const attributes = rawAttributes.map((attr) => ({
    name: (attr && attr.name) || "",
    visibility: (attr && attr.visibility) || "public",
    isStatic: Boolean(attr && attr.isStatic)
  }));

  const operations = rawOperations.map((op) => {
    const rawParams = op && Array.isArray(op.parameters) ? op.parameters : [];
    const params = rawParams
      .filter((param) => param && param.direction !== "return")
      .map((param) => ({
        name: param.name || "",
        type: resolveParameterType(param.type)
      }));

    return {
      name: (op && op.name) || "",
      visibility: (op && op.visibility) || "public",
      isStatic: Boolean(op && op.isStatic),
      params
    };
  });

  return {
    id: classifier._id,
    name: classifier.name || "",
    isAbstract: Boolean(classifier.isAbstract),
    attributes,
    operations,
    parents: [],
    relations: []
  };
}

function readModel(rootElement, options = {}) {
  const includeInterfaces = Boolean(options.includeInterfaces);
  const collected = collectModelElements(rootElement);

  const classesById = new Map();
  const targetsById = new Map();

  collected.classes.forEach((cls) => {
    if (!cls || !cls._id) {
      return;
    }
    const plainClass = mapClassifierToPlainObject(cls);
    classesById.set(cls._id, plainClass);
    targetsById.set(cls._id, {
      id: cls._id,
      name: cls.name || "(sem nome)",
      kind: "class"
    });
  });

  collected.interfaces.forEach((iface) => {
    if (!iface || !iface._id) {
      return;
    }
    targetsById.set(iface._id, {
      id: iface._id,
      name: iface.name || "(sem nome)",
      kind: "interface"
    });
    if (includeInterfaces) {
      const plainInterface = mapClassifierToPlainObject(iface);
      classesById.set(iface._id, plainInterface);
    }
  });

  const childrenById = new Map();
  classesById.forEach((_, id) => {
    childrenById.set(id, []);
  });

  // 1. Process all UMLGeneralization from the whole model
  collected.generalizations.forEach((gen) => {
    const childRef = gen && gen.source;
    const parentRef = gen && gen.target;
    if (!childRef || !parentRef || !childRef._id || !parentRef._id) {
      return;
    }

    const childId = childRef._id;
    const parentId = parentRef._id;
    if (childId === parentId) {
      return;
    }

    const childClass = classesById.get(childId);
    if (childClass && classesById.has(parentId)) {
      if (!childClass.parents.includes(parentId)) {
        childClass.parents.push(parentId);
      }
      const parentChildren = childrenById.get(parentId) || [];
      if (!parentChildren.includes(childId)) {
        parentChildren.push(childId);
        childrenById.set(parentId, parentChildren);
      }
    }
  });

  function addDirectedRelation(sourceId, targetId, kind) {
    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }
    if (!targetsById.has(sourceId) || !targetsById.has(targetId)) {
      return;
    }

    const sourceClass = classesById.get(sourceId);
    if (sourceClass) {
      sourceClass.relations.push({
        kind,
        targetId,
        direction: "out"
      });
    }

    const targetClass = classesById.get(targetId);
    if (targetClass) {
      targetClass.relations.push({
        kind,
        targetId: sourceId,
        direction: "in"
      });
    }
  }

  // 2. Process all UMLAssociation from the whole model
  collected.associations.forEach((assoc) => {
    const end1 = assoc && assoc.end1;
    const end2 = assoc && assoc.end2;
    const ref1 = end1 && end1.reference;
    const ref2 = end2 && end2.reference;

    if (!ref1 || !ref2 || !ref1._id || !ref2._id) {
      return;
    }

    const id1 = ref1._id;
    const id2 = ref2._id;

    // Ignore self-associations
    if (id1 === id2) {
      return;
    }

    const kind = getAssociationKind(end1, end2);
    const nav1 = end1.navigable;
    const nav2 = end2.navigable;

    const end1ExplicitNav = isExplicitlyNavigable(nav1);
    const end2ExplicitNav = isExplicitlyNavigable(nav2);
    const end1ExplicitNotNav = isExplicitlyNotNavigable(nav1);
    const end2ExplicitNotNav = isExplicitlyNotNavigable(nav2);

    if (end1ExplicitNav || end2ExplicitNav) {
      if (end2ExplicitNav) {
        addDirectedRelation(id1, id2, kind);
      }
      if (end1ExplicitNav) {
        addDirectedRelation(id2, id1, kind);
      }
    } else if (!end1ExplicitNotNav && !end2ExplicitNotNav) {
      // Association without defined navigability: register both directions
      addDirectedRelation(id1, id2, kind);
      addDirectedRelation(id2, id1, kind);
    } else {
      if (!end2ExplicitNotNav) {
        addDirectedRelation(id1, id2, kind);
      }
      if (!end1ExplicitNotNav) {
        addDirectedRelation(id2, id1, kind);
      }
    }
  });

  // 3. Process all UMLDependency from the whole model
  collected.dependencies.forEach((dep) => {
    const sourceRef = dep && dep.source;
    const targetRef = dep && dep.target;
    if (!sourceRef || !targetRef || !sourceRef._id || !targetRef._id) {
      return;
    }
    addDirectedRelation(sourceRef._id, targetRef._id, "dependency");
  });

  // 4. Process all UMLInterfaceRealization from the whole model
  collected.interfaceRealizations.forEach((ir) => {
    const sourceRef = ir && ir.source;
    const targetRef = ir && ir.target;
    if (!sourceRef || !targetRef || !sourceRef._id || !targetRef._id) {
      return;
    }
    addDirectedRelation(sourceRef._id, targetRef._id, "interfaceRealization");
  });

  const unconfirmedApiWarnings = buildUnconfirmedApiWarnings(collected);

  // Raw generalizations as stored by StarUML (for direction verification)
  const rawGeneralizations = collected.generalizations.map((gen) => ({
    id: gen && gen._id,
    sourceName: gen && gen.source ? gen.source.name || "(sem nome)" : "(sem referência)",
    targetName: gen && gen.target ? gen.target.name || "(sem nome)" : "(sem referência)",
    ownerName: gen && gen._parent ? gen._parent.name || "(sem nome)" : "(sem dono)"
  }));

  return {
    projectName: (rootElement && rootElement.name) || "(sem nome)",
    classes: Array.from(classesById.values()),
    targetsById: Object.fromEntries(targetsById),
    childrenById: Object.fromEntries(childrenById),
    counts: {
      classes: collected.classes.length,
      interfaces: collected.interfaces.length,
      generalizations: collected.generalizations.length,
      associations: collected.associations.length,
      dependencies: collected.dependencies.length,
      interfaceRealizations: collected.interfaceRealizations.length
    },
    unconfirmedApiWarnings,
    rawGeneralizations
  };
}

module.exports = {
  readModel,
  collectModelElements
};

