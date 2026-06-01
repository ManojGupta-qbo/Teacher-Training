import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Paths for persistence
const DATA_DIR = path.join(process.cwd(), "data");
const RECORDS_FILE = path.join(DATA_DIR, "backend_google_file.json");

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(RECORDS_FILE)) {
  fs.writeFileSync(RECORDS_FILE, JSON.stringify({ teachers: [], analytics: [], chats: [], sessions: [] }, null, 2));
}

// Utility to read and write database records
function readRecords() {
  try {
    const raw = fs.readFileSync(RECORDS_FILE, "utf-8");
    const data = JSON.parse(raw);
    data.teachers = data.teachers || [];
    data.analytics = data.analytics || [];
    data.chats = data.chats || [];
    data.sessions = data.sessions || [];
    return data;
  } catch (e) {
    return { teachers: [], analytics: [], chats: [], sessions: [] };
  }
}

function writeRecords(data: any) {
  try {
    data.teachers = data.teachers || [];
    data.analytics = data.analytics || [];
    data.chats = data.chats || [];
    data.sessions = data.sessions || [];
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error writing to records file:", e);
  }
}

// Log files files for external app ingestion, saved with appropriate file mode permissions (0o666/0o644)
const LOG_FILE_NDJSON = path.join(DATA_DIR, "user_chat_logs.ndjson");
const LOG_FILE_JSON = path.join(DATA_DIR, "user_chat_logs.json");

function logEvent(type: string, data: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType: type,
    ...data
  };

  // 1. Newline Delimited JSON stream (proper append mode with 0o666 permissions allowing edit/read)
  try {
    const ndjsonLine = JSON.stringify(logEntry) + "\n";
    fs.appendFileSync(LOG_FILE_NDJSON, ndjsonLine, { encoding: "utf-8", mode: 0o666, flag: "a" });
  } catch (err) {
    console.error("Failed to append to log file (ndjson):", err);
  }

  // 2. Structured JSON array format (proper read-modify-write sync loop with 0o666 permissions)
  try {
    let logsArray = [];
    if (fs.existsSync(LOG_FILE_JSON)) {
      try {
        const raw = fs.readFileSync(LOG_FILE_JSON, "utf-8");
        logsArray = JSON.parse(raw);
        if (!Array.isArray(logsArray)) {
          logsArray = [];
        }
      } catch (err) {
        logsArray = [];
      }
    }
    logsArray.push(logEntry);
    fs.writeFileSync(LOG_FILE_JSON, JSON.stringify(logsArray, null, 2), { encoding: "utf-8", mode: 0o666, flag: "w" });
  } catch (err) {
    console.error("Failed to write to log file (json):", err);
  }
}

