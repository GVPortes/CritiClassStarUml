const { readModel } = require("../src/modelReader");

describe("Model Reader (StarUML repository -> plain JS objects)", () => {
  test("reads nested packages, filters out UMLProfile and return parameters, and handles all relation kinds", () => {
    const ifaceRepo = {
      _type: "UMLInterface",
      _id: "i_repo",
      name: "IRepository",
      attributes: [],
      operations: [
        {
          _type: "UMLOperation",
          _id: "op_save",
          name: "save",
          visibility: "public",
          isStatic: false,
          parameters: [
            { _id: "p_entity", name: "entity", type: "Object", direction: "in" },
            { _id: "p_ret", name: "", type: "boolean", direction: "return" }
          ]
        }
      ],
      ownedElements: []
    };

    const classBase = {
      _type: "UMLClass",
      _id: "c_base",
      name: "BaseEntity",
      isAbstract: true,
      attributes: [
        { _id: "a_id", name: "id", visibility: "protected", isStatic: false }
      ],
      operations: [],
      ownedElements: []
    };

    const classOrder = {
      _type: "UMLClass",
      _id: "c_order",
      name: "Order",
      isAbstract: false,
      attributes: [],
      operations: [
        {
          _type: "UMLOperation",
          _id: "op_total",
          name: "calculateTotal",
          visibility: "public",
          isStatic: false,
          parameters: [
            { _id: "p_tax", name: "tax", type: { name: "Decimal" }, direction: "in" },
            { _id: "p_out", name: "result", type: "Decimal", direction: "return" }
          ]
        }
      ],
      ownedElements: []
    };

    const classItem = {
      _type: "UMLClass",
      _id: "c_item",
      name: "OrderItem",
      isAbstract: false,
      attributes: [],
      operations: [],
      ownedElements: []
    };

    // Relations stored inside different classes/packages
    classOrder.ownedElements.push(
      {
        _type: "UMLGeneralization",
        _id: "gen_1",
        source: classOrder,
        target: classBase
      },
      {
        _type: "UMLInterfaceRealization",
        _id: "ir_1",
        source: classOrder,
        target: ifaceRepo
      },
      {
        _type: "UMLAssociation",
        _id: "assoc_self",
        end1: { reference: classOrder, aggregation: "none", navigable: "unspecified" },
        end2: { reference: classOrder, aggregation: "none", navigable: "unspecified" }
      },
      {
        _type: "UMLAssociation",
        _id: "assoc_incomplete",
        end1: { reference: classOrder, aggregation: "none", navigable: "unspecified" },
        end2: { reference: null, aggregation: "none", navigable: "unspecified" }
      },
      {
        _type: "UMLAssociation",
        _id: "assoc_comp",
        end1: { reference: classOrder, aggregation: "composite", navigable: "unspecified" },
        end2: { reference: classItem, aggregation: "none", navigable: "navigable" }
      }
    );

    const profileElement = {
      _type: "UMLProfile",
      _id: "prof_1",
      name: "StandardProfile",
      ownedElements: [
        {
          _type: "UMLClass",
          _id: "c_ignored",
          name: "ProfileStereotypeClass",
          ownedElements: []
        }
      ]
    };

    const rootProject = {
      _type: "Project",
      _id: "proj_1",
      name: "EcommerceModel",
      ownedElements: [
        profileElement,
        {
          _type: "UMLModel",
          _id: "m_1",
          name: "DomainModel",
          ownedElements: [
            ifaceRepo,
            classBase,
            {
              _type: "UMLPackage",
              _id: "pkg_sales",
              name: "Sales",
              ownedElements: [classOrder, classItem, classOrder] // duplicate reference tested
            }
          ]
        }
      ]
    };

    const result = readModel(rootProject);

    expect(result.projectName).toBe("EcommerceModel");
    expect(result.classes.length).toBe(3); // BaseEntity, Order, OrderItem (Profile class ignored, duplicate Order deduplicated)

    const orderObj = result.classes.find((c) => c.name === "Order");
    expect(orderObj.parents).toEqual(["c_base"]);
    expect(orderObj.operations[0].params).toEqual([{ name: "tax", type: "Decimal" }]); // return param excluded

    // Relations on Order: interfaceRealization (out -> i_repo) and composition (out -> c_item)
    expect(orderObj.relations).toEqual([
      { kind: "composition", targetId: "c_item", direction: "out" },
      { kind: "interfaceRealization", targetId: "i_repo", direction: "out" }
    ]);

    // OrderItem receives incoming composition from Order
    const itemObj = result.classes.find((c) => c.name === "OrderItem");
    expect(itemObj.relations).toEqual([
      { kind: "composition", targetId: "c_order", direction: "in" }
    ]);
  });
});
