// backend/src/utils/calendarEngine.js

export function getAcademicCycle() {
  const d = new Date()
  const month = d.getMonth() // 0-indexed (0=Jan, 11=Dec)
  const year = d.getFullYear()

  // Academic year rule: June 1st to May 31st
  let academicYearStr = ""
  if (month >= 5) {
    // June (5) or later
    academicYearStr = `${year}-${year + 1}`
  } else {
    // Before June
    academicYearStr = `${year - 1}-${year}`
  }

  // ODD/EVEN cycle rule
  // June (5) to Nov (10) = ODD
  // Dec (11) to May (4) = EVEN
  let cycle = "EVEN"
  if (month >= 5 && month <= 10) {
    cycle = "ODD"
  }

  return {
    academicYear: academicYearStr,
    cycle: cycle
  }
}