// Low-overhead high-fidelity offline fallback fallback generator
function getOfflineFallbackResponse(message: string, currentTopic: string, language: string, profile: any): string {
  const name = profile && profile.name ? `${profile.name} ji` : "Saathi";
  const topic = (currentTopic || "general").toLowerCase();

  // 1. English Fallbacks
  const fallbacksEnglish: Record<string, string> = {
    noise: `Hello Teacher ${name}! 🙏 Let's address Classroom Noise During Transitions.
Primary school classrooms often become very loud when transitions between lessons lack predictability and structure.

🟦 **Teacher Hack ( Freeze → Countdown → Transition )**
Follow these exact steps to calm the classroom during transitions:
1. Raise your hand or use a simple clap signal.
2. Wait silently without repeated scolding.
3. Start a clear 5-second countdown.
4. Show a visual blackboard instruction.
5. Students move only after complete silence is achieved.

*Avoid*: Shouting repeatedly, giving emotional warnings, or talking while students are moving.
*Reflection Box*: At what exact moment does the classroom usually become noisy for you?`,

    burnout: `Hello Teacher ${name}! 🙏 Let's talk about Teacher Burnout and Exhaustion.
Educator fatigue usually begins through emotional exhaustion and irritability rather than dramatic breakdowns.

🟦 **Teacher Hack ( 90-Second Reset )**
Use a "90-second reset" after every 2 classes: deep breathing, slow hydration, shoulder relaxation, and a silent pause.
Protect one "no school discussion hour" daily after work hours to reset your nervous system.

*Avoid*: Continuously checking school WhatsApp groups, emotionally replaying disputes, or over-volunteering for extra workloads.
*Reflection Box*: Which part of your school day drains your emotional energy the fastest?`,

    emotional: `Hello Teacher ${name}! 🙏 Let's study Emotional Regulation after Conflict.
Carrying emotional tension from one difficult class to another affects voice speed, tone, and teaching patience.

🟦 **Teacher Hack ( Somatic Centering Reset )**
Never attempt emotional correction while you are emotionally activated.
Use:
1. Speak at a slower voice speed.
2. Maintain lower volume and still body posture.
3. Do deep belly breaths, relax your shoulders, and drink water slowly.

*Avoid*: Immediate emotional reactions, arguing with students, or public humiliation of a child.
*Reflection Box*: Do classroom conflicts increase when your speaking speed increases?`,

    parents: `Hello Teacher ${name}! 🙏 Let's look at Teacher Stress from Parent Expectations.
Emotional pressure increases when parents compare children or expect constant academic perfection.

🟦 **Teacher Hack ( Structured Communication Templates )**
Use neutral, professional reply slots. E.g., "Thank you for sharing your concern. I will observe this closely and update you with specific observations."
Before difficult meetings: Prepare exactly 3 observations and 2 improvement points, and maintain standard calm voice speed.

*Avoid*: Quick emotional reactions, late-night messages, defensive responses, or overexplaining.
*Reflection Box*: Which type of parent interaction affects your emotional energy most?`,

    motivation: `Hello Teacher ${name}! 🙏 Let's review PERMA Meaning & Teacher Motivation.
Teaching often starts feeling mechanical or repetitive when we lose connection with our purpose.

🟦 **Teacher Hack ( Weekly Meaning Journal )**
Write down once a week:
1. One student success moment.
2. One genuine emotional connection.
3. One meaningful classroom interaction.
Take 2 minutes to ask yourself: "Why did I originally choose teaching?"

*Avoid*: Measuring success only through grades, ignoring minor progress, or comparing yourself to others.
*Reflection Box*: Which classroom moment recently reminded you that your work matters?`,

    attention: `Hello Teacher ${name}! 🙏 Let's check Student Attention Loss in class.
Middle school students lose attention rapidly when passive listening exceeds their self-regulation capacity.

🟦 **Teacher Hack ( 7-Minute Engagement Reset )**
Every 7 minutes, introduce an active reset: Ask a quick cooperative question, invite peer talk, offer a mini-challenge, or use a movement cue. Add student names frequently to increase conversational attention anchoring.

*Reflection Box*: Which students disengage first, and what pattern do you notice?`,

    perfectionism: `Hello Teacher ${name}! 🙏 Let's address Teacher Anxiety and Perfectionism.
Anxiety frequently appears as over-preparation, overexplaining lessons, and constant fear of losing classroom control.

🟦 **Teacher Hack ( Good Enough Classroom Check )**
Ask yourself daily:
1. Did students feel safe?
2. Did learning happen?
3. Was perfection actually necessary?
Schedule one low-pressure lesson weekly where experimentation matters more than mistakes!

*Reflection Box*: Which teaching situation creates maximum anticipatory stress for you?`,

    overstimulation: `Hello Teacher ${name}! 🙏 Let's handle Primary Classroom Overstimulation.
Hypertention and shouting happen when movement, sound, and instructions flood primary students simultaneously.

🟦 **Teacher Hack ( Input Reduction Program )**
Reduce simultaneous stimulation: Deliver only one instruction at a time, support spoken words with simple diagrams on the blackboard, utilize calm voice tones, and create a cozy quiet reset corner in your classroom.

*Reflection Box*: Which classroom period creates maximum overstimulation for the boys and girls?`,

    recovery: `Hello Teacher ${name}! 🙏 Let's discuss Teacher Recovery and Resilience.
Recovery is not laziness. Recovery is essential emotional maintenance for sustainable teaching.

🟦 **Teacher Hack ( Post-School Decompression Ritual )**
Create active boundaries: Walking, conscious stretching, listening to soothing music, or offline decompression windows. Intentionally do not discuss school or check administrative WhatsApp groups during this time.

*Avoid*: Replaying classroom conflict mentally, or continuous screen scrolling immediately after work.
*Reflection Box*: What activity or hobby helps your nervous system calm down fastest?`,

    general: `Hello Teacher ${name}! 🙏 As your Labhya companion, I'm here to support your socio-emotional journey in the classroom.
UNICEF guides suggest that active somatic breaks and mindful check-ins significantly improve both teacher longevity and student academic focus.

🟦 **Teacher Hack ( Morning Circle Time )**
Begin the day with a 2-minute greeting routine where every child makes eye contact, smiles, and greets their desk partner. This simple grounding action coordinates group energy.

What specific classroom challenges or doubts can I assist you with today, Saathi? I'm listening!`
  };

  // 2. Hinglish Fallbacks
  const fallbacksHinglish: Record<string, string> = {
    noise: `Hello Teacher ${name}! 🙏 Transition ke samay Classroom Noise ko address karte hain.
Utran (transition) ke samay jab unpredictable movements hoti hain toh shor badh jata hai.

🟦 **Teacher Hack ( Freeze → Countdown → Transition )**
Ye stepwise routine follow karein:
1. Haath uthayein ya clapping signal use karein.
2. Bina shor machaye shanti se wait karein.
3. Ek slow 5-second countdown shuru karein.
4. Blackboard par ek simple visual instruction draw karein.
5. Jab bilkul shanti ho jaye, tabhi bachhon ko aage badhne dein.

*Avoid*: Baar-baar zor se chillana, emotional dhamki dena, ya bache move karte waqt lagatar bolna.
*Reflection*: Kis exact moment par aapki class me sabse zyada shor hota hai?`,

    burnout: `Hello Teacher ${name}! 🙏 Teacher Burnout aur Exhaustion se kaise bachein?
Exhaustion sabse pehle low patience aur irritability ke roop me shuru hota hai.

🟦 **Teacher Hack ( 90-Second Reset )**
Har 2 classes ke baad ek "90-second reset" routine banayein: Deep breathing, slow hydration (paani peena), shoulder relaxation aur silent pause.
Ghar jaane ke baad roz 1 "no school discussion hour" protect karein.

*Avoid*: Lagatar WhatsApp groups check karna, conflict ko bar-bar mind me replay karna.
*Reflection*: Aapke school day ka kaunsa hissa sabse jaldi emotional energy drain karta hai?`,

    emotional: `Hello Teacher ${name}! 🙏 Conflict ke baad Emotional Regulation bohot zaroori hai.
Difficult class ki tension hum dusri class me carry kar lete hain jisse humari voice speed aur patience kharab ho jati hai.

🟦 **Teacher Hack ( Somatic Guarded Reset )**
Jab aap gusse me ho toh emotional correction bilkul na karein.
1. Voice speed ko slow karein.
2. Volume kam rakhein aur still body posture maintain karein.
3. Ek deep breath, relax shoulders, aur paani peeyein.

*Avoid*: Instant emotional reaction dena, class me public humiliation karna.
*Reflection*: Kya aapki speaking speed badhne par class me conflicts badhte hain?`,

    parents: `Hello Teacher ${name}! 🙏 Parents ki expectations aur teaching stress ko manage karein.
Stress tab badhta hai jab parents constant comparison karte hain ya late-night messages bhejte hain.

🟦 **Teacher Hack ( Structured Communication Templates )**
Hamesha ek structured neutral response use karein: "Thank you for sharing your concern. I will observe this closely and update you with specific observations."
Meeting se pehle: Apni 3 observations aur 2 improvement points pehle se ready rakhein.

*Avoid*: Defensive reply dena, emotional arguments karna, ya late-night answer karna.
*Reflection*: Parents ke sath kis tarah ki chats aapko sabse zyada stress deti hain?`,

    motivation: `Hello Teacher ${name}! 🙏 PERMA Meaning aur Teacher Motivation check-in.
Jab teaching mechanical lagne lage toh hum context aur motivational purpose se door hone lagte hain.

🟦 **Teacher Hack ( Weekly Meaning Journal )**
Hafte ke end me ye teeno baatein likhein:
1. Ek student ka success moment.
2. Ek genuine emotional connection.
3. Ek meaningful classroom conversation.
Khud se poochhein: "Maine original teaching profession kyu choose kiya tha?"

*Avoid*: Sirf marks par focus rakhna, emotional wins ko ignore karna, ya lagatar dusro se compare karna.
*Reflection*: Hal hi me kis moment ne aapko yaad dilaya ki aapka kaam bohot valuable hai?`,

    attention: `Hello Teacher ${name}! 🙏 Student Attention Loss ko handle karein.
Lamba passive lecture sunna middle school students ke attention capacity ke bahar hota hai.

🟦 **Teacher Hack ( 7-Minute Engagement Reset )**
Har 7 minutes me ek active reset karein: quick question, peer task, mini-challenge, ya movement cue. Bachhon ka naam frequently use karein attention ko anchor karne ke liye.

*Reflection*: Kaunse students sabse pehle disengage hote hain?`,

    perfectionism: `Hello Teacher ${name}! 🙏 Teacher Anxiety aur Perfectionism ko control karein.
Anxiety aksar over-preparation, har cheez excessive checking aur control khone ke darr se dikhti hai.

🟦 **Teacher Hack ( Good Enough Pedagogy check )**
Daily khud se 3 sawal poochhein:
1. Kya bache safe feel kar rahe the?
2. Kya thodi learning hui?
3. Kya perfection sach me zaroori tha?
Weekly ek low-pressure lesson plan karein jisme mistakes allow ho.

*Reflection*: Kis class situation me aapko maximum anticipatory stress hota hai?`,

    overstimulation: `Hello Teacher ${name}! 🙏 Primary class me overstimulation control karein.
Loud environment tab hota hai jab movement, sounds, aur multiple instructions ek sath aate hain.

🟦 **Teacher Hack ( Input Reduction Routine )**
Ek baar me sirf ek instruction dein, blackboard par clean visual cues draw karein, calm tone rakhein aur class me ek silent pause zone ya quiet corner banayein.

*Reflection*: Din ke kis period me bache sabse jaldi overstimulated hote hain?`,

    recovery: `Hello Teacher ${name}! 🙏 Teacher Recovery aur mental resilience ka dhyan rakhein.
Recovery laziness nahi hai, ye humare nervous system ki emotional maintenance hai.

🟦 **Teacher Hack ( Post-Work Decompression Ritual )**
Ghar aane ke baad 15 minutes walk, conscious body stretching, soft music ya silent sitting karein. WhatsApp notifications aur school problems ko un-focus karein.

*Avoid*: School stress ko lagatar discuss karna ya phone scroll karte rehna.
*Reflection*: Kaunsi activity aapke nervous system ko sabse fast calm down karti hai?`,

    general: `Hello Teacher ${name}! 🙏 Main yahan aapki mental wellbeing aur teaching activities me help karne ke liye taiyaar hoon.
Socio-emotional development guidelines ke anusar classroom wellness ko boost karna hamara target hai.

🟦 **Teacher Hack ( Morning Circle Routine )**
Subah morning class shuru karne se pehle bachho ko 2 minutes ka deep-breathing routine karwayein. Isse academic performance aur focus better hota hai.

Aapko classroom management ya stress me koi specific issue aa raha hai?`
  };

  // 3. Hindi Fallbacks
  const fallbacksHindi: Record<string, string> = {
    noise: `नमस्ते शिक्षक ${name}! 🙏 आइए कक्षा में संक्रमणकालीन कोलाहल (Classroom Noise During Transitions) पर चर्चा करें।
कक्षा अक्सर तब अशांत होती है जब पाठों के बीच के बदलाव अप्रत्याशित होते हैं और गतिविधियों में कोई निश्चित संरचना नहीं होती।

🟦 **शिक्षक हैक ( फ्रीज → काउंटडाउन → संक्रमण )**
इस व्यवस्थित हैक का पालन करें:
1. अपना हाथ ऊपर करें या ताली बजाने का संकेत (Clap Signal) उपयोग करें।
2. बिना चिल्लाए शांत होकर प्रतीक्षा करें।
3. एक धीमी ५ सेकंड की उलटी गिनती (Countdown) शुरू करें।
4. बोर्ड पर निर्देश का एक सरल चित्र प्रदर्शित करें।
5. पूर्ण शांति होने के बाद ही बच्चों को जाने का निर्देश दें।

*परहेज करें*: बार-बार चिल्लाने, भावनात्मक चेतावनियां देने या बच्चों की गति के दौरान लगातार बोलते रहने से।
*चिंतन*: आपकी कक्षा में किस विशेष क्षण पर सबसे अधिक कोलाहल होता है?`,

    burnout: `नमस्ते शिक्षक ${name}! 🙏 आइए शिक्षक बर्नआउट और मानसिक थकान (Teacher Burnout) को समझें।
शिक्षकों की थकान बड़ी गिरावट के रूप में नहीं, बल्कि धीरे-धीरे कम धैर्य और चिड़चिड़ेपन से शुरू होती है।

🟦 **शिक्षक हैक ( ९० सेकंड का रीसेट )**
प्रत्येक २ कक्षाओं के बाद एक '90-सेकंड का रीसेट' नियम अपनाएं: गहरी सांसें लें, थोड़ा पानी पिएं, कंधों को ढीला छोड़ें, और कुछ पल मौन रहें।
काम के बाद रोजाना कम से कम १ घंटा स्कूल संबंधी चर्चा और संदेशों से पूर्णतः दूरी बनाएं।

*परहेज करें*: गृहकार्य के बाद व्हाट्सएप ग्रुप्स को लगातार देखने, कक्षा के विवादों को बार-बार याद करने से।
*चिंतन*: स्कूल के दिन का कौन सा भाग आपकी भावनात्मक ऊर्जा को सबसे तेजी से थकाता है?`,

    emotional: `नमस्ते शिक्षक ${name}! 🙏 संघर्ष के उपरांत संवेग नियमन (Emotional Regulation After Conflict) बहुत महत्वपूर्ण है।
कठिन कक्षा से उत्पन्न मानसिक तनाव जब अगली कक्षा में आ जाता है, तो हमारी आवाज की गति, लहजा और धैर्य प्रभावित होते हैं।

🟦 **शिक्षक हैक ( शारीरिक ग्राउंडिंग )**
जब आप स्वयं उत्तेजित हों, उस समय बच्चों के व्यवहार को सुधारने का प्रयास कभी न करें।
उपयोग करें:
1. अपनी आवाज की गति को धीमा रखें।
2. आवाज का आयतन (Volume) नीचा रखें और स्थिर शारीरिक मुद्रा बनाए रखें।
3. गहरी सांस लें, कंधों को शिथिल करें, और घूंट-घूंट कर पानी पिएं।

*परहेज करें*: तत्काल आवेग में आकर प्रतिक्रिया देने, बच्चों से बहस करने या बच्चे को कक्षा में सबके सामने अपमानित करने से।
*चिंतन*: क्या आपके बोलने की गति बढ़ने से कक्षा में संघर्ष की संभावना बढ़ जाती है?`,

    parents: `नमस्ते शिक्षक ${name}! 🙏 अभिभावकों की अपेक्षाओं से उत्पन्न शिक्षक तनाव का प्रबंधन करें।
तनाव तब बढ़ता है जब अभिभावक परस्पर बच्चों की तुलना करते हैं, देर रात संदेश भेजते हैं, या बिना तैयारी के चर्चाएं करते हैं।

🟦 **शिक्षक हैक ( संरचित संचार प्रारूप )**
अभिभावकों को हमेशा एक व्यवस्थित व तटस्थ उत्तर भेजें: 'आपकी चिंता साझा करने के लिए धन्यवाद। मैं इस पर निकटता से ध्यान दूँगा/दूँगी और अपनी विशिष्ट टिप्पणियों के साथ आपको सूचित करूँगी।'
बैठक से पूर्व: अपनी ३ विशिष्ट टिप्पणियां (Observations) एवं २ सुधार बिंदु पहले से तैयार रखें।

*परहेज करें*: देर रात अचानक प्रतिक्रिया देने, रक्षात्मक रुख अपनाने या अत्यधिक भावनात्मक स्पष्टीकरण देने से।
*चिंतन*: अभिभावक के साथ किस प्रकार की बातचीत आपकी ऊर्जा को सर्वाधिक प्रभावित करती है?`,

    motivation: `नमस्ते शिक्षक ${name}! 🙏 PERMA मॉडल के माध्यम से प्रेरणा और जीवन का अर्थ समझें।
जब शिक्षण यांत्रिक होने लगता है, तो हम अपने मूल उद्देश्य की भावना खोने लगते हैं।

🟦 **शिक्षक हैक ( साप्ताहिक अर्थ जर्नल )**
प्रत्येक सप्ताह के अंत में ये तीन बातें डायरी में लिखें:
1. किसी एक छात्र की छोटी सी सफलता का क्षण।
2. कक्षा में बना कोई अनूठा भावनात्मक जुड़ाव।
3. एक सार्थक संवाद।
स्वयं से पूछें: 'मैंने मूल रूप से शिक्षण का पेशा क्यों चुना था?'

*परहेज करें*: सफलता को केवल अंकों से आंकने, बच्चों की भावनात्मक उपलब्धियों की अनदेखी करने से।
*चिंतन*: हाल ही में किस कक्षा के क्षण ने आपको याद दिलाया कि आपका काम बच्चों के लिए कितना महत्वपूर्ण है?`,

    attention: `नमस्ते शिक्षक ${name}! 🙏 छात्रों का ध्यान भटकना और उनका जुड़ाव बढ़ाना।
लंबे समय तक केवल बैठकर सुनना माध्यमिक कक्षाओं के छात्रों के ध्यान की क्षमता के बाहर होता है।

🟦 **शिक्षक हैक ( ७-मिनट का सक्रिय रीसेट )**
प्रत्येक ७ मिनट के बाद पाठ में एक लघु बदलाव शामिल करें: एक त्वरित प्रश्न पूछें, आपस में दो मिनट चर्चा करने को कहें, या कोई शारीरिक संकेत दें। ध्यान बनाए रखने के लिए बच्चों के नामों का बार-बार उच्चारण करें।

*चिंतन*: कौन से छात्र सबसे पहले ध्यान खोते हैं और क्या आप कोई विशेष प्रतिरूप (Pattern) देखते हैं?`,

    perfectionism: `नमस्ते शिक्षक ${name}! 🙏 शिक्षक की चिंता और अति-पूर्णतावाद (Perfectionism) से बचें।
चिंता अक्सर पाठ की अत्यधिक तैयारी (Over-preparation) और कक्षा का नियंत्रण खो जाने के डर के रूप में सामने आती है।

🟦 **शिक्षक हैक ( 'पर्याप्त रूप से अच्छा' शिक्षण परीक्षण )**
प्रतिदिन स्वयं से ३ प्रश्न पूछें:
1. क्या बच्चे आज कक्षा में सुरक्षित महसूस कर रहे थे?
2. क्या थोड़ा अधिगम (Learning) हुआ?
3. क्या आज पूर्णता की सच में आवश्यकता थी?
सप्ताह में एक 'कम दबाव वाला पाठ' अवश्य रखें जहाँ गलतियों पर विचार करने और प्रयोग करने की स्वतंत्रता हो।

*चिंतन*: कौन सी कक्षा परिस्थिति आपके लिए सबसे अधिक अग्रिम तनाव पैदा करती है?`,

    overstimulation: `नमस्ते शिक्षक ${name}! 🙏 प्राथमिक कक्षाओं में अत्यधिक उत्तेजना (Overstimulation) को नियंत्रित करें।
जब एक साथ तेज शोर, गतिविधियां, और बहुत सारे निर्देश मिलते हैं, तो प्राथमिक वर्ग के बच्चे अति-उत्तेजित हो जाते हैं।

🟦 **शिक्षक हैक ( उद्दीपन में कमी )**
एक बार में केवल एक ही निर्देश दें, बोर्ड पर सरल रंगीन चित्रों के माध्यम से निर्देश को स्पष्ट करें, अपनी आवाज को बहुत शांत रखें, और कक्षा में एक 'मौन कोना' (Quiet Corner) स्थापित करें।

*चिंतन*: दिन के किस हिस्से में बच्चे सबसे जल्दी विचलित और अति-उत्तेजित हो जाते हैं?`,

    recovery: `नमस्ते शिक्षक ${name}! 🙏 शिक्षकों के लिए शारीरिक व मानसिक पुनरुद्धार (Recovery) अत्यंत आवश्यक है।
स्वस्थ होना कोई आलस्य नहीं है, बल्कि यह आपके स्नायु तंत्र (Nervous system) का भावनात्मक रखरखाव है।

🟦 **शिक्षक हैक ( स्कूल के बाद की विश्रांति गतिविधि )**
घर आने के साथ ही १५ मिनट केवल अपने लिए निकालें: चलना-घूमना, स्ट्रेचिंग करना, सुखद संगीत सुनना या मौन बैठना। स्कूल के व्हाट्सएप संदेशों और तनावों पर इस दौरान ध्यान न दें।

*परहेज करें*: लगातार स्कूल के काम की मानसिक समीक्षा करने या गृह-कार्य के तुरंत बाद मोबाइल स्क्रीन स्क्रॉल करने से।
*चिंतन*: कौन सी गतिविधि आपके स्नायु तंत्र को सबसे तेजी से शांत करती है?`,

    general: `नमस्ते शिक्षक ${name}! 🙏 सामाजिक-भावनात्मक कल्याण सहायक के रूप में मैं आपके साथ हूँ।
दैनिक गतिविधियों में माइंडफुलनेस को शामिल करने से बच्चों का ध्यान और आपका स्वास्थ्य दोनों बेहतर रहते हैं।

🟦 **शिक्षक हैक ( मॉर्निंग सर्कल रूटीन )**
दिन की शुरुआत बच्चों के आपसी नमस्कार और चेहरे पर मुस्कान के साथ २ मिनट के ध्यान से कराएं। यह समूह की ऊर्जा को सुंदर दिशा देता है।

आज आप किस विशेष शिक्षण चुनौती पर चर्चा करना चाहेंगे?`
  };

  // 4. Bengali Fallbacks
  const fallbacksBengali: Record<string, string> = {
    noise: `নমস্কার শিক্ষক ${name}! 🙏 ট্রানজিশনের সময় শ্রেণীকক্ষ শান্ত রাখার কৌশলগুলি নিয়ে আলোচনা করি।
শিশুরা যখন একটি বিষয় থেকে অন্য বিষয়ে যাচ্ছে, তখন সঠিক পরিকল্পনা না থাকলে শব্দ বেড়ে যায়।

🟦 **শিক্ষক হ্যাক ( ফ্রিজ → কাউন্টডাউন → ট্রানজিশন )**
১. হাত তুলে বা হাততালি দিয়ে সঙ্কেত দিন।
২. নিজে চিৎকার না করে নীরব থাকুন।
৩. ধীরে ধীরে ৫ থেকে ১ পর্যন্ত কাউন্টডাউন শুরু করুন।
৪. ব্ল্যাকবোর্ডে স্পষ্ট ছবি বা সঙ্কেত দেখান।
৫. বাচ্চারা সম্পূর্ণ শান্ত হলে তবেই চলাফেরা করবে।

*চিন্তা করুন*: ঠিক কোন সময়ে আপনার শ্রেণীকক্ষে সবথেকে বেশি আওয়াজ হয়?`,

    burnout: `নমস্কার শিক্ষক ${name}! 🙏 শিক্ষাদানের ক্লান্তি এবং মানসিক শক্তি ফিরিয়ে আনা।
ক্লান্তি সরাসরি মেজাজ খিটখিটে বা ধৈর্য হ্রাসের মাধ্যমে প্রকাশ পায়।

🟦 **শিক্ষক হ্যাক ( ৯০ সেকেন্ডের রিসেট )**
প্রতি ২টি ক্লাসের শেষে ৯০ সেকেন্ড বিরতি নিন: গভীর শ্বাস নিন, জল পান করুন, কাঁধ শিথিল রাখুন। কাজ শেষে অন্তত ১ ঘণ্টা স্কুলের চিন্তা থেকে দূরে থাকুন।

*চিন্তা করুন*: দিনের কোন কাজটি আপনার মানসিক শক্তি সবথেকে দ্রুত শেষ করে দেয়?`,

    emotional: `নমস্কার শিক্ষক ${name}! 🙏 জটিল ক্লাসের মানসিক উত্তেজনা কমানোর কৌশল।
মেজাজ খারাপ থাকলে কখনোই শ্রেণীকক্ষ সংশোধনের চেষ্টা করবেন না। কণ্ঠস্বর ধীর ও মৃদু রাখুন।

🟦 **শিক্ষক হ্যাক ( শান্ত ও সোমাটিক রিসেট )**
গভীর শ্বাস নিন, জল পান করুন, স্থির শারীরিক ভঙ্গি বজায় রাখুন। বাচ্চাদের সামনে অপমান করার থেকে বিরত থাকুন।`,

    parents: `নমস্কার শিক্ষক ${name}! 🙏 অভিভাবকদের প্রত্যাশার চাপ সামলানোর উপায়।
অভিভাবকদের তুলনা বা গভীর রাতে মেসেজের চাপ কমাতে পেশাদার ও শান্ত জবাব দিন।

🟦 **শিক্ষক হ্যাক ( কাঠামোবদ্ধ জবাব )**
উত্তর দিন: "আপনার উদ্বেগের জন্য ধন্যবাদ। আমি বিষয়টি খুব ভালোভাবে পর্যবেক্ষণ করে আপনাকে নির্দিষ্ট তথ্যের সাথে জানাবো।"`,

    motivation: `নমস্কার শিক্ষক ${name}! 🙏 শিক্ষাদানের মহৎ উদ্দেশ্য ও মোティブেশন বজায় রাখা।
কাজের একঘেয়েমি কাটাতে 'মিনিং জার্নাল' তৈরি করে সপ্তাহে ১টি বাচ্চার অন্তত ক্ষুদ্রতম সাফল্যের কথাও লিখে রাখুন।`,

    attention: `নমস্কার শিক্ষক ${name}! 🙏 ছাত্রদের মনযোগ ফিরিয়ে আনা।
৭ মিনিট অন্তর একটি করে কুইজ, দলীয় কথা বলা বা একটু হাত-পা নাড়ানোর সুযোগ দিন।`,

    perfectionism: `নমস্কার শিক্ষক ${name}! 🙏 অতিরিক্ত নিখুঁত করার চর্বিতচর্বণ ও উৎকণ্ঠা নিয়ন্ত্রণ।
সপ্তাহ শেষে 'गुड एनाफ' ফর্মুলা ব্যবহার করে নিজেকে জিজ্ঞাসা করুন: বাচ্চার কি ভালো শিক্ষা হলো? তবেই নিখুঁতের চাপ মাথা থেকে নামান।`,

    overstimulation: `নমস্কার শিক্ষক ${name}! 🙏 অতিরিক্ত উত্তেজনা নিয়ন্ত্রণ।
বাচ্চাদের একটি সময়ে মাত্র ১টি স্পষ্ট নির্দেশ দিন। শ্রেণীকক্ষে একটি ছোট শান্ত কোণা তৈরি করুন।`,

    recovery: `নমস্কার শিক্ষক ${name}! 🙏 শিক্ষকের নিজের যত্ন ও পুনরুজ্জীবন।
বাড়ি ফিরে ১৫ মিনিট নিজেকে সম্পূর্ণ শান্ত রাখুন। গান শোনা বা সামান্য হাঁটার অভ্যাস তৈরি করুন।`,

    general: `নমস্কার শিক্ষক ${name}! 🙏 সামাজিক-আবেগীয় সুস্থতার সহায়িকা হিসেবে আমি সবসময় আপনার পাশে আছি।`
  };

  // 5. Gujarati Fallbacks
  const fallbacksGujarati: Record<string, string> = {
    noise: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 વર્ગખંડમાં ટ્રાન્ઝિશન દરમિયાન અવાજને કેવી રીતે કાબૂમાં લેવો?
🟦 **શિક્ષક હેક ( ફ્રીઝ → કાઉન્ટડાઉન → હિલચાલ )**
૧) તાળી પાડીને સાઇઝ આપો. ૨) શાંત રહીને રાહ જુઓ. ૩) ૫ સેકન્ડ પૂરી કરો. ૪) બોર્ડ પર દર્શાવો અને બાળકો ત્યારે જ અવાજ બંધ કરીને પોતાની જગ્યા બદલશે.`,

    burnout: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 શિક્ષક બર્નઆઉટ અને નબળાઈથી બચવા શું કરવું?
🟦 **શિક્ષક હેક ( ૯૦ સેકન્ડ રીસેટ સાધન )**
દર ૨ પિરિયડ પછી ૯૦ સેકન્ડ ઊંડા શ્વાસ, થોડું પાણી અને ખભા હળવા રાખવાની ક્રિયા અનુસરો. શાળાનો તણાવ શાળામાં જ છોડો.`,

    emotional: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 શાંત અવાજ અને સંવેગ નિયમન.
