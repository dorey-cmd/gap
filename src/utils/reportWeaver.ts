// src/utils/reportWeaver.ts
import { QUESTIONS, CATEGORIES, DIAGNOSTIC_LIBRARY, DiagnosticState } from '../data/diagnosticLibrary';
import { AssessmentState } from '../hooks/useAssessment';

export interface WeavedCategoryReport {
  id: number;
  name: string;
  level: number;
  percentage: number;
  emotionalTitle: string;
  diagnosisText: string;
  businessCostText: string;
  emotionalReflectionText: string;
  futureVisionText: string;
  improvementOpportunityText: string;
  reflectionQuestion: string;
  userCommentsWeaved: string[];
}

export interface WeavedReport {
  fullName: string;
  businessName: string;
  date: string;
  executiveSummary: string;
  categories: WeavedCategoryReport[];
  strongestCategoryName: string;
  weakestCategoryName: string;
  biggestFriction: string;
  biggestOpportunity: string;
  finalOneThing: string;
}

export function weaveReport(state: AssessmentState): WeavedReport {
  // 1. Calculate scores
  const categoryTotals: { [catId: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const categoryCounts: { [catId: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  QUESTIONS.forEach((q) => {
    const rawValue = state.answers[q.id] || 2; // Default to neutral/low agreement if unanswered
    // 1-4 scale reverse scoring: 5 - rawValue (maps: 1->4, 2->3, 3->2, 4->1)
    const scoredValue = q.isReverse ? (5 - rawValue) : rawValue;
    categoryTotals[q.category] += scoredValue;
    categoryCounts[q.category] += 1;
  });

  const categoryReports: WeavedCategoryReport[] = [];
  let lowestPercentage = Infinity;
  let highestPercentage = -Infinity;
  let weakestCatId = 1;
  let strongestCatId = 1;

  Object.keys(CATEGORIES).forEach((catStr) => {
    const catId = parseInt(catStr);
    const total = categoryTotals[catId];
    const maxPossible = categoryCounts[catId] * 4; // Max possible points (Q_PER_CATEGORY * 4)
    const minPossible = categoryCounts[catId] * 1; // Min possible points (Q_PER_CATEGORY * 1)
    
    // Normalize percentage
    const percentage = Math.round(((total - minPossible) / (maxPossible - minPossible)) * 100);

    let level = 3;
    if (percentage <= 35) level = 1;
    else if (percentage <= 55) level = 2;
    else if (percentage <= 75) level = 3;
    else if (percentage <= 90) level = 4;
    else level = 5;

    if (percentage < lowestPercentage) {
      lowestPercentage = percentage;
      weakestCatId = catId;
    }
    if (percentage > highestPercentage) {
      highestPercentage = percentage;
      strongestCatId = catId;
    }

    const libraryState = DIAGNOSTIC_LIBRARY[catId][level];

    // Find and weave user comments for this category
    const userCommentsWeaved: string[] = [];
    QUESTIONS.filter((q) => q.category === catId).forEach((q) => {
      const comment = state.comments[q.id];
      if (comment && comment.trim()) {
        userCommentsWeaved.push(`בנוגע לטענה "${q.text}", שיתפת ש: "${comment.trim()}"`);
      }
    });

    categoryReports.push({
      id: catId,
      name: CATEGORIES[catId],
      level,
      percentage,
      emotionalTitle: libraryState.emotionalTitle,
      diagnosisText: libraryState.diagnosisText,
      businessCostText: libraryState.businessCostText,
      emotionalReflectionText: libraryState.emotionalReflectionText,
      futureVisionText: libraryState.futureVisionText,
      improvementOpportunityText: libraryState.improvementOpportunityText,
      reflectionQuestion: libraryState.reflectionQuestion,
      userCommentsWeaved
    });
  });

  const strongestCategoryName = CATEGORIES[strongestCatId];
  const weakestCategoryName = CATEGORIES[weakestCatId];

  const frictionMap: { [catId: number]: string } = {
    1: "ניהול לא מספיק שקוף של לידים ושימור לקוחות, דבר המוביל לזליגת עסקאות סמויה מן העין.",
    2: "היעדר מעקב נתונים חי ומבוסס מדדים, היוצר ערפל ניהולי וקבלת החלטות המסתמכת על תחושות בטן.",
    3: "תלות גבוהה של העסק בזיכרון האנושי של הצוות, המאט את העבודה ומעמיס על התקשורת הפנימית.",
    4: "אי-ניצול של פוטנציאל כלי ה-AI וייעול העבודה האוטומטי, שמשאיר את העסק מאחור ברמת התפוקה.",
    5: "תלות מוחלטת בך כבעל העסק בליבת קבלת ההחלטות והידע, שמונעת סקייל ואפשרות של שקט תעשייתי.",
    6: "תשתית תפעולית שברירית שטרם הותאמה לקליטה וניהול של כמות כפולה של לקוחות ללא כאוס."
  };

  const opportunityMap: { [catId: number]: string } = {
    1: "בניית סיסטם לקוחות ולידים (CRM) מרכזי שיעלה את רמת השירות ב-40% ויבטיח ששום לקוח לא ייעלם מהרדאר.",
    2: "הקמת דאשבורד מדדי ביצוע (Dashboard KPI) שיאפשר לקבל החלטות מבוססות מספרים ולחזות הכנסות קדימה.",
    3: "ייזום תהליכי אוטומציה ואינטגרציות שיחסכו לצוות עשרות שעות של עבודה חוזרת ושוחקת בכל שבוע.",
    4: "הטמעת סוכני בינה מלאכותית (AI Assistants) שיוכלו לנסח, לתמצת ולבצע משימות מורכבות בשברירי שניות.",
    5: "בניית ספר נהלים דיגיטלי (SOPs) והגדרת סמכויות שתאפשר לעסק לרוץ באופן עצמאי לחלוטין בלעדיך.",
    6: "עיצוב מחדש של תהליכי הקליטה (Onboarding) וההדרכה של לקוחות ועובדים כדי לבנות מכונת צמיחה יציבה."
  };

  const biggestFriction = frictionMap[weakestCatId];
  const biggestOpportunity = opportunityMap[weakestCatId];

  const dateFormatted = new Date().toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const userGoalText = state.finalOneThing && state.finalOneThing.trim()
    ? `בניתוח התשובה שלך לשאלת המפתח בחרת להדגיש שב-90 הימים הקרובים הנושא המרכזי ביותר לפתרון בעסק הוא: "${state.finalOneThing.trim()}". זוהי הגדרה מדויקת וחדה, שכן היא נוגעת ישירות בליבת הפערים שחשפנו.`
    : `בניתוח הנתונים עולה כי העסק נמצא כעת בצומת דרכים משמעותי, שבו שינוי קטן במבנה התפעולי יכול לשחרר עשרות שעות של עומס ולפתוח פוטנציאל הכנסות חדש.`;

  const executiveSummary = `שלום ${state.personalInfo.fullName || 'בעל עסק יקר'},

דוח זה מציג ניתוח עמוק, רפלקטיבי וחשוף של התשתית התפעולית והניהולית בעסק שלך, ${state.personalInfo.businessName || 'העסק שלך'}. האבחון מבוסס על שילוב המדדים וההערות ששיתפת עמנו, והוא מיועד לשמש כמראה אסטרטגית המציגה את המצב כפי שהוא - ללא מסכות.

מניתוח המדדים עולה תמונה ברורה המאפיינת מנהלים חרוצים: העוגן התפעולי החזק ביותר שלך כיום הוא בתחום ${strongestCategoryName}, המהווה בסיס יציב ומצוין למינוף. עם זאת, בזמן שאתה משקיע אנרגיה עצומה בשימור החוזקות, נקודת החיכוך המרכזית שלך - זו ששואבת ממך אנרגיה יומיומית, מייצרת עומס מנטלי ומעכבת את הצמיחה האמיתית של העסק - נמצאת בתחום ${weakestCategoryName}.

${userGoalText}

כאשר בוחנים את העסק שלך כמכלול, המפגש בין לחץ המכירות לתשתית התפעולית מייצר פער כואב: ${biggestFriction}
המשמעות של הפער הזה היא שחיקה. אתה מוצא את עצמך עובד 'עבור' העסק במקום לנהל אותו מלמעלה, נאלץ להחזיק ולזכור הכל בראש, ומבלה שעות רבות בכיבוי שריפות שגרתיות במקום בפיתוח אסטרטגי ויצירת שקט תעשייתי.

אבל החדשות הטובות, והתקווה הגדולה של האבחון הזה, הן שהמצב הזה אינו גזירת גורל ואינו דורש ממך לעבוד קשה יותר - להיפך, אתה עובד קשה מדי. הפער הזה נגרם אך ורק מהיעדרו של סיסטם תפעולי חכם. הפתרון אינו להוסיף לעצמך עוד שעות עבודה, אלא לבנות מערכות עצמאיות, אוטומציות ונהלים יציבים שיודעים לנהל את העבודה במקומך. ההזדמנות הגדולה ביותר שלך כרגע היא ${biggestOpportunity}

אנו מזמינים אותך להתבונן בדוח זה לא כרשימת ציונים, אלא כנקודת תפנית אסטרטגית. הצעד הראשון לשחרור העומס המנטלי והפיכת העסק למכונה משומנת ויציבה מתחיל בהבנה ממוקדת של הפערים הללו ובבחירה לבנות סיסטם שיעבוד בשבילך.`;

  return {
    fullName: state.personalInfo.fullName,
    businessName: state.personalInfo.businessName,
    date: dateFormatted,
    executiveSummary,
    categories: categoryReports,
    strongestCategoryName,
    weakestCategoryName,
    biggestFriction,
    biggestOpportunity,
    finalOneThing: state.finalOneThing
  };
}
