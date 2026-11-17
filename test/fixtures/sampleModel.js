/**
 * Reference fixture of 4 classes (Person, Student, Professor, Course)
 * and expected hand-calculated CK & L&K metrics.
 */
function createAcademicSampleModel() {
  return [
    {
      id: "c_person",
      name: "Person",
      isAbstract: false,
      attributes: [
        { name: "name", visibility: "public", isStatic: false },
        { name: "birthDate", visibility: "public", isStatic: false }
      ],
      operations: [
        { name: "getName", visibility: "public", isStatic: false, params: [] },
        {
          name: "setName",
          visibility: "public",
          isStatic: false,
          params: [{ name: "name", type: "String" }]
        }
      ],
      parents: [],
      relations: []
    },
    {
      id: "c_student",
      name: "Student",
      isAbstract: false,
      attributes: [
        { name: "registration", visibility: "public", isStatic: false }
      ],
      operations: [
        { name: "getName", visibility: "public", isStatic: false, params: [] },
        {
          name: "enroll",
          visibility: "public",
          isStatic: false,
          params: [{ name: "course", type: "Course" }]
        }
      ],
      parents: ["c_person"],
      relations: [
        { kind: "association", targetId: "c_course", direction: "out" }
      ]
    },
    {
      id: "c_professor",
      name: "Professor",
      isAbstract: false,
      attributes: [
        { name: "department", visibility: "public", isStatic: false }
      ],
      operations: [
        { name: "teach", visibility: "public", isStatic: false, params: [] }
      ],
      parents: ["c_person"],
      relations: []
    },
    {
      id: "c_course",
      name: "Course",
      isAbstract: false,
      attributes: [
        { name: "title", visibility: "public", isStatic: false },
        { name: "workload", visibility: "public", isStatic: false }
      ],
      operations: [
        {
          name: "addStudent",
          visibility: "public",
          isStatic: false,
          params: [{ name: "student", type: "Student" }]
        }
      ],
      parents: [],
      relations: [
        { kind: "association", targetId: "c_student", direction: "in" }
      ]
    }
  ];
}

const EXPECTED_ACADEMIC_METRICS = {
  Person: {
    WMC: 2,
    DIT: 0,
    NOC: 2,
    CBO: 0,
    Ce: 0,
    Ca: 0,
    RFC: 2,
    LCOM: "N/A",
    NIV: 2,
    NCV: 0,
    NIM: 2,
    NCM: 0,
    PIM: 2,
    NMO: 0,
    NMI: 0,
    NMA: 2,
    SIX: 0,
    APPM: 0.5
  },
  Student: {
    WMC: 2,
    DIT: 1,
    NOC: 0,
    CBO: 1,
    Ce: 1,
    Ca: 0,
    RFC: 3,
    LCOM: "N/A",
    NIV: 1,
    NCV: 0,
    NIM: 2,
    NCM: 0,
    PIM: 2,
    NMO: 1,
    NMI: 1,
    NMA: 1,
    SIX: 0.333,
    APPM: 0.5
  },
  Professor: {
    WMC: 1,
    DIT: 1,
    NOC: 0,
    CBO: 0,
    Ce: 0,
    Ca: 0,
    RFC: 1,
    LCOM: "N/A",
    NIV: 1,
    NCV: 0,
    NIM: 1,
    NCM: 0,
    PIM: 1,
    NMO: 0,
    NMI: 2,
    NMA: 1,
    SIX: 0,
    APPM: 0
  },
  Course: {
    WMC: 1,
    DIT: 0,
    NOC: 0,
    CBO: 1,
    Ce: 0,
    Ca: 1,
    RFC: 3,
    LCOM: "N/A",
    NIV: 2,
    NCV: 0,
    NIM: 1,
    NCM: 0,
    PIM: 1,
    NMO: 0,
    NMI: 0,
    NMA: 1,
    SIX: 0,
    APPM: 1
  }
};

module.exports = {
  createAcademicSampleModel,
  EXPECTED_ACADEMIC_METRICS
};