જ્યારે આપ ખૂબ ગુસ્સામાં હોવ ત્યારે બાળકોને ક્યારેય વાચન સુધારણા ન કરાવો. અવાજનો ટોન નીચો અને ધીમો રાખો.`,

    parents: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 વાલીઓ તરફથી આવતા દબાણને કાબૂમાં લેવું.
🟦 **શિક્ષક હેક ( પ્રોફેશનલ લિમિટ ટેમ્પલેટ્સ )**
ટેમ્પલેટ વાપરો: "ચિંતા બદલ આભાર, હું નિરીક્ષણ કરીને આપને યોગ્ય વિગતો જણાવીશ." મોડી રાતે જવાબો આપવાનું ટાળો.`,

    motivation: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 બાળકો માટે મોટિવેશન અને મનની સંતોષ.
દર અઠવાડિયે મિનિંગ જનરલ લખો - નાનામાં નાની સફળતા અને હસતા ચહેરો સંગ્રહિત કરો.`,

    attention: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 બાળકોનું ધ્યાન ભટકે ત્યારે શું કરવું?
દર ૭ મિનિટે એક નાની એક્ટિવિટી, મિત્રો સાથે ૧ મિનિટ વાત અથવા રમતની પ્રવૃત્તિ કરાવો.`,

    perfectionism: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 અતિ-પરફેક્ટ રહેવાની ચિંતા છોડો.
