// src/app/api/diagnose/route.ts
import { NextResponse } from 'next/server';
import { QUESTIONS, CATEGORIES, DIAGNOSTIC_LIBRARY } from '../../../data/diagnosticLibrary';
import { supabase } from '../../../lib/supabase';


const openAiKey = process.env.OPENAI_API_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { answers, comments, finalOneThing, personalInfo } = body;

    if (!answers) {
      return NextResponse.json({ error: "Answers are required" }, { status: 400 });
    }

    // 1. Calculate scores (aligned with 1-4 scale and 4 questions per category)
    const categoryTotals: { [catId: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const categoryCounts: { [catId: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    QUESTIONS.forEach((q) => {
      const rawValue = answers[q.id] || 2;
      // 1-4 scale: 5 - rawValue maps reverse questions
      const scoredValue = q.isReverse ? (5 - rawValue) : rawValue;
      categoryTotals[q.category] += scoredValue;
      categoryCounts[q.category] += 1;
    });

    let weakestCategoryName = "";
    let strongestCategoryName = "";
    let lowestPercentage = Infinity;
    let highestPercentage = -Infinity;
    let weakestCatId = 1;

    const categoryMaturity: { [catId: number]: { name: string; percentage: number; level: number; libraryState: any } } = {};

    Object.keys(CATEGORIES).forEach((catStr) => {
      const catId = parseInt(catStr);
      const total = categoryTotals[catId];
      const maxPossible = categoryCounts[catId] * 4; // 16 points (4 questions * 4 points)
      const minPossible = categoryCounts[catId] * 1; // 4 points (4 questions * 1 point)
      const percentage = Math.round(((total - minPossible) / (maxPossible - minPossible)) * 100);

      let level = 3;
      if (percentage <= 35) level = 1;
      else if (percentage <= 55) level = 2;
      else if (percentage <= 75) level = 3;
      else if (percentage <= 90) level = 4;
      else level = 5;

      if (percentage < lowestPercentage) {
        lowestPercentage = percentage;
        weakestCategoryName = CATEGORIES[catId];
        weakestCatId = catId;
      }
      if (percentage > highestPercentage) {
        highestPercentage = percentage;
        strongestCategoryName = CATEGORIES[catId];
      }

      categoryMaturity[catId] = {
        name: CATEGORIES[catId],
        percentage,
        level,
        libraryState: DIAGNOSTIC_LIBRARY[catId][level]
      };
    });

    const frictionMap: { [catId: number]: string } = {
      1: "ניהול לא מספיק שקוף של לידים ושימור לקוחות, דבר המוביל לזליגת עסקאות סמויה מן העין.",
      2: "היעדר מעקב נתונים חי ומבוסס מדדים, היוצר ערפל ניהולי וקבלת החלטות המסתמכת על תחושות בטן.",
      3: "תלות גבוהה של העסק בזיכרון האנושי של הצוות, המאט את העבודה ומעמיס על התקשורת הפנימית.",
      4: "אי-ניצול של פוטנציאל כלי ה-AI וייעול העבודה האוטומטי, שמשאיר את העסק מאחור ברמת התפוקה.",
      5: "תלות מוחלטת בך כבעל העסק בליבת קבלת ההחלטות והידע, שמונעת סקייל ואפשרות של שקט תעשייתי.",
      6: "תשתית תפעולית שברירית שטרם הותאמה לקליטה וניהול של כמות כפולה של לקוחות ללא כאוס."
    };

    const opportunityMap: { [catId: number]: string } = {
      1: "בניית סיסטם לקוחות (CRM) מרכזי שיעלה את רמת השירות ב-40% ויבטיח ששום לקוח לא ייעלם מהרדאר.",
      2: "הקמת דאשבורד מדדי ביצוע (Dashboard KPI) שיאפשר לקבל החלטות מבוססות מספרים ולחזות הכנסות קדימה.",
      3: "ייזום תהליכי אוטומציה ואינטגרציות שיחסכו לצוות עשרות שעות של עבודה חוזרת ושוחקת בכל שבוע.",
      4: "הטמעת סוכני בינה מלאכותית (AI Assistants) שיוכלו לנסח, לתמצת ולבצע משימות מורכבות בשברירי שניות.",
      5: "בניית ספר נהלים דיגיטלי (SOPs) והגדרת סמכויות שתאפשר לעסק לרוץ באופן עצמאי לחלוטין בלעדיך.",
      6: "עיצוב מחדש של תהליכי הקליטה (Onboarding) וההדרכה של לקוחות ועובדים כדי לבנות מכונת צמיחה יציבה."
    };

    const biggestFriction = frictionMap[weakestCatId];
    const biggestOpportunity = opportunityMap[weakestCatId];

    const categoriesReport = Object.keys(CATEGORIES).map((catStr) => {
      const catId = parseInt(catStr);
      const mat = categoryMaturity[catId];
      
      const userCommentsWeaved: string[] = [];
      QUESTIONS.filter((q) => q.category === catId).forEach((q) => {
        const comment = comments?.[q.id];
        if (comment && comment.trim()) {
          userCommentsWeaved.push(`בנוגע לטענה "${q.text}", שיתפת ש: "${comment.trim()}"`);
        }
      });

      return {
        id: catId,
        name: mat.name,
        level: mat.level,
        percentage: mat.percentage,
        emotionalTitle: mat.libraryState.emotionalTitle,
        diagnosisText: mat.libraryState.diagnosisText,
        businessCostText: mat.libraryState.businessCostText,
        emotionalReflectionText: mat.libraryState.emotionalReflectionText,
        futureVisionText: mat.libraryState.futureVisionText,
        improvementOpportunityText: mat.libraryState.improvementOpportunityText,
        reflectionQuestion: mat.libraryState.reflectionQuestion,
        userCommentsWeaved
      };
    });

    let executiveSummary = "";

    if (openAiKey) {
      try {
        const prompt = `
אתה פועל כפסיכולוג עסקי בכיר ומומחה הנדסת סיסטם ותפעול מחברת AltruBiz (אלטרוביז).
תפקידך לכתוב מכתב סיכום מנהלים אישי, נוגע ללב, עמוק ומקצועי ביותר (Executive Summary) בעברית צרופה וילידית עבור בעל העסק.

להלן נתוני האבחון של העסק:
- שם בעל העסק: ${personalInfo?.fullName || "בעל עסק"}
- שם העסק: ${personalInfo?.businessName || "העסק שלך"}
- העוגן החזק ביותר שנמצא באבחון (הציון הכי גבוה): ${strongestCategoryName}
- נקודת החיכוך הכי גדולה (הציון הכי נמוך): ${weakestCategoryName}
- הפער המרכזי שנוצר כתוצאה מהחיכוך: ${biggestFriction}
- ההזדמנות הגדולה ביותר לשיפור: ${biggestOpportunity}
- השאלה המסכמת שבה המשתמש ציין מה הנושא שהכי דחוף לו לפתור ב-90 הימים הקרובים: "${finalOneThing || "לא צוין"}"

להלן הערות חופשיות מיוחדות שהמשתמש כתב במהלך השאלון המראות את הכאב שלו (השתמש בהן וצטט אותן בעדינות וברגישות בתוך המכתב כדי להראות שהקשבנו לו):
${JSON.stringify(comments || {})}

הנחיות לכתיבה:
1. כתוב את המכתב בנימה אינטליגנטית, מכבדת, פסיכולוגית, אסטרטגית ומלאת חמלה ותקווה.
2. אל תפגע במשתמש ואל תגרום לו להרגיש אשם או נשפט. תן לו להרגיש מובן בצורה עמוקה (תחושת "איך הוא קרא אותי ככה").
3. צור הבנה והכרה שהבעיה המרכזית היא לא כמה קשה הוא עובד, אלא היעדרו של סיסטם תפעולי מסודר ומבנה עצמאי.
4. שלב את תשובת ה-90 ימים שלו בצורה חלקה ומותאמת אסטרטגית במכתב.
5. שמור על המותג של AltruBiz כמלווה מקצועי שמבין את האתגרים הללו מהשורש ומציע דרך חדשה ושקטה.
6. כתוב בעברית מושלמת (RTL), רהוטה וללא שגיאות כתיב או ניסוחים רובוטיים.
7. המכתב צריך להיות באורך של כ-3 עד 4 פסקאות עמוקות.
8. אל תשתמש בשום כוכביות (*) או סימוני הדגשה של כוכביות (**) בתוך הטקסט. כתוב טקסט רגיל ונקי בלבד, ללא הדגשות במארקדאון.

החזר אך ורק את טקסט המכתב, ללא שום כותרות או תיאורים מסביב.
`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a professional business psychologist and operational systems architect at AltruBiz, communicating in natural, premium Hebrew." },
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
          })
        });

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          executiveSummary = data.choices[0].message.content.trim();
        }
      } catch (openAiError) {
        console.warn("OpenAI API call failed, falling back to local report weaver:", openAiError);
      }
    }

    if (!executiveSummary) {
      const userGoalText = finalOneThing && finalOneThing.trim()
        ? `בניתוח התשובה שלך לשאלת המפתח בחרת להדגיש שב-90 הימים הקרובים הנושא המרכזי ביותר לפתרון בעסק הוא: "${finalOneThing.trim()}". זוהי הגדרה מדויקת וחדה, שכן היא נוגעת ישירות בליבת הפערים שחשפנו.`
        : `בניתוח הנתונים עולה כי העסק נמצא כעת בצומת דרכים משמעותי, שבו שינוי קטן במבנה התפעולי יכול לשחרר עשרות שעות של עומס ולפתוח פוטנציאל הכנסות חדש.`;

      executiveSummary = `שלום ${personalInfo?.fullName || 'בעל עסק יקר'},

דוח זה מציג ניתוח עמוק, רפלקטיבי וחשוף של התשתית התפעולית והניהולית בעסק שלך, ${personalInfo?.businessName || 'העסק שלך'}. האבחון מבוסס על שילוב המדדים וההערות ששיתפת עמנו, והוא מיועד לשמש כמראה אסטרטגית המציגה את המצב כפי שהוא - ללא מסכות.

מניתוח המדדים עולה תמונה ברורה המאפיינת מנהלים חרוצים: העוגן התפעולי החזק ביותר שלך כיום הוא בתחום ${strongestCategoryName}, המהווה בסיס יציב ומצוין למינוף. עם זאת, בזמן שאתה משקיע אנרגיה עצומה בשימור החוזקות, נקודת החיכוך המרכזית שלך - זו ששואבת ממך אנרגיה יומיומית, מייצרת עומס מנטלי ומעכבת את הצמיחה האמיתית של העסק - נמצאת בתחום ${weakestCategoryName}.

${userGoalText}

כאשר בוחנים את העסק שלך כמכלול, המפגש בין לחץ המכירות לתשתית התפעולית מייצר פער כואב: ${biggestFriction}
המשמעות של הפער הזה היא שחיקה. אתה מוצא את עצמך עובד 'עבור' העסק במקום לנהל אותו מלמעלה, נאלץ להחזיק ולזכור הכל בראש, ומבלה שעות רבות בכיבוי שריפות שגרתיות במקום בפיתוח אסטרטגי ויצירת שקט תעשייתי.

אבל החדשות הטובות, והתקווה הגדולה של האבחון הזה, הן שהמצב הזה אינו גזירת גורל ואינו דורש ממך לעבוד קשה יותר - להיפך, אתה עובד קשה מדי. הפער הזה נגרם אך ורק מהיעדרו של סיסטם תפעולי חכם. הפתרון אינו להוסיף לעצמך עוד שעות עבודה, אלא לבנות מערכות עצמאיות, אוטומציות ונהלים יציבים שיודעים לנהל את העבודה במקומך. ההזדמנות הגדולה ביותר שלך כרגע היא ${biggestOpportunity}

אנו מזמינים אותך להתבונן בדוח זה לא כרשימת ציונים, אלא כנקודת תפנית אסטרטגית. הצעד הראשון לשחרור העומס המנטלי והפיכת העסק למכונה משומנת ויציבה מתחיל בהבנה ממוקדת של הפערים הללו ובבחירה לבנות סיסטם שיעבוד בשבילך.`;
    }

    const dateFormatted = new Date().toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const report = {
      fullName: personalInfo?.fullName || "",
      businessName: personalInfo?.businessName || "",
      date: dateFormatted,
      executiveSummary,
      categories: categoriesReport,
      strongestCategoryName,
      weakestCategoryName,
      biggestFriction,
      biggestOpportunity,
      finalOneThing: finalOneThing || ""
    };

    // 1. Sync finished diagnostic + AI summary to Supabase
    if (supabase && body.sessionId) {
      try {
        await supabase
          .from('diagnostics')
          .upsert({
            session_id: body.sessionId,
            full_name: personalInfo?.fullName || null,
            phone: personalInfo?.phone || null,
            email: personalInfo?.email || null,
            business_name: personalInfo?.businessName || null,
            answers: answers,
            comments: comments || {},
            final_one_thing: finalOneThing || null,
            completed: true,
            ai_summary: executiveSummary,
            updated_at: new Date().toISOString()
          }, { onConflict: 'session_id' });
      } catch (dbErr) {
        console.error("Database Update Error:", dbErr);
      }
    }

    // 2. Integrate with GoHighLevel API using Private Integration Token (PIT)
    const ghlToken = process.env.GHL_PIT_TOKEN || 'pit-b4a47851-a1cf-4593-8cfe-62f77ffb516c';
    if (ghlToken && personalInfo?.email) {
      try {
        const nameParts = (personalInfo?.fullName || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const ghlHeaders = {
          'Authorization': `Bearer ${ghlToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        };

        const host = request.headers.get('host') || 'gap-nu-one.vercel.app';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const shareableUrl = `${protocol}://${host}/?session=${body.sessionId || ""}`;

        // Create or update contact in GHL
        const ghlResponse = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
          method: "POST",
          headers: ghlHeaders,
          body: JSON.stringify({
            firstName,
            lastName,
            name: personalInfo?.fullName || "",
            email: personalInfo?.email || "",
            phone: personalInfo?.phone || "",
            companyName: personalInfo?.businessName || "",
            tags: ["אבחון עסקי - הפער", "AltruBiz Diagnostic"]
          })
        });

        if (ghlResponse.ok) {
          const ghlData = await ghlResponse.json();
          const ghlContactId = ghlData.contact?.id;

          // If successfully created/updated, add a detailed consultation note to GHL
          if (ghlContactId) {
            const noteContent = `📋 אבחון עסקי - הפער שאף אחד לא מדבר עליו (AltruBiz)
-------------------------------------------------
פרטי הליד:
- שם: ${personalInfo?.fullName || ""}
- טלפון: ${personalInfo?.phone || ""}
- אימייל: ${personalInfo?.email || ""}
- עסק: ${personalInfo?.businessName || ""}

תוצאות האבחון לפי קטגוריות:
${categoriesReport.map(cat => `- ${cat.name}: ${cat.percentage}% (רמת בגרות ${cat.level}/5)`).join('\n')}

סיכום אסטרטגי:
- נקודת חוזק (עוגן): ${strongestCategoryName}
- נקודת חיכוך (צוואר בקבוק): ${weakestCategoryName}
- הפער הנוצר: ${biggestFriction}
- ההזדמנות החבויה: ${biggestOpportunity}

האתגר המרכזי ל-90 הימים הקרובים:
"${finalOneThing || "לא צוין"}"

🔗 קישור קבוע לצפייה בדוח האינטראקטיבי המלא (Supabase):
${shareableUrl}
`;


            await fetch(`https://services.leadconnectorhq.com/contacts/${ghlContactId}/notes`, {
              method: "POST",
              headers: ghlHeaders,
              body: JSON.stringify({
                body: noteContent
              })
            });
          }
        } else {
          const errText = await ghlResponse.text();
          console.error("GHL Contact Upsert Failed:", errText);
        }
      } catch (ghlErr) {
        console.error("GHL Integration Exception:", ghlErr);
      }
    }

    return NextResponse.json({ report });

  } catch (error: any) {
    console.error("API Diagnostic Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