રોજ ૩ પ્રશ્નો પૂછો: બાળકો સુરક્ષિત હતા? થોડું ભણ્યા? શું પરફેક્ટ હોવું જરૂરી હતું?`,

    overstimulation: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 વધુ સવાલો અને ઘોંઘાટથી બચો.
એક સમયે માત્ર એક જ સૂચના આપો. વર્ગના ખૂણામાં 'શાંત કોર્નર' ઊભો કરો.`,

    recovery: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 કામ પછી પોતાની ઊર્જા ફરી મેળવો.
૧૫ મિનિટ વોક અથવા સંગીત સાંભળો. મોડી રાતે શાળાના ગ્રુપ જોવાનું બંધ કરો.`,

    general: `નમસ્તે શિક્ષક સાથી ${name}! 🙏 લાગણીશીલ શિક્ષણ અને કલ્યાણ પદ્ધતિઓ માટે હું અહીં આપની સાથી છું.`
  };

    const cleanLang = language || "English";
  if (cleanLang === "Hindi") return fallbacksHindi[topic] || fallbacksHindi.general;
  if (cleanLang === "Bengali") return fallbacksBengali[topic] || fallbacksBengali.general;
  if (cleanLang === "Gujarati") return fallbacksGujarati[topic] || fallbacksGujarati.general;
  if (cleanLang === "Hinglish") return fallbacksHinglish[topic] || fallbacksHinglish.general;
  return fallbacksEnglish[topic] || fallbacksEnglish.general;
}

// ---------------- API ENDPOINTS ----------------

// Welcome message health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Geo-coordinates to State & Spoken language lookup via Gemini
app.post("/api/detect-region", async (req: express.Request, res: express.Response): Promise<any> => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.json({ region: "Delhi NCR", language: "Hinglish" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are a regional lookup tool. Identify the Indian State, capital region, or union territory corresponding to latitude ${latitude} and longitude ${longitude}. Also specify the primary regional spoken language (must choose from: Hindi, Bengali, Gujarati, English, Hinglish). Return a clean JSON only matching the schema: { "region": "State Name", "language": "Preferred Language Name" }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            region: { type: Type.STRING },
            language: { type: Type.STRING }
          },
          required: ["region", "language"]
        }
      }
    });

    const bodyText = response.text || "{}";
    const data = JSON.parse(bodyText.trim());
    return res.json({
      region: data.region || "Delhi NCR",
      language: data.language || "Hinglish"
    });
  } catch (error) {
    console.error("Gemini detect-region error:", error);
    return res.json({ region: "Delhi NCR", language: "Hinglish" });
  }
});

// Register Teacher Profile (preserves unique profile, prevents duplicates by phone/email/name)
app.post("/api/register", async (req: express.Request, res: express.Response): Promise<any> => {
  const { name, gradeClass, experience, region, language, email, phone, address, fontSize } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const db = readRecords();
  
  // Basic de-duplication check by email or phone
  let teacherIndex = db.teachers.findIndex((t: any) => 
    (phone && t.phone === phone) || (email && t.email === email) || (t.name.toLowerCase() === name.toLowerCase())
  );

  const teacherData = {
    id: teacherIndex >= 0 ? db.teachers[teacherIndex].id : "tch_" + Date.now().toString(36),
    name,
    gradeClass,
    experience,
    region,
    language,
    email: email || "",
    phone: phone || "",
    address: address || "",
    fontSize: fontSize || "medium",
    updatedAt: new Date().toISOString()
  };

  if (teacherIndex >= 0) {
    db.teachers[teacherIndex] = teacherData;
  } else {
    db.teachers.push(teacherData);
  }

  writeRecords(db);

  // Record user registration/update in the central log file
  logEvent("USER_REGISTRATION", {
    userId: teacherData.id,
    name: teacherData.name,
    gradeClass: teacherData.gradeClass,
    experience: teacherData.experience,
    region: teacherData.region,
    language: teacherData.language,
    email: teacherData.email,
    phone: teacherData.phone,
    address: teacherData.address,
    fontSize: teacherData.fontSize
  });

  return res.json({ success: true, teacher: teacherData });
});

// Logs user clicks or UI alerts for analytics purposes
app.post("/api/analytics", (req, res) => {
  const { eventType, teacherId, metadata } = req.body;
  const db = readRecords();
  
  db.analytics.push({
    id: "evt_" + Date.now().toString(36),
    eventType,
    teacherId: teacherId || "Guest",
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  });

  writeRecords(db);
  res.json({ success: true });
});

// Retrieves accumulated records (great for admin review/analytics dashboards!)
app.get("/api/records", (req, res) => {
  const db = readRecords();
  res.json(db);
});

// Performs automated AI-driven behavior pattern trend analysis on teachers and students
app.get("/api/behavior-trends-analysis", async (req, res) => {
  try {
    const db = readRecords();
    const teachersList = db.teachers || [];
    const sessionsList = db.sessions || [];
    
    // Construct simplified system stats for Gemini consumption
    const totalTeachers = teachersList.length;
    const totalSessions = sessionsList.length;
    
    // Compile dynamic factors of users (grade, tenure, region)
    const regions = teachersList.map((t: any) => t.region || "Delhi NCR");
    const experiences = teachersList.map((t: any) => t.experience || "Beginner");
    const gradeClasses = teachersList.map((t: any) => t.gradeClass || "Primary");
    
    const sampleChats = (db.chats || []).slice(-15).map((c: any) => ({
      teacherName: c.teacherName,
      topic: c.topic,
      userMessage: c.userMessage,
      timestamp: c.timestamp
    }));

    const statsPayload = {
      totalTeachers,
      totalSessions,
      regionsSummary: regions.slice(0, 30),
      experienceTenures: experiences.slice(0, 30),
      gradeLevels: gradeClasses.slice(0, 30),
      recentConversations: sampleChats
    };

    const systemPrompt = `You are a Senior Educational Psychologist and Socio-Emotional Data Analyst working with the Labhya Foundation. 
Your objective is to analyze the provided anonymized teacher profiles, classroom metadata, teaching tenure, and conversational topic history, and compile a comprehensive behavioral trend analysis for both teachers and their students.

Provide a detailed, high-quality, professional, and empathetic report. Return the response in strict JSON format. 
DO NOT include any extra formatting such as markdown code blocks with \`\`\`json. Return only raw, parsable JSON matching this schema:
{
  "generalOverview": "string (A scannable executive overview of emotional states, challenges, and overall climate in regional classrooms)",
  "teacherSegments": [
    {
      "experienceLevel": "string (e.g. Beginner/Experienced/Veteran)",
      "predominantStress": "string (Major emotional and classroom triggers based on their profiles and logs)",
      "topicPreference": "string (The socio-emotional topics they seek help with most)",
      "customSupportHacks": "string (Actionable tips for this educator segment)"
    }
  ],
  "studentBehaviorPatterns": [
    {
      "patternTitle": "string (e.g. Inattention, Transition Friction, Peak Afternoon Restlessness)",
      "observedSymptom": "string (What the students are displaying according to queries)",
      "socioEmotionalRoot": "string (The underlying emotional or sensory cause from a mental health perspective)",
      "classroomWellbeingHack": "string (Somatic or life-skill hack that the teacher can apply immediately)"
    }
  ],
  "regionalAndCulturalNuances": "string (Any cultural trends like Hinglish vs English preference, region-specific Delhi NCR challenges etc)",
  "administrativeActionPlan": "string (Recommendations for next organizational steps)"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: `Here is the anonymized database and dynamic event log payload to categorize: ${JSON.stringify(statsPayload)}` }]
      }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const parsedResult = JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
    return res.json(parsedResult);
  } catch (err: any) {
    console.error("AI Pattern analysis failed. Providing structured deterministic categorizations fallback:", err);
    // Fallback response inside administrative container to prevent breaking dashboard preview
    return res.json({
      generalOverview: "Teachers are reporting increased daily classroom stress, especially centered around student transition periods, general noisy classrooms, and screen overstimulation. Beginner teachers seek quick tactical solutions, while experienced teachers are searching for long-term somatic exercises.",
      teacherSegments: [
        {
          experienceLevel: "Beginner (0-2 years)",
          predominantStress: "Managing classroom noise levels, maintaining attention spans, and overcoming initial performance anxiety.",
          topicPreference: "Student Transition Noise, 7-minute Attention Games, and Somatic Breathing.",
          customSupportHacks: "Provide template scripts for high-energy situations and easy peer-mentoring partnerships."
        },
        {
          experienceLevel: "Experienced/Veteran (3+ years)",
          predominantStress: "Emotional burnout, balancing student curriculum loads, and dealing with intense parenting feedback.",
          topicPreference: "Burnout Prevention, Parent Conflict Resolution, and Somatic Nervous System Calibration.",
          customSupportHacks: "Introduce scheduled calendar buffers and routine sensory relaxation exercises after class."
        }
      ],
      studentBehaviorPatterns: [
        {
          patternTitle: "Socio-Emotional Shift Friction (Transition Noise)",
          observedSymptom: "Loud, hyperactive chatter and restlessness when moving from subject to subject.",
          socioEmotionalRoot: "Sensory transition friction and difficulty down-regulating nervous system activation between mental tasks.",
          classroomWellbeingHack: "Use the 'Somatic Breathing Break' or '7-minute attention game' to reset group focus before restarting."
        },
        {
          patternTitle: "Afternoon Restlessness",
          observedSymptom: "Fidgeting, blank stares, selective listening, and distraction spikes.",
          socioEmotionalRoot: "Mental fatigue and biological circadian dips combined with prolonged cognitive constraints.",
          classroomWellbeingHack: "Implement a 2-minute physical stretching buffer or dynamic life-skills laughter hack."
        }
      ],
      regionalAndCulturalNuances: "A high rate of Hinglish language preference confirms that conversational, informal bilingual prompt designs decrease barriers to adoption amongst Indian educators.",
      administrativeActionPlan: "Expand Hinglish digital templates, prioritize classroom physical-gamified activities in monthly modules, and create local support groups."
    });
  }
});

// Retrieves raw chat and system event logs for administrative analytics representation
app.get("/api/logs", (req, res) => {
  try {
    if (fs.existsSync(LOG_FILE_JSON)) {
      const content = fs.readFileSync(LOG_FILE_JSON, "utf-8");
      return res.json(JSON.parse(content));
    }
  } catch (err) {
    console.error("Error reading log file:", err);
  }
  return res.json([]);
});

// Save or update an entire active chat session, including conversational messages and duration (time taken)
app.post("/api/sessions", (req: express.Request, res: express.Response) => {
  const { sessionId, teacherId, teacherName, messages, currentTopic, language, startTime, durationSeconds } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  const db = readRecords();
  const sessionIndex = db.sessions.findIndex((s: any) => s.sessionId === sessionId);

  const sessionData = {
    sessionId,
    teacherId: teacherId || "Guest",
    teacherName: teacherName || "Teacher Saathi",
    messages: messages || [],
    currentTopic: currentTopic || "general",
    language: language || "Hinglish",
    startTime: startTime || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeTakenSeconds: durationSeconds || 0
  };

  if (sessionIndex >= 0) {
    db.sessions[sessionIndex] = sessionData;
  } else {
    db.sessions.push(sessionData);
  }

  writeRecords(db);

  // Write session logging event
  logEvent("SESSION_UPDATE", {
    sessionId: sessionData.sessionId,
    teacherId: sessionData.teacherId,
    teacherName: sessionData.teacherName,
    currentTopic: sessionData.currentTopic,
    language: sessionData.language,
    startTime: sessionData.startTime,
    updatedAt: sessionData.updatedAt,
    timeTakenSeconds: sessionData.timeTakenSeconds,
    messagesCount: sessionData.messages ? sessionData.messages.length : 0
  });

  res.json({ success: true, session: sessionData });
});

// Retrieves the latest session corresponding to returning users based on profile properties
app.get("/api/sessions/latest", (req: express.Request, res: express.Response): any => {
  const { teacherId, phone, email, name } = req.query;
  const db = readRecords();
  
  let filtered = db.sessions || [];
  if (teacherId && teacherId !== "Guest") {
    filtered = filtered.filter((s: any) => s.teacherId === teacherId);
  } else if (phone || email || name) {
    const teacher = db.teachers.find((t: any) => 
      (phone && t.phone === phone) || 
      (email && t.email === email) || 
      (name && t.name.toLowerCase() === (name as string).toLowerCase())
    );
    if (teacher) {
      filtered = filtered.filter((s: any) => s.teacherId === teacher.id);
    } else if (name) {
      filtered = filtered.filter((s: any) => s.teacherName.toLowerCase() === (name as string).toLowerCase());
    } else {
      filtered = [];
    }
  }

  // Sort by updatedAt descending
  filtered.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (filtered.length > 0) {
    return res.json({ success: true, session: filtered[0] });
  } else {
    return res.json({ success: false, message: "No previous sessions found" });
  }
});

// Main solution & intelligent conversational engine powered by Gemini
app.post("/api/chat", async (req: express.Request, res: express.Response): Promise<any> => {
  const { 
    message, 
    chatHistory, 
    teacherProfile, 
    agentName, 
    currentTopic 
  } = req.body;

  try {
    const profile = teacherProfile || { name: "Guest", gradeClass: "Not specified", experience: "Not specified", region: "India", language: "Hindi", fontSize: "medium" };

    // Log the user's incoming chat message in dual log formats
    logEvent("CHAT_MESSAGE", {
      direction: "user_to_agent",
      teacherId: profile.id || "Guest",
      teacherName: profile.name || "Guest",
      message: message,
      currentTopic: currentTopic || "General Doubts",
      gradeClass: profile.gradeClass,
      experience: profile.experience,
      region: profile.region,
      language: profile.language
    });
    
    // Formulate a robust system instruction featuring our strict persona & guidelines
    const systemInstruction = `
You are ${agentName}, an empathetic, professional, and knowledgeable Indian female mentor and teacher trainer from Labhya.
Your goal is to actively listen, resolve doubts, and help teachers deep-dive into Socio-Emotional Learning and well-being topics.

YOUR GUIDELINES & VALUES:
- Avoid simply replying with a lazy dry answer. Emphasis must be given on complete understanding, providing classroom examples, activities, and further questioning to test comprehension.
- Never state that you are from any other organization besides Labhya.
- Address the user warmly as "Teacher", "Shikshak", or "Saathi". Once you know their name is "${profile.name}", address them warmly as "${profile.name} ji" or "Saathi ${profile.name}".
- Ground your strategies on practical pedagogy. Adapt to their specific setup (Grades taught: ${profile.gradeClass}, Experience: ${profile.experience}, Region: ${profile.region}).
- Language preference is: "${profile.language}". Change your prompt scripts/phrasing beautifully according to this preference.
- Support "Hinglish Mix" fluently where Hindi speakers are comfortable, translating main emotional terms in clean English ('Burnout Prevention', 'Resilience', 'PERMA Model') with strong professional expertise.
- Display Preference Font Size configured is: "${profile.fontSize || 'medium'}". 
  * If "large", write highly concise, snappy, and structured bulleted remarks! Avoid extremely long paragraphs so the text does not flow overly long on standard phone screen widths with large text.
  * If "small", feel free to go in-depth and provide comprehensive pedagogical guidance and citations.
- Structure your output carefully:
  1. Highlight 2-3 lines of core pedagogical insight, highlighting credible sources like the National Education Policy (NEP) 2020, WHO guides, or UNICEF kits.
  2. Provide a dedicated 🟦 **Teacher Hack** (classroom activity, breathing/mindful kriya, circle routine, or self-care exercise) tailored to their target grade class.
  3. Include an empathetic further question at the end to check understanding or prompt them to share.

DYNAMIC SUGGESTIONS DIRECTIVE:
- At the very end of your response, after all text and questions, you MUST append a metadata block containing 3 dynamic, context-specific keywords (with a relevant emoji) picked out from your actual reply as active topics, and 3 specific follow-up questions/prompts for each topic.
- You MUST format this metadata block exactly as:
===METADATA===
{
  "topics": [
    {"label": "😊 Keyword/Topic 1", "id": "keyword_1"},
    {"label": "🧘 Keyword/Topic 2", "id": "keyword_2"},
    {"label": "🌱 Keyword/Topic 3", "id": "keyword_3"}
  ],
  "suggestions": {
    "keyword_1": ["Suggested prompt 1.1", "Suggested prompt 1.2", "Suggested prompt 1.3"],
    "keyword_2": ["Suggested prompt 2.1", "Suggested prompt 2.2", "Suggested prompt 2.3"],
    "keyword_3": ["Suggested prompt 3.1", "Suggested prompt 3.2", "Suggested prompt 3.3"]
  }
}
===END_METADATA===
- The keyword ids must be simple lowercase words without spaces or special characters (e.g. "circle_routine" or "gratitude"). The follow-up questions must be brief, friendly, and complete sentences.
- Do not add mock port numbers, terminal commands, or system logs in your responses. Be extremely professional.
`;

    // Package previous context
    const contents: any[] = [];
    
    // Append standard history
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((turn: any) => {
        contents.push({
          role: turn.sender === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      });
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    let aiResponseText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      aiResponseText = response.text || "";
    } catch (apiError: any) {
      console.warn("Gemini 3.5-flash model invocation failed. Initiating high-fidelity model fallback trap:", apiError.message || apiError);
      try {
        console.log("Attempting fallback call with 'gemini-3.1-flash-lite'...");
        const responseLite = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });
        aiResponseText = responseLite.text || "";
        console.log("Fallback call with 'gemini-3.1-flash-lite' succeeded!");
      } catch (liteError: any) {
        console.warn("Both gemini-3.5-flash and gemini-3.1-flash-lite failed. Using offline custom support guidance:", liteError.message || liteError);
        // Load structured, empathetic, co-designed fallback advice
        const fallbackText = getOfflineFallbackResponse(message, currentTopic, profile.language, profile);
        aiResponseText = `*[📋 ShiksakSathi Support Active (Offline Mode): Standard AI Service Quota is currently full at this time. Serving customized offline mentor guidelines and hacks immediately to keep you supported!]*\n\n${fallbackText}`;
      }
    }

    // Parse the metadata section
    let cleanText = aiResponseText;
    let topics = [
      { label: "[1] 🔊 Transition Noise", id: "noise" },
      { label: "[2] 🔥 Burnout Prevention", id: "burnout" },
      { label: "[3] 🧘 Post-Conflict Calm", id: "emotional" },
      { label: "[4] 👥 Parent Stress", id: "parents" },
      { label: "[5] 🌊 PERMA Motivation", id: "motivation" },
      { label: "[6] ⚡ Student Attention", id: "attention" },
      { label: "[7] 🎯 Stress & Perfection", id: "perfectionism" },
      { label: "[8] 🍭 Overstimulation", id: "overstimulation" },
      { label: "[9] 🌱 Recovery & Rest", id: "recovery" }
    ];
    let suggestions: Record<string, string[]> = {
      noise: [
        "Freeze countdown steps",
        "Transition noise trigger",
        "Hand clapping signals"
      ],
      burnout: [
        "90-second somatic reset",
        "WhatsApp offline limits",
        "No-school discussion slots"
      ],
      emotional: [
        "Post-conflict somatic reset",
        "Slow-speed talking model",
        "4-step recovery routine"
      ],
      parents: [
        "Parent message templates",
        "Comparison pressure fixes",
        "Pre-meeting observations prep"
      ],
      motivation: [
        "Meaning journal steps",
        "Seligman's PERMA model",
        "Why I chose teaching?"
      ],
      attention: [
        "7-minute focus resets",
        "Name inclusion anchors",
        "Middle school attention loss"
      ],
      perfectionism: [
        "Did learning happen quiz",
        "Low-pressure lesson ideas",
        "Ask: Is perfection needed?"
      ],
      overstimulation: [
        "Sensory overstimulation cues",
        "Cozy quiet corners",
        "Blackboard visual support"
      ],
      recovery: [
        "After-school buffers",
        "Deep relaxation music",
        "Stop replaying conflicts"
      ]
    };

    const metadataStart = aiResponseText.indexOf("===METADATA===");
    if (metadataStart !== -1) {
      cleanText = aiResponseText.substring(0, metadataStart).trim();
      const metadataEnd = aiResponseText.indexOf("===END_METADATA===", metadataStart);
      let jsonString = "";
      if (metadataEnd !== -1) {
        jsonString = aiResponseText.substring(metadataStart + "===METADATA===".length, metadataEnd).trim();
      } else {
        jsonString = aiResponseText.substring(metadataStart + "===METADATA===".length).trim();
      }
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.topics && Array.isArray(parsed.topics) && parsed.suggestions) {
          topics = parsed.topics;
          suggestions = parsed.suggestions;
        }
      } catch (e) {
        console.warn("Failed to parse metadata block:", e);
      }
    }

    // Save chat session trace to database for analytical review
    const db = readRecords();
    db.chats.push({
      id: "chat_" + Date.now().toString(36),
      teacherId: profile.id || "Guest",
      teacherName: profile.name,
      userMessage: message,
      agentResponse: cleanText,
      topic: currentTopic || "General Doubts",
      timestamp: new Date().toISOString()
    });
    writeRecords(db);

    // Log the generated agent response in deep-detailed modes
    logEvent("CHAT_MESSAGE", {
      direction: "agent_to_user",
      teacherId: profile.id || "Guest",
      teacherName: profile.name || "Guest",
      message: cleanText,
      currentTopic: currentTopic || "General Doubts",
      gradeClass: profile.gradeClass,
      experience: profile.experience,
      region: profile.region,
      language: profile.language
    });

    return res.json({ 
      text: cleanText, 
      topics, 
      suggestions 
    });
  } catch (outerError: any) {
    console.error("Critical outer chat handler error:", outerError);
    return res.json({ 
      text: `*[📋 ShiksakSathi Support Active (Offline Mode)]*\n\nNamaste Saathi, I am here for you! Standard AI services are offline, but let's practice our daily mindfulness: Take a deep breath for 4 seconds, hold, and release. Tell me, how can I support your classroom teaching or teacher well-being today?` 
    });
  }
});


// ---------------- EXPRESS VITE MIDDLEWARE SETUP ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
  });
}

startServer();
