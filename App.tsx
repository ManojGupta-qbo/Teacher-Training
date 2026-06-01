import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  User, 
  BookOpen, 
  Award, 
  Globe, 
  MapPin, 
  Settings, 
  Send, 
  Phone, 
  Mail, 
  X, 
  ChevronRight, 
  Check, 
  AlertCircle, 
  Loader2, 
  Activity, 
  Sparkles, 
  ShieldAlert, 
  Clock, 
  LogOut, 
  Plus, 
  BarChart2, 
  HeartHandshake,
  Volume2,
  VolumeX,
  Download,
  Search,
  MessageSquare
} from "lucide-react";
import { WELLBEING_TOPICS, TRANSLATIONS } from "./knowledgeBase";
import { TeacherProfile, ChatMessage, AdminRecord } from "./types";
import { generateWellBeingPDF } from "./pdfGenerator";
import { AdminAnalytics } from "./components/AdminAnalytics";

// Random pool of regional Indian female names
const FEMALE_MENTORS = [
  { name: "Katha", background: "10+ years as a Rural Child Well-Being Specialist" },
  { name: "Alpa", background: "Senior Socio-Emotional Facilitator & Teacher Trainer" },
  { name: "Indu", background: "Expert Child Psychologist & Mindful Pedagogy Mentor" },
  { name: "Kala", background: "Pioneer in Classroom Happiness & Life Skills Curriculum" },
  { name: "Gauri", background: "Teacher Wellbeing Counselor & NEP-2020 Educator" },
  { name: "Jyoti", background: "Mindfulness and Somatic Emotional Regulation Advocate" },
  { name: "Deepa", background: "Primary School Socio-Emotional Integration Expert" }
];

// Dynamic continuation buttons mapping matching the active discussion focus topic
const DYNAMIC_SUGGESTIONS: Record<string, string[]> = {
  noise: [
    "Freeze countdown steps",
    "Transition noise trigger",
    "Hand clapping signals",
    "Visual instructions ideas",
    "Manage movement noise",
    "Structured transition plan"
  ],
  burnout: [
    "90-second somatic reset",
    "WhatsApp offline limits",
    "No-school discussion slots",
    "Emotional exhaustion cues",
    "Prevent workload fatigue",
    "Protect mental recovery"
  ],
  emotional: [
    "Post-conflict somatic reset",
    "Slow-speed talking model",
    "4-step recovery routine",
    "Neutralizing voice volume",
    "Avoid public humiliation",
    "Emotional co-regulation"
  ],
  parents: [
    "Parent message templates",
    "Comparison pressure fixes",
    "Pre-meeting observations prep",
    "Late-night boundary rules",
    "Avoid defensive replies",
    "Managing constant judgment"
  ],
  motivation: [
    "Meaning journal steps",
    "Seligman's PERMA model",
    "Why I chose teaching?",
    "Celebrate non-academic wins",
    "Classroom flow spots",
    "Fostering child contribution"
  ],
  attention: [
    "7-minute focus resets",
    "Name inclusion anchors",
    "Middle school attention loss",
    "Tactile learning intervals",
    "Avoid passive lectures",
    "Cooperative mini-challenges"
  ],
  perfectionism: [
    "Did learning happen quiz",
    "Low-pressure lesson ideas",
    "Ask: Is perfection needed?",
    "Avoid over-preparation",
    "Delegating monitoring roles",
    "Accepting minor mistakes"
  ],
  overstimulation: [
    "Sensory overstimulation cues",
    "Cozy quiet corners",
    "Blackboard visual support",
    "Deliver one instruction",
    "Calm-tone transition guide",
    "Restlessness de-escalation"
  ],
  recovery: [
    "After-school buffers",
    "Deep relaxation music",
    "Stop replaying conflicts",
    "Limit scroll stress",
    "Post-work physical stretch",
    "Nervous system calibration"
  ],
  general: [
    "Manage transition noise",
    "Somatic breathing break",
    "Handle chatty students",
    "Socio-emotional check-in",
    "Good enough teaching check",
    "7-minute attention game"
  ]
};

// Safe LocalStorage wrapper to prevent crash inside iOS Safari / sandbox iframes
const memoryStorage: Record<string, string> = {};
const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      memoryStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete memoryStorage[key];
    }
  }
};

export default function App() {
  // State variables
  const [mentor, setMentor] = useState(() => {
    const saved = safeStorage.getItem("labhya_mentor");
    if (saved) return JSON.parse(saved);
    const random = FEMALE_MENTORS[Math.floor(Math.random() * FEMALE_MENTORS.length)];
    safeStorage.setItem("labhya_mentor", JSON.stringify(random));
    return random;
  });

  const [language, setLanguage] = useState<string>("Hinglish");
  const [detectedLanguage, setDetectedLanguage] = useState<string>("Hinglish");
  const [detectedRegion, setDetectedRegion] = useState<string>("Delhi NCR");
  const [geolocationState, setGeolocationState] = useState<"idle" | "loading" | "detected" | "error">("detected");
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return safeStorage.getItem("labhya_onboarded") === "true";
  });

  // Profile fields
  const [profile, setProfile] = useState<Required<TeacherProfile>>(() => {
    const saved = safeStorage.getItem("labhya_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.fontSize) parsed.fontSize = "medium";
      return parsed;
    }
    return {
      name: "",
      gradeClass: "",
      experience: "Beginner (0-2 years)",
      region: "Delhi NCR",
      language: "Hinglish",
      email: "",
      phone: "",
      address: "",
      fontSize: "medium"
    };
  });

  // Adaptive Font Size State for Chat interface (3-step selector: small, medium, large)
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(() => {
    const saved = safeStorage.getItem("labhya_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.fontSize || "medium";
      } catch (_) {}
    }
    return "medium";
  });

  // Chat conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [currentTopic, setCurrentTopic] = useState<string>("general");
  const [chatTopics, setChatTopics] = useState<{ label: string; id: string }[]>([
    { label: "[1] 🔊 Transition Noise", id: "noise" },
    { label: "[2] 🔥 Burnout Prevention", id: "burnout" },
    { label: "[3] 🧘 Post-Conflict Calm", id: "emotional" },
    { label: "[4] 👥 Parent Stress", id: "parents" },
    { label: "[5] 🌊 PERMA Motivation", id: "motivation" },
    { label: "[6] ⚡ Student Attention", id: "attention" },
    { label: "[7] 🎯 Stress & Perfection", id: "perfectionism" },
    { label: "[8] 🍭 Overstimulation", id: "overstimulation" },
    { label: "[9] 🌱 Recovery & Rest", id: "recovery" }
  ]);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<Record<string, string[]>>(DYNAMIC_SUGGESTIONS);
  const [selectedMultiTopics, setSelectedMultiTopics] = useState<string[]>([]);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [selectedHacks, setSelectedHacks] = useState<string[]>(["noise", "burnout", "emotional", "parents", "motivation", "attention", "perfectionism", "overstimulation", "recovery"]);

  // 3-5-10 Idle rule system timers (in seconds)
  const [idleTime, setIdleTime] = useState<number>(0);
  const [sessionDuration, setSessionDuration] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem("labhya_chat_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.durationSeconds || 0;
      }
    } catch (_) {}
    return 0;
  });
  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      const saved = safeStorage.getItem("labhya_session_id");
      if (saved) return saved;
    } catch (_) {}
    const newId = "sess_" + Date.now().toString(36);
    safeStorage.setItem("labhya_session_id", newId);
    return newId;
  });
  const [hasSavedSession, setHasSavedSession] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem("labhya_chat_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.messages) && parsed.messages.length > 0;
      }
    } catch (_) {}
    return false;
  });
  const [showNudge, setShowNudge] = useState<boolean>(false);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [chatEnded, setChatEnded] = useState<boolean>(false);
  const [fastForwardTimer, setFastForwardTimer] = useState<boolean>(false);

  // Admin and analytics view
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [adminRecords, setAdminRecords] = useState<AdminRecord | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(false);

  // Controls lookup check / auto continuation of past session logs from server file
  const [continuePreviousChat, setContinuePreviousChat] = useState<boolean>(true);

  // Database search records loaded on mount / onboarding
  const [allRecords, setAllRecords] = useState<AdminRecord | null>(null);

  // Automatic user email collection from active workspace context/URL params
  useEffect(() => {
    if (!profile.email) {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get("email") || params.get("user") || params.get("userEmail") || params.get("authEmail") || params.get("account");
      const defaultEmail = urlEmail || "mg110057@gmail.com"; // smart auto-collect fallback
      if (defaultEmail) {
        setProfile((prev) => {
          const updated = { ...prev, email: defaultEmail };
          safeStorage.setItem("labhya_profile", JSON.stringify(updated));
          return updated;
        });
        console.log("Automatically captured and registered user session email:", defaultEmail);
      }
    }
  }, []);

  // Fetch /api/records to access backend_google_file.json during onboarding details input
  useEffect(() => {
    if (!continuePreviousChat) return; // Do not access backend data file when toggle is off!
    fetch("/api/records")
      .then(res => res.json())
      .then(data => {
        setAllRecords(data);
      })
      .catch(err => {
        console.warn("Failed to retrieve user lookup database:", err);
      });
  }, [isOnboarded, continuePreviousChat]);

  // Compute live match from backend database as user types their name
  const matchedTeacher = useMemo(() => {
    if (!continuePreviousChat) return null; // skip if toggle is off
    if (!profile.name.trim() || !allRecords?.teachers) return null;
    return allRecords.teachers.find(
      (t: any) => t.name.trim().toLowerCase() === profile.name.trim().toLowerCase()
    );
  }, [profile.name, allRecords, continuePreviousChat]);

  const matchedSession = useMemo(() => {
    if (!continuePreviousChat) return null; // skip if toggle is off
    if (!matchedTeacher || !allRecords?.sessions) return null;
    return allRecords.sessions.find(
      (s: any) =>
        s.teacherId === matchedTeacher.id ||
        s.teacherName.trim().toLowerCase() === matchedTeacher.name.trim().toLowerCase()
    );
  }, [matchedTeacher, allRecords, continuePreviousChat]);

  // Simplified Onboarding & Header Search States
  const [onboardingView, setOnboardingView] = useState<"options" | "details">("options");
  const [searchExpanded, setSearchExpanded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasSavedProfile, setHasSavedProfile] = useState<boolean>(() => {
    try {
      return !!safeStorage.getItem("labhya_profile");
    } catch (_) {
      return false;
    }
  });

  const listEndRef = useRef<HTMLDivElement>(null);
  const idleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS["English"];

  // Synchronized default location (Delhi NCR & Hinglish) on mount
  useEffect(() => {
    if (!isOnboarded) {
      // Skipped active geolocation detection by user request
      setGeolocationState("detected");
      setDetectedRegion("Delhi NCR");
      setDetectedLanguage("Hinglish");
    }
  }, [isOnboarded]);

  // Handle auto scroll
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiLoading]);

  // Monitor Idle Time with 3-5-10 Rule
  useEffect(() => {
    if (isOnboarded && !chatEnded && !showAdminPanel) {
      idleIntervalRef.current = setInterval(() => {
        setIdleTime(prev => {
          const nextVal = prev + (fastForwardTimer ? 30 : 1); // Accelerator toggle for testing
          
          // 3 min nudge = 180s
          if (nextVal >= 180 && nextVal < 300) {
            setShowNudge(true);
            setShowWarning(false);
          }
          // 5 min warning = 300s
          else if (nextVal >= 300 && nextVal < 600) {
            setShowNudge(false);
            setShowWarning(true);
          }
          // 10 min timeout = 600s
          else if (nextVal >= 600) {
            clearInterval(idleIntervalRef.current!);
            handleTimeoutEndChat();
          }
          return nextVal;
        });
      }, 1000);
    }

    return () => {
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    };
  }, [isOnboarded, chatEnded, showAdminPanel, fastForwardTimer]);

  // Resets local idle timer on user inputs (typing, clicking)
  const resetIdleTimer = () => {
    setIdleTime(0);
    setShowNudge(false);
    setShowWarning(false);
  };

  // Synchronise active chat session, conversational logs and time duration to background file database
  const syncSessionToBackend = (currentMsgs = messages, durationSec = sessionDuration) => {
    if (!profile.name) return; // avoid syncing empty profiles

    const sId = safeStorage.getItem("labhya_session_id") || sessionId;
    const startTimeStamp = safeStorage.getItem("labhya_session_start_time") || new Date().toISOString();
    if (!safeStorage.getItem("labhya_session_start_time")) {
      safeStorage.setItem("labhya_session_start_time", startTimeStamp);
    }

    const body = {
      sessionId: sId,
      teacherId: profile.phone || profile.email || profile.name || "Guest",
      teacherName: profile.name,
      messages: currentMsgs.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
        topic: m.topic || "general"
      })),
      currentTopic,
      language,
      startTime: startTimeStamp,
      durationSeconds: durationSec
    };

    // Save locally
    safeStorage.setItem("labhya_chat_session", JSON.stringify(body));
    setHasSavedSession(true);

    // Async background sync to the server's backend_google_file.json
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          console.warn("Server sessions synchronized with a warning:", data);
        }
      })
      .catch(err => {
        console.warn("Server sessions background sync error:", err);
      });
  };

  // Increment active session duration (time taken) in the background every second
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isOnboarded && !chatEnded && !showAdminPanel) {
      interval = setInterval(() => {
        setSessionDuration(prev => {
          const nextVal = prev + 1;
          return nextVal;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnboarded, chatEnded, showAdminPanel]);

  // Periodically synchronise the active session to the backend database every 15 seconds
  useEffect(() => {
    let syncInterval: NodeJS.Timeout | null = null;
    if (isOnboarded && !chatEnded) {
      syncInterval = setInterval(() => {
        syncSessionToBackend(messages, sessionDuration);
      }, 15000);
    }
    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [isOnboarded, chatEnded, messages, sessionDuration, currentTopic, language]);

  // Sync session log immediately when messages length increases
  useEffect(() => {
    if (isOnboarded && messages.length > 0) {
      syncSessionToBackend(messages, sessionDuration);
    }
  }, [messages.length, isOnboarded]);

  // Restore the pre-saved user session and display details instantly
  const handleContinuePreviousSession = () => {
    try {
      const saved = safeStorage.getItem("labhya_chat_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.messages && parsed.messages.length > 0) {
          // Restore messages and options
          setMessages(parsed.messages);
          if (parsed.currentTopic) setCurrentTopic(parsed.currentTopic);
          if (parsed.language) setLanguage(parsed.language);
          if (parsed.durationSeconds) setSessionDuration(parsed.durationSeconds);
          if (parsed.sessionId) setSessionId(parsed.sessionId);
          
          // Clear onboarding states
          setIsOnboarded(true);
          resetIdleTimer();
          
          // Fetch exact latest profile if stored
          const savedProfile = safeStorage.getItem("labhya_profile");
          if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
          }

          logAnalytics("RESTORED_PREVIOUS_SESSION", { sessionId: parsed.sessionId, messagesCount: parsed.messages.length });
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to restore previous session from storage:", e);
    }
    
    // Fallback if local storage was empty
    setOnboardingView("details");
  };

  // Keyboard shortcut listener to toggle topics 1, 2, 3, and 4 when input fields are not active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if the user is currently typing in an input or textarea
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === "1") {
        e.preventDefault();
        logAnalytics("SINGLE_TOPIC_BUTTON_CLICK_SHORTCUT", { topic: "happiness" });
        setCurrentTopic("happiness");
        sendChatMessage("1", "happiness");
        resetIdleTimer();
      } else if (e.key === "2") {
        e.preventDefault();
        logAnalytics("SINGLE_TOPIC_BUTTON_CLICK_SHORTCUT", { topic: "perma" });
        setCurrentTopic("perma");
        sendChatMessage("2", "perma");
        resetIdleTimer();
      } else if (e.key === "3") {
        e.preventDefault();
        logAnalytics("SINGLE_TOPIC_BUTTON_CLICK_SHORTCUT", { topic: "burnout" });
        setCurrentTopic("burnout");
        sendChatMessage("3", "burnout");
        resetIdleTimer();
      } else if (e.key === "4") {
        e.preventDefault();
        logAnalytics("SINGLE_TOPIC_BUTTON_CLICK_SHORTCUT", { topic: "emotional" });
        setCurrentTopic("emotional");
        sendChatMessage("4", "emotional");
        resetIdleTimer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentTopic, messages, profile]);

  // Device Location Geo-lookup
  const detectDeviceLocation = () => {
    setGeolocationState("loading");
    
    // Explicit safety timeout (some devices hang on navigator.geolocation.getCurrentPosition)
    const safetyTimeout = setTimeout(() => {
      console.warn("Geolocation detection timed out. Safe fallback activated.");
      setGeolocationState("error");
      setProfile(p => ({ ...p, region: "Delhi NCR", language: "Hinglish" }));
      setLanguage("Hinglish");
    }, 4000);

    try {
      if (typeof window === "undefined" || !navigator || !navigator.geolocation) {
        clearTimeout(safetyTimeout);
        setGeolocationState("error");
        setProfile(p => ({ ...p, region: "Delhi NCR", language: "Hinglish" }));
        setLanguage("Hinglish");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          clearTimeout(safetyTimeout);
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch("/api/detect-region", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude, longitude })
            });
            const data = await res.json();
            setDetectedRegion(data.region || "Delhi NCR");
            setDetectedLanguage(data.language || "Hinglish");
            setGeolocationState("detected");
            
            // Pre-populate language settings
            const matchedLang = ["English", "Hindi", "Bengali", "Gujarati", "Hinglish"].includes(data.language) 
              ? data.language 
              : "Hinglish";
            setLanguage(matchedLang);
            setProfile(p => ({ 
              ...p, 
              region: data.region || "Delhi NCR", 
              language: matchedLang 
            }));
          } catch (e) {
            setGeolocationState("error");
            setProfile(p => ({ ...p, region: "Delhi NCR", language: "Hinglish" }));
            setLanguage("Hinglish");
          }
        },
        (err) => {
          clearTimeout(safetyTimeout);
          setGeolocationState("error");
          setProfile(p => ({ ...p, region: "Delhi NCR", language: "Hinglish" }));
          setLanguage("Hinglish");
        },
        { timeout: 3000, enableHighAccuracy: false }
      );
    } catch (err) {
      clearTimeout(safetyTimeout);
      setGeolocationState("error");
      setProfile(p => ({ ...p, region: "Delhi NCR", language: "Hinglish" }));
      setLanguage("Hinglish");
    }
  };

  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);

  // Read message or prompt text aloud using browser SpeechSynthesis (Indian female voice with slower pacing)
  const speakText = (text: string, msgId: string, langToUse?: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("TTS is not supported in this environment / browser.");
      return;
    }

    try {
      if (activeSpeechId === msgId) {
        window.speechSynthesis.cancel();
        setActiveSpeechId(null);
        return;
      }

      // Stop preceding utterances
      window.speechSynthesis.cancel();

      // Clean text: strip markdown characters, brackets, emojis, and weird symbols for high-quality normal speed audio pronunciation
      const cleanText = text
        // Strip typical Markdown symbols
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/#/g, "")
        .replace(/•/g, "")
        // Strip System Bracket indicators like "[📋 ShiksakSathi Support Active (Offline Mode)]" so they are not spoken
        .replace(/\[📋[^\]]*\]/g, "")
        .replace(/\[[^\]]*\]/g, "")
        // Strip target range of emojis and symbols
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{2190}-\u{21FF}]/gu, "")
        // Clear remaining explicit symbols used across ShiksakSathi
        .replace(/[😊🌊🔥🧘⚡🌅📅📚💪🛡️⭐★☆●📋🟦🎨🌸🙏💻📞🗺️⚠️❓❌📣🤝🏢🏫👤✍️📝🔗💡🔊🔇🎙️🎥📻⏰⏳🔔💬]/gu, "")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const currentLang = langToUse || language;
      
      // Choose voice language tag: preference is Indian dialects or Indian English (en-IN)
      if (currentLang === "Hindi" || currentLang === "Hinglish") {
        utterance.lang = "hi-IN";
      } else if (currentLang === "Bengali") {
        utterance.lang = "bn-IN";
      } else if (currentLang === "Gujarati") {
        utterance.lang = "gu-IN";
      } else {
        utterance.lang = "en-IN"; // Prefer Indian English accent over US
      }

      // Attempt to retrieve a high-quality female voice matching the target dialect
      const voices = window.speechSynthesis.getVoices();
      let femaleVoice = voices.find(v => v.lang.startsWith(utterance.lang) && (
        v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("veena") ||
        v.name.toLowerCase().includes("sangeetha") ||
        v.name.toLowerCase().includes("zira") ||
        v.name.toLowerCase().includes("kalpana") ||
        v.name.toLowerCase().includes("swara") ||
        v.name.toLowerCase().includes("pallavi") ||
        v.name.toLowerCase().includes("heera") ||
        v.name.toLowerCase().includes("neerja") ||
        v.name.toLowerCase().includes("shreya")
      ));

      // Fallback if specific female voice is not matched
      if (!femaleVoice) {
        femaleVoice = voices.find(v => v.lang.startsWith(utterance.lang));
      }
      // If and only if that language has no matching speech engine, fall back to Indian English female
      if (!femaleVoice && utterance.lang !== "en-IN") {
        femaleVoice = voices.find(v => v.lang.startsWith("en-IN") && (
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("veena") ||
          v.name.toLowerCase().includes("sangeetha")
        ));
      }
      // Global generic english female voice
      if (!femaleVoice) {
        femaleVoice = voices.find(v => v.lang.startsWith("en-US") && v.name.toLowerCase().includes("female"));
      }

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Normal natural speed and pitch for conversational ease
      utterance.rate = 0.95; 
      utterance.pitch = 1.0; 

      utterance.onend = () => {
        setActiveSpeechId(null);
      };
      utterance.onerror = () => {
        setActiveSpeechId(null);
      };

      setActiveSpeechId(msgId);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis error caught gracefully:", e);
      setActiveSpeechId(null);
    }
  };

  // Setup quick 1-tap start as guest to bypass any forms
  const handleQuickStart = () => {
    const quickProfile = {
      name: "Teacher Saathi",
      gradeClass: "Primary (Grades 1-5)",
      experience: "Intermediate (3-5 years)",
      region: "Delhi NCR",
      language: "Hinglish",
      email: "",
      phone: "",
      address: ""
    };

    // Fast-track state updates instantly so user transitions with 0ms delay
    safeStorage.setItem("labhya_profile", JSON.stringify(quickProfile));
    setProfile(quickProfile);
    setLanguage("Hinglish");
    safeStorage.setItem("labhya_onboarded", "true");
    safeStorage.setItem("labhya_session_id", sessionId);
    safeStorage.setItem("labhya_session_start_time", new Date().toISOString());
    setSessionDuration(0);
    setIsOnboarded(true);
    resetIdleTimer();

    // Fire network registration asynchronously to avoid blocking the main UI thread
    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quickProfile)
    })
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.teacher) {
          safeStorage.setItem("labhya_profile", JSON.stringify(data.teacher));
          setProfile(data.teacher);
        }
      })
      .catch((err) => {
        console.warn("Silent background registration tip:", err);
      });

    logAnalytics("ONBOARDING_COMPLETED", { name: "Teacher Saathi", region: "Delhi NCR", language: "Hinglish" });

    const localizedHello = `Hello Teacher Saathi! 🙏\n\n` +
      `Main ${mentor.name} hoon, Labhya ki tarf se aapki professional well-being mentor. Sabse pehle, aapke daily dedication aur hard work ke liye deep gratitude. Aapka wellbeing hi aapke class aur bacho ki happiness ki sacchi foundation hai.\n\n` +
      `Mera background hai: "${mentor.background}". Yeh aapsi discussion ka ek safe container jahan hum teaching stress ko handle karne aur dynamic classroom strategies ke baare me discuss karenge.\n\n` +
      `**Hum in custom areas par focus kar sakte hain:**\n` +
      `• **Happiness Rules:** Class me quick interactive social emotional activities.\n` +
      `• **Seligman's PERMA Framework:** Positive emotions, relationship bonds aur engagement boost karne ke simple tarike.\n` +
      `• **Burnout Prevention:** Workload stress decrease karne aur teacher boundary balance rakhne wale practices.\n` +
      `• **Somatic Emotional Regulation:** Breathing drills, mindfulness check-ins aur classroom control ideas.`;

    const appIntroSection = `\n\n**About ShiksakSathi (शिक्षक साथी):**\n` +
      `ShiksakSathi (शिक्षक साथी) primary classrooms aur educators ke liye ek AI-powered companion hai. Humara manna hai ki teacher ki well-being hi happy classrooms ki asli foundation hai. Yeh companion aapko instant classroom hacks, activities, administrative burnout control methods aur structured breathing exercises practice karne me maddat karega. Aaiye sath milkar ek joyful learning ecosystem banayein!\n`;

    const localizeBody = `Aap niche diye gaye dynamic inquiry buttons ko click kar sakte hain, direct text input me apni classroom situation type kar sakte hain, ya specific focus topics toggle kar sakte hain. Shuru karein, Saathi?`;

    const initialBotMessage: ChatMessage = {
      id: "init_bot",
      sender: "bot",
      text: `${localizedHello}${appIntroSection}\n\n${localizeBody}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      topic: "General Doubts"
    };

    setMessages([initialBotMessage]);
  };

  // Setup initial message when onboarding finishes
  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim()) return;

    // Fast-track state updates instantly so user transitions with 0ms delay
    safeStorage.setItem("labhya_onboarded", "true");
    safeStorage.setItem("labhya_profile", JSON.stringify(profile));
    safeStorage.setItem("labhya_session_id", sessionId);
    safeStorage.setItem("labhya_session_start_time", new Date().toISOString());
    setSessionDuration(0);
    setIsOnboarded(true);
    resetIdleTimer();

    // Fire network registration asynchronously to avoid blocking the main UI thread
    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    })
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.teacher) {
          safeStorage.setItem("labhya_profile", JSON.stringify(data.teacher));
          setProfile(data.teacher);
        }
      })
      .catch((err) => {
        console.warn("Silent background registration tip:", err);
      });

    // Trigger analytical event click
    logAnalytics("ONBOARDING_COMPLETED", { name: profile.name, region: profile.region, language });

    // Bootstrap first conversation turn with beautiful personalized female mentorship greetings
    const localizedHello = 
      language === "Hindi" ? `नमस्ते ${profile.name} जी! 🙏\n\n` +
      `मैं ${mentor.name} हूँ, आपकी लभ्य की ओर से विशेष वेल्बीइंग मेंटर। सबसे पहले, बच्चों के जीवन को संवारने के लिए आपके द्वारा किए जाने वाले अथक और कठिन परिश्रम के लिए मैं आपको धन्यवाद देना चाहती हूँ। आपकी अपनी ऊर्जा और खुशहाली ही एक खुशहाल कक्षा की नींव है।\n\n` +
      `मेरा अनुभव "${mentor.background}" में है। यहां हमारा एक सुरक्षित स्थान है जहां हम बिना किसी हिचकिचाहट के आपकी मानसिक ऊर्जा को पुनर्जीवित करने और आपकी कक्षा को और अधिक खुशहाल बनाने के तरीकों पर बात कर सकते हैं।\n\n` +
      `**आज हम इन महत्वपूर्ण पहलुओं पर साथ मिलकर कार्य कर सकते हैं:**\n` +
      `• **कक्षा में खुशहाली की क्रियाएं:** 5-मिनट के 'कॉम्प्लीमेंट सर्कल' जैसी क्रियाएं जो बच्चों के बीच सकारात्मक संबंध विकसित करती हैं।\n` +
      `• **PERMA मॉडल का उपयोग:** कक्षा में सकारात्मक भावनाएं, गहरी भागीदारी और उपलब्धि की भावना को जगाने वाले सरल तरीके।\n` +
      `• **बर्नआउट और कार्यभार से बचाव:** अध्यापन के भारी मानसिक तनाव से निपटने, सीमाएं तय करने और स्वयं के मानसिक स्वास्थ्य की रक्षा के उपाय।\n` +
      `• **सहानुभूतिपूर्ण भावनात्मक नियमन:** बच्चों को शांत करने की श्वास क्रियाएं, क्लासरूम को-रेगुलेशन और उत्तेजनापूर्ण स्थितियों का प्रेमपूर्वक प्रबंधन।` :

      language === "Bengali" ? `নমস্কার ${profile.name} মহাশয়া! 🙏\n\n` +
      `আমি ${mentor.name}, লভ্য ফাউন্ডেশন-এর পক্ষ থেকে আপনার ব্যক্তিগত মেন্টর। শ্রেণীকক্ষে শিশুদের বিকাশের সাথে সাথে আপনার নিজস্ব মানসিক ও আবেগীয় স্বাস্থ্যের যত্ন নেওয়া অত্যন্ত প্রয়োজনীয়। আপনার খুশী ও সুস্থতাই একটি সুন্দর ক্লাস গড়ার চাবিকাঠি।\n\n` +
      `আমার কাজের অভিজ্ঞতা হলো: "${mentor.background}"।\n\n` +
      `**আমরা একসাথে নিচের গুরুত্বপূর্ণ বিষয়গুলো নিয়ে আলোচনা এবং সমাধান খুঁজতে পারি:**\n` +
      `• **শ্রেণীকক্ষে খুশির আনন্দদায়ক রুটিন:** সহপাঠী মূল্যায়ন ও আনন্দপূর্ণ সম্পর্কের উন্নয়নমূলক সহজ কসরত।\n` +
      `• **PERMA সুচারু ফ্লরিশিং ফ্রেমওয়ার্ক:** শিক্ষার্থীদের সার্থকতা, অনুপ্রেরণা এবং গভীর পাঠ্য মনোযোগ বৃদ্ধির উপায়।\n` +
      `• **কাজের চাপ ও ক্লান্তি (Burnout) প্রতিরোধ:** দৈনন্দিন প্রশাসনিক কাজের চাপ সামলানো এবং নিজের মানসিক শক্তি বজায় রাখার কৌশল।\n` +
      `• **আবেগ নিয়ন্ত্রণ ও সহ-নিয়ন্ত্রণ (Co-regulation):** উত্তেজিত পরিস্থিতি শান্ত করার শ্বাসক্রিয়া এবং শ্রেণীকক্ষের শৃঙ্খলা বজায় রাখার উপায়।` :

      language === "Gujarati" ? `નમસ્તે શિક્ષક સાથી ${profile.name} જી! 🙏\n\n` +
      `હું ${mentor.name} છું, લભ્ય ટીમ વતી આપની માર્ગદર્શક શિક્ષક સાથી. બાળકોના ભવિષ્યને ઉજ્જવળ બનાવવા માટે આપ જે મહેનત કરા છો તે અતુલ્ય છે. આપની પોતાની પ્રસન્નતા અને માનસિક સ્વાસ્થ્ય જ વર્ગખંડની ખુશાલીનો પાયો છે.\n\n` +
      `મારો અનુભવ "${mentor.background}" માં રહેલો છે. અહીં આપ આપની ચિંતાઓ અને પડકારો મુક્તપણે શેર કરી શકો છો.\n\n` +
      `**આપણે સાથે મળીને આ મુખ્ય મુદ્દાઓ પર ઊંડી ચર્ચા કરી શકીએ છીએ:**\n` +
      `• **ખુશહાલી વર્ગ પ્રવૃત્તિઓ:** માત્ર 5-મિનિટના કોમ્પ્લીમેન્ટ સર્કલ જેવા પ્રયોગો જે બાળકોમાં પરસ્પર મિત્રતા વધારે છે.\n` +
      `• **PERMA ફ્રેમવર્ક પ્રયોગો:** સકારાત્મક લાગણીઓ, ઊંડો રસ, અને વર્ગખંડમાં બાળકો વચ્ચેના સુમેળભર્યા સંબંધો.\n` +
      `• **બર્નઆઉટ અને થાકમાંથી મુક્તિ:** અતિશય વર્કલોડ સામે માનસિક રક્ષણ અને સ્ટ્રેસ અટકાવવાના ઉપાયો.\n` +
      `• **ભાવનાત્મક નિયમન (Emotional Regulation):** ક્રોધ અથવા તણાવના સમયે શ્વાસ લેવાની ક્રિયાઓ અને વર્ગને શાંત કરવાની રીતો.` :

      language === "Hinglish" ? `Hello Teacher ${profile.name}! 🙏\n\n` +
      `Main ${mentor.name} hoon, Labhya ki tarf se aapki professional well-being mentor. Sabse pehle, aapke daily dedication aur hard work ke liye deep gratitude. Aapka wellbeing hi aapke class aur bacho ki happiness ki sacchi foundation hai.\n\n` +
      `Mera background hai: "${mentor.background}". Yeh aapsi discussion ka ek safe container hai jahan hum teaching stress ko handle karne aur dynamic classroom strategies ke baare me discuss karenge.\n\n` +
      `**Hum in custom areas par focus kar sakte hain:**\n` +
      `• **Happiness Rules:** Class me quick interactive social emotional activities.\n` +
      `• **Seligman's PERMA Framework:** Positive emotions, relationship bonds aur engagement boost karne ke simple tarike.\n` +
      `• **Burnout Prevention:** Workload stress decrease karne aur teacher boundary balance rakhne wale practices.\n` +
      `• **Somatic Emotional Regulation:** Breathing drills, mindfulness check-ins aur classroom control ideas.` :

      `Hello Teacher ${profile.name}! 🙏\n\n` +
      `I am ${mentor.name}, your dedicated Well-Being Mentor and companion from Labhya. First, I want to thank you for the incredible, yet deeply exhausting work you do every day for our children. Your physical, mental, and socio-emotional battery is the heart of a happy classroom.\n\n` +
      `My background helper focus is: "${mentor.background}". Together, we can discuss concrete, practical, and highly actionable socio-emotional strategies for your teaching experience.\n\n` +
      `**Here is how we can make our conversation most supportive:**\n` +
      `• **Explore Happiness Routines:** Micro-practices (like Compliment Circles) that inject joyful learning moments.\n` +
      `• **Seligman's PERMA Blueprint:** Simple ways to track positive emotions, engagement, relational bonds, and sense of achievement.\n` +
      `• **Workload & Burnout Defenses:** Grounding practices to protect your boundaries, offload stress, and manage classroom fatigue.\n` +
      `• **Somatic Emotional Regulation:** Healthy classroom co-regulation, breathing drills, and calming rowdy environments gracefully.`;

    const localizeBody = 
      language === "Hindi" ? `आप नीचे दिए गए किसी भी डायनामिक प्रॉम्प्ट बटन पर क्लिक कर सकते हैं, अपने मनपसंद विषय को चुन सकते हैं, या सीधे अपनी कोई भी समस्या लिख सकते हैं। आइये साथ मिलकर शुरुआत करें, शिक्षक साथी!` :
      language === "Bengali" ? `আপনি নিচে দেওয়া যেকোনো পরিবর্তনশীল অ্যাকশন বাটনে ক্লিক করতে পারেন, আপনার নিজস্ব কোনো সুনির্দিষ্ট প্রশ্ন টাইপ করতে পারেন, অথবা আলোচনার মূল বিষয় বেছে নিতে পারেন সাথী!` :
      language === "Gujarati" ? `આપ નીચે આપેલા ડાયનામિક બટનોમાંથી કોઈપણ પસંદ કરી શકો છો, આપના મનપસંદ વિષયને પસંદ કરી શકો છો અથવા આપની કોઈપણ કૂંજી સમસ્યા લખી શકો છો સાથી!` :
      language === "Hinglish" ? `Aap niche diye gaye dynamic inquiry buttons ko click kar sakte hain, direct text input me apni classroom situation type kar sakte hain, ya specific focus topics toggle kar sakte hain. Shuru karein, Saathi?` :
      `Feel free to use the dynamic action prompts below, toggle specific topics of interest, or type any classroom scenario you are dealing with right now. Let's begin our journey together, Saathi!`;

    const appIntroSection = 
      language === "Hindi" ? `\n\n**शिक्षक साथी (ShiksakSathi) के बारे में:**\n` +
      `शिक्षक साथी (ShiksakSathi) भारतीय शिक्षकों के लिए बनाया गया एक विशेष AI-संचालित साथी है। हमारा मानना है कि एक शिक्षक की खुशहाली ही खुशहाल कक्षा की असली नींव है। यह साथी आपको कक्षा की मनोरंजक गतिविधियों को खोजने, दैनिक प्रशासनिक तनाव को कम करने, सुगठित श्वास व्यायाम करने और तुरंत व्यक्तिगत शैक्षणिक मार्गदर्शन प्रदान करने में सहायता करता है। आइये मिलकर खुशहाल शिक्षा का निर्माण करें!\n` :

      language === "Bengali" ? `\n\n**শিক্ষক সাথী (ShiksakSathi) সম্পর্কে:**\n` +
      `শিক্ষক সাথী (ShiksakSathi) ভারতীয় শিক্ষকদের জন্য তৈরি একটি বিশেষ AI-চালিত সহযোগী। আমরা বিশ্বাস করি যে একজন শিক্ষকের মানসিক ও আবেগীয় সুস্থতাই একটি আনন্দময় ক্লাসরুমের ভিত্তি। এই সহযোগী আপনাকে ক্লাসের আকর্ষণীয় কার্যকলাপের সন্ধান দিতে, প্রতিদিনের কাজের ক্লান্তি কমাতে, সহজ শ্বাসক্রিয়ার অনুশীলন করতে এবং সুনির্দিষ্ট শিক্ষাগত পরামর্শ পেতে সাহায্য করবে। আসুন একসাথে একটি সুন্দর শিক্ষার পরিবেশ গড়ে তুলি!\n` :

      language === "Gujarati" ? `\n\n**શિક્ષક સાથી (ShiksakSathi) વિશે:**\n` +
      `શિક્ષક સાથી (ShiksakSathi) એ ભારતીય શિક્ષકો માટે ખાસ તૈયાર કરેલ એક AI-સંચાલિત ડિજિટલ સાથીદાર છે। અમારું માનવું છે કે શિક્ષકનું કલ્યાણ એ જ એક ખુશખુશાલ વર્ગખંડનો સાચો પાયો છે। આ સાથી આપને નવી પ્રવૃત્તિઓ શોધવામાં, રોજિંદા કામના તણાવને ઘટાડવામાં, સાનુકૂળ શ્વાસની ક્રિયાઓમાં અને ત્વરિત શૈક્ષણિક માર્ગદર્શન મેળવવામાં મદદરૂપ થશે। ચાલો સાથે મળીને આનંદી શિક્ષણ પ્રણાલીનું સર્જન કરીએ!\n` :

      language === "Hinglish" ? `\n\n**About ShiksakSathi (शिक्षक साथी):**\n` +
      `ShiksakSathi (शिक्षक साथी) primary classrooms aur educators ke liye ek AI-powered companion hai. Humara manna hai ki teacher ki well-being hi happy classrooms ki asli foundation hai. Yeh companion aapko instant classroom hacks, activities, administrative burnout control methods aur structured breathing exercises practice karne me maddat karega. Aaiye sath milkar ek joyful learning ecosystem banayein!\n` :

      `\n\n**About ShiksakSathi (शिक्षक साथी):**\n` +
      `ShiksakSathi is your AI-powered companion designed for Indian educators. We believe that a teacher's well-being is the foundation of a happy classroom. This companion helps you discover interactive classroom activities, ease daily administrative burnout, practice custom somatic breathing drills, and access instant, tailored pedagogical guidance. Let's co-create a joyful learning ecosystem together!\n`;

    const initialBotMessage: ChatMessage = {
      id: "init_bot",
      sender: "bot",
      text: `${localizedHello}${appIntroSection}\n\n${localizeBody}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      topic: "General Doubts"
    };

    setMessages([initialBotMessage]);
  };

  // Direct endpoint chat querying
  const sendChatMessage = async (textToSend: string, selectionOverride?: string) => {
    if (!textToSend.trim()) return;

    resetIdleTimer();

    // Support numeric select shortcuts (e.g. "1", "1,3", "2 4", "1 and 3").
    // We only trigger this if selectionOverride is undefined (meaning it's typed directly in the chat bar by the user).
    const cleanedInput = textToSend.trim().toLowerCase();
    const isTopicNumberMatch = /^[1-9][\d\s,\+&]*$/.test(cleanedInput) || 
                               (cleanedInput.startsWith("and ") && /^[1-9][\d\s,\+&]*$/.test(cleanedInput.replace("and ", ""))) ||
                               /^[1-9]\s*(?:,\s*[1-9]|\s+[1-9]|\s+and\s+[1-9])*$/.test(cleanedInput);

    if (isTopicNumberMatch && !selectionOverride) {
      const digits = cleanedInput.match(/\d+/g);
      if (digits && digits.length > 0) {
        const selectedIds: string[] = [];
        digits.forEach(digitStr => {
          const idx = parseInt(digitStr, 10) - 1;
          if (idx >= 0 && idx < chatTopics.length) {
            selectedIds.push(chatTopics[idx].id);
          }
        });

        if (selectedIds.length > 0) {
          setInputValue("");
          handleConsultTopics(selectedIds);
          return;
        }
      }
    }

    const userMsg: ChatMessage = {
      id: "usr_" + Date.now().toString(36),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      topic: selectionOverride || currentTopic
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsAiLoading(true);

    // Call logging analytics
    logAnalytics("CHAT_MESSAGE_SENT", { text: textToSend, currentTopic: selectionOverride || currentTopic });

    try {
      const chatHistorySubset = messages.slice(-8).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          chatHistory: chatHistorySubset,
          teacherProfile: profile,
          agentName: mentor.name,
          currentTopic: selectionOverride || currentTopic
        })
      });
      const data = await res.json();

      setIsAiLoading(false);
      
      const botMsgText = data.text || "I apologize, but we're experiencing a network glitch. Let us retry!";
      const botMsg: ChatMessage = {
        id: "bot_" + Date.now().toString(36),
        sender: "bot",
        text: botMsgText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: selectionOverride || currentTopic,
        isLong: botMsgText.length > 380
      };

      setMessages(prev => [...prev, botMsg]);

      // Update contextual, dynamic conversation topics and proposed suggested prompts based on the reply text's metadata!
      if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
        const numberedTopics = data.topics.map((t: any, idx: number) => {
          const label = t.label || "";
          if (/^\[\d+\]/.test(label)) {
            return t;
          }
          return {
            ...t,
            label: `[${idx + 1}] ${label}`
          };
        });
        setChatTopics(numberedTopics);
        // Automatically activate the first dynamic keyword topic to match suggestions
        setCurrentTopic(numberedTopics[0].id);
      }
      if (data.suggestions && typeof data.suggestions === "object") {
        setDynamicSuggestions(data.suggestions);
      }

    } catch (error) {
      console.error("Chat Server Query Error:", error);
      setIsAiLoading(false);
      const botErrorMsg: ChatMessage = {
        id: "bot_err_" + Date.now().toString(36),
        sender: "bot",
        text: "I am having difficulty connecting with the expert matrix right now. Please select an action button or retry!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botErrorMsg]);
    }
  };

  // multi-topic click selection triggers comprehensive solution
  const handleConsultTopics = (eventArgs?: string[]) => {
    const activeSelection = eventArgs || selectedMultiTopics;
    if (activeSelection.length === 0) return;

    resetIdleTimer();
    const topicLabels = activeSelection.map(id => {
      const found = WELLBEING_TOPICS.find(w => w.id === id);
      return found ? found.title : id;
    });

    const triggerLinguisticLabel = 
      language === "Hindi" ? `विशेषज्ञ अध्ययन: ${topicLabels.join(" और ")}` :
      language === "Bengali" ? `মেন্টর আলোচনা: ${topicLabels.join(" এবং ")}` :
      language === "Gujarati" ? `અભ્યાસ પદ્ધતિ: ${topicLabels.join(" અને ")}` :
      `Deep consultative review: ${topicLabels.join(", ")}`;

    // Set combined state topic
    setCurrentTopic(activeSelection.join("+"));
    
    // Clear check outline
    setSelectedMultiTopics([]);

    // Submit as chat trigger
    sendChatMessage(triggerLinguisticLabel, activeSelection.join("+"));
  };

  // Helper keyword click sends rapid targeted inquiry
  const handleKeywordQuery = (kw: string) => {
    const customPrompt = 
      language === "Hindi" ? `मुझे इसके बारे में विस्तार से बताएं: "${kw}"। क्या आपके पास इसके जुड़े और कोई उदाहरण हैं?` :
      language === "Bengali" ? `দয়া করে আমাকে এই বিষয়ে বিশদে বলুন: "${kw}"।` :
      language === "Gujarati" ? `મને આ પ્રક્રિયા વિગતવાર સમજાવો: "${kw}"` :
      `Tell me details about: "${kw}" with real practical exercises for my class.`;

    sendChatMessage(customPrompt, currentTopic);
  };

  // Logging events to analytical database programmatically
  const logAnalytics = async (eventType: string, metadata: any) => {
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          teacherId: profile.name ? profile.name : "Guest",
          metadata
        })
      });
    } catch (_) {}
  };

  const handleDownloadSummaryPDF = () => {
    logAnalytics("DOWNLOAD_SUMMARY_PDF_CLICKED", {
      selectedHacks,
      numMessages: messages.length
    });
    
    // Filter and map topic objects
    const hacksList = WELLBEING_TOPICS.filter(t => selectedHacks.includes(t.id));
    generateWellBeingPDF(profile, messages, hacksList, language);
  };

  // Permanent button: Change English/Hindi/Bengali/Gujarati/Hinglish
  const handleLanguageChange = (newLang: string) => {
    resetIdleTimer();
    setLanguage(newLang);
    setProfile(p => ({ ...p, language: newLang }));
    setShowLanguageModal(false);
    logAnalytics("LANGUAGE_CHANGED", { to: newLang });

    // Push helpful linguistic update banner in stream
    const updateMessage: ChatMessage = {
      id: "lang_upd_" + Date.now().toString(36),
      sender: "system",
      text: `Language configured to: ${newLang}. Aap naye topics select kar ke conversation shuru kar sakte hain.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, updateMessage]);
  };

  // Special Action Button Pink 🩷: Escalate to Human
  const handleEscalateToHuman = () => {
    resetIdleTimer();
    logAnalytics("ESCALATE_TO_HUMAN_TRIGGERED", { currentTopic });

    // Show beautiful immediate dialogue
    const escalateResponse: ChatMessage = {
      id: "esc_" + Date.now().toString(36),
      sender: "bot",
      text: t.escalatePrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, escalateResponse]);

    // Check if phone or email is missing, nudge politely
    if (!profile.phone && !profile.email) {
      const missingNudge: ChatMessage = {
        id: "esc_ndg_" + Date.now().toString(36),
        sender: "system",
        text: "Please submit your contact phone/email in the chat or Admin tab so an expert can ring you shortly.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, missingNudge]);
    }
  };

  // Special Action Button Pink 🩷: End Chat (Clear variables, redirect out to absolute End block)
  const handleManualEndChat = () => {
    logAnalytics("END_CHAT_CLICKED", { name: profile.name });
    triggerWipeAndTerminate();
  };

  const handleFontSizeChange = (newSize: "small" | "medium" | "large") => {
    setFontSize(newSize);
    
    const updatedProfile = {
      ...profile,
      fontSize: newSize
    };
    setProfile(updatedProfile);
    safeStorage.setItem("labhya_profile", JSON.stringify(updatedProfile));
    
    logAnalytics("FONT_SIZE_UPDATED", { fontSize: newSize });
    
    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProfile)
    })
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.teacher) {
          safeStorage.setItem("labhya_profile", JSON.stringify(data.teacher));
        }
      })
      .catch((err) => {
        console.warn("Silent background profile update error:", err);
      });
  };

  const handleTimeoutEndChat = () => {
    logAnalytics("TIMEOUT_TERMINATED_10MIN", { name: profile.name });
    triggerWipeAndTerminate();
  };

  const triggerWipeAndTerminate = () => {
    if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    
    // Save Guest wipe
    safeStorage.removeItem("labhya_profile");
    safeStorage.removeItem("labhya_onboarded");
    
    // Reset state locally
    setProfile({
      name: "Guest",
      gradeClass: "Not specified",
      experience: "Not specified",
      region: "Delhi NCR",
      language: "Hindi",
      email: "",
      phone: "",
      address: "",
      fontSize: "medium"
    });

    setChatEnded(true);
    setShowWarning(false);
    setShowNudge(false);
  };

  // Start fresh chat after finishing
  const handleRestartSession = () => {
    setChatEnded(false);
    setIsOnboarded(false); // return to geodetect & onboarding
    setOnboardingView("options");
    setMessages([]);
    setIdleTime(0);
    setSessionDuration(0);
    const newId = "sess_" + Date.now().toString(36);
    setSessionId(newId);
    safeStorage.setItem("labhya_session_id", newId);
    safeStorage.setItem("labhya_session_start_time", new Date().toISOString());
    safeStorage.removeItem("labhya_chat_session");
    setHasSavedSession(false);
    setProfile({
      name: "",
      gradeClass: "",
      experience: "Beginner (0-2 years)",
      region: "Delhi NCR",
      language: "English",
      email: "",
      phone: "",
      address: "",
      fontSize: "medium"
    });
  };

  // Read backend analytics records programmatically
  const loadAdminAnalyticRecords = async () => {
    setIsAdminLoading(true);
    try {
      const res = await fetch("/api/records");
      const data = await res.json();
      setAdminRecords(data);
    } catch (e) {
      console.error("Admin view error", e);
    } finally {
      setIsAdminLoading(false);
    }
  };

  useEffect(() => {
    if (showAdminPanel) {
      loadAdminAnalyticRecords();
    }
  }, [showAdminPanel]);


  // Text toggle expand helper
  const toggleExpanded = (id: string) => {
    setExpandedMessages(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="h-[100dvh] bg-slate-50 text-slate-800 font-sans selection:bg-teal-100 flex flex-col antialiased overflow-hidden">
      
      {/* HEADER SECTION - Shows strictly Labhya Logo & ShiksakSathi Brand */}
      {!isOnboarded && (
        <header className="flex bg-white shadow-sm border-b border-slate-100 z-40 px-3 sm:px-6 py-2 sm:py-3.5 items-center justify-between shrink-0">
          <div className="flex items-center gap-3 select-none" id="labhya-brand-top">
            {/* High-quality calligraphic representation of the Labhya (लभ्य) logo */}
            <img
              src="/src/assets/images/labhya_final_logo_1779937435047.png"
              alt="Labhya Logo"
              className="h-8 md:h-10 w-auto shrink-0 object-contain mix-blend-multiply"
              referrerPolicy="no-referrer"
              id="labhya-brand-logo-img"
            />
          <div className="h-6 w-[1.5px] bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-xs md:text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
              ShiksakSathi
            </span>
            <span className="text-[9px] md:text-[10px] font-bold text-[#007E8A] tracking-wider leading-none mt-1">
              शिक्षक साथी
            </span>
          </div>
        </div>

        {/* Collapsible Search for specific classroom topics within the knowledge base */}
        <div className="relative flex items-center shrink-0 min-w-0" id="header-search-container">
          <button 
            type="button"
            onClick={() => {
              setSearchExpanded(!searchExpanded);
              if (!searchExpanded) {
                setSearchQuery("");
              }
            }}
            className={`p-2 rounded-full transition-colors shrink-0 cursor-pointer ${
              searchExpanded 
                ? "bg-slate-100 text-[#007E8A]" 
                : "text-slate-500 hover:text-[#007E8A] hover:bg-slate-50"
            }`}
            title="Search classroom topics"
            id="header-search-btn"
          >
            <Search className="h-4 sm:h-5 w-4 sm:w-5" />
          </button>

          <AnimatePresence>
            {searchExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 160, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="overflow-hidden flex items-center ml-1 h-8 sm:h-9 rounded-lg"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search topics..."
                  className="w-full text-[11px] sm:text-xs py-1.5 px-2 bg-slate-100 border border-slate-200 focus:border-[#007E8A] outline-none rounded-lg text-slate-800 transition focus:bg-white placeholder-slate-400"
                  autoFocus
                  id="header-search-input"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Popover Dropdown Results */}
          {searchExpanded && searchQuery.trim() !== "" && (
            <div className="absolute top-11 right-0 sm:left-0 bg-white rounded-xl shadow-2xl border border-slate-200 w-72 sm:w-96 z-50 p-2 flex flex-col gap-1.5 max-h-80 overflow-y-auto" id="search-popover-dropdown">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-rose-100/50 flex justify-between">
                <span>Matching Topics ({
                  WELLBEING_TOPICS.filter(t => {
                    const q = searchQuery.toLowerCase();
                    return (
                      t.title.toLowerCase().includes(q) ||
                      t.englishTitle.toLowerCase().includes(q) ||
                      t.description.toLowerCase().includes(q) ||
                      t.insight.toLowerCase().includes(q) ||
                      t.powerKeywords.some(kw => kw.toLowerCase().includes(q))
                    );
                  }).length
                })</span>
                <span className="text-[9px] text-[#007E8A] uppercase font-sans font-bold">Classroom Knowledge</span>
              </div>
              
              {(() => {
                const filtered = WELLBEING_TOPICS.filter(t => {
                  const q = searchQuery.toLowerCase();
                  return (
                    t.title.toLowerCase().includes(q) ||
                    t.englishTitle.toLowerCase().includes(q) ||
                    t.description.toLowerCase().includes(q) ||
                    t.insight.toLowerCase().includes(q) ||
                    t.powerKeywords.some(kw => kw.toLowerCase().includes(q))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-4 text-center text-slate-400 italic font-medium">
                      No matching topics. Try 'noise', 'burnout', 'attention'.
                    </div>
                  );
                }

                return filtered.map(topic => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      if (!isOnboarded) {
                        setProfile(p => ({
                          ...p,
                          name: p.name || "Teacher Saathi"
                        }));
                        setIsOnboarded(true);
                        safeStorage.setItem("labhya_onboarded", "true");
                      }
                      logAnalytics("HEADER_SEARCH_TOPIC_SELECT", { topicId: topic.id });
                      handleConsultTopics([topic.id]);
                      setSearchQuery("");
                      setSearchExpanded(false);
                    }}
                    className="w-full text-left p-2 hover:bg-teal-50/80 border border-transparent hover:border-teal-100 rounded-lg transition group block cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs text-[#007E8A] group-hover:text-[#006670]">
                      <span>{topic.emoji}</span>
                      <span>{topic.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 leading-relaxed font-sans">
                      {topic.description}
                    </p>
                  </button>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Action controls - removed user-facing idle metrics and analytics in alignment with user preferences */}
        <div className="flex items-center gap-3">
          {/* Visual indicators removed to streamline user focus on the converse space */}
        </div>
      </header>
      )}

      {/* SYSTEM MULTI-STAGED ALERTS AND NUDGES REMOVED TO MAXIMIZE READABILITY CONTAINER */}

      {/* CORE WORKSPACE HEIGHT AND SPACE MAXIMIZED OVERALL */}
      <main className={`flex-1 min-h-0 w-full flex flex-col justify-stretch relative overflow-hidden ${
        isOnboarded 
          ? "max-w-none p-0 sm:p-2.5" 
          : "max-w-5xl mx-auto px-2 sm:px-4 pb-2 sm:pb-4 pt-1.5 sm:pt-2"
      }`}>
        
        {/* SUB VIEW: ADMIN ANALYTICS PORTAL */}
        <AnimatePresence>
          {showAdminPanel && (
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="absolute inset-0 bg-white z-20 flex flex-col p-6 overflow-y-auto"
              id="admin-analytics-view"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                    <BarChart2 className="h-6 w-6 text-[#007E8A]" />
                    {t.adminTitle}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">{t.adminDesc}</p>
                </div>
                <button
                  onClick={() => setShowAdminPanel(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {isAdminLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Loader2 className="h-10 w-10 text-[#007E8A] animate-spin mb-2" />
                  <p className="text-sm text-slate-500">Querying file schema records...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Aggregated Quick Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-xs">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Registered Teachers</span>
                      <span className="text-2xl sm:text-4xl font-display font-medium text-[#1C3144]">{adminRecords?.teachers?.length || 0}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-xs">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1 font-sans">Active Chats Logged</span>
                      <span className="text-2xl sm:text-4xl font-display font-medium text-[#007E8A]">{adminRecords?.chats?.length || 0}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-xs">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1 font-sans">Somatic Actions</span>
                      <span className="text-2xl sm:text-4xl font-display font-medium text-[#FF4B91]">{adminRecords?.analytics?.length || 0}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-xs animate-none">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1 font-sans text-amber-700">Tracked Sessions</span>
                      <span className="text-2xl sm:text-4xl font-display font-medium text-amber-600">{adminRecords?.sessions?.length || 0}</span>
                    </div>
                  </div>

                  {/* Registered Educators register panel */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900 font-display flex items-center gap-2">
                        <User className="h-4 w-4 text-[#007E8A]" />
                        {t.teacherIndex}
                      </h4>
                      <span className="text-xs bg-white text-[#007E8A] border border-slate-200 px-2.5 py-1 rounded font-mono font-bold">
                        records.json
                      </span>
                    </div>
                    {adminRecords?.teachers && adminRecords.teachers.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-200">
                        {adminRecords.teachers.map((teach, idx) => (
                          <div key={teach.id || idx} className="p-4 hover:bg-slate-50 flex flex-col md:flex-row justify-between gap-4">
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {teach.name}
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                                  {teach.experience}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {teach.gradeClass}</span>
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {teach.region} ({teach.language})</span>
                              </div>
                            </div>
                            <div className="text-xs text-slate-600 space-y-1 font-mono md:text-right">
                              {teach.phone && <div className="flex items-center justify-end gap-1"><Phone className="h-3 w-3" /> {teach.phone}</div>}
                              {teach.email && <div className="flex items-center justify-end gap-1"><Mail className="h-3 w-3" /> {teach.email}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-sm">No teacher profiles stored on backend server.</div>
                    )}
                  </div>

                  {/* AI Conversation analytics table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
                      <h4 className="font-bold text-sm text-slate-900 font-display flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#007E8A]" />
                        {t.chatTraces}
                      </h4>
                    </div>
                    {adminRecords?.chats && adminRecords.chats.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-200">
                        {adminRecords.chats.map((chatTr, idx) => (
                          <div key={chatTr.id || idx} className="p-4 text-xs space-y-1">
                            <div className="flex items-center justify-between font-mono text-slate-500">
                              <span>TCH: {chatTr.teacherName} | Topic: {chatTr.topic}</span>
                              <span>{new Date(chatTr.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="font-semibold text-slate-800">Q: {chatTr.userMessage}</div>
                            <div className="text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 max-h-24 overflow-y-auto italic">
                              AI: {chatTr.agentResponse}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-sm animate-pulse">Conversation matrix is empty. Waiting for AI chat...</div>
                    )}
                  </div>

                  {/* Teacher Session Logs & Elapsed Duration Metrics */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
                      <h4 className="font-bold text-sm text-slate-900 font-display flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#007E8A]" />
                        <span>Teacher Session Logs & Elapsed Metrics / सत्र इतिहास और समय अवधि</span>
                      </h4>
                    </div>
                    {adminRecords?.sessions && adminRecords.sessions.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-200">
                        {adminRecords.sessions.map((sess, idx) => (
                          <div key={sess.sessionId || idx} className="p-4 text-xs space-y-2 hover:bg-slate-50/50 transition-colors">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                              <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                <span className="bg-emerald-100 text-emerald-800 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold leading-none">
                                  {sess.sessionId}
                                </span>
                                <span className="text-slate-900 font-sans font-bold">{sess.teacherName}</span>
                                <span className="text-[10px] font-normal text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                                  {sess.language} ({sess.currentTopic})
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                                <span className="bg-amber-100 text-amber-850 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5">
                                  Time Taken: {Math.floor(sess.timeTakenSeconds / 60)}m {sess.timeTakenSeconds % 60}s
                                </span>
                                <span>{new Date(sess.updatedAt).toLocaleTimeString()}</span>
                              </div>
                            </div>
                            <div className="text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1.5">
                              <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Conversation Logs ({sess.messages?.length || 0} messages):</div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {Array.isArray(sess.messages) && sess.messages.map((m, mIdx) => (
                                  <div key={m.id || mIdx} className="flex gap-1.5 text-[10px] sm:text-[11px] leading-relaxed border-b border-dashed border-slate-100 pb-1">
                                    <span className={`font-mono uppercase text-[8px] tracking-wide shrink-0 font-black px-1.5 py-0.5 rounded-sm ${m.sender === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                                      {m.sender}
                                    </span>
                                    <span className="text-slate-700">{m.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-sm">No session activity tracked yet. Waiting for interaction logs.</div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowAdminPanel(false)}
                    className="w-full mt-4 py-3 bg-[#007E8A] hover:bg-[#006670] text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {t.backToChat}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONDITION-STAGED USER WORKSPACE CONTAINER */}
        <div className="flex-1 w-full flex flex-col justify-center items-center min-h-0">

          <AnimatePresence mode="wait">
            
            {/* STAGE A: TERMINATION AND END CHAT SCRIPTS HARD BLOCK */}
            {chatEnded ? (
              <motion.div
                key="end-block-stage"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border border-slate-200/80 flex flex-col items-center animate-fade-in"
                id="end-chat-block"
              >
                <div className="h-16 w-16 bg-[#FF4B91]/10 rounded-full flex items-center justify-center text-[#FF4B91] mb-6">
                  <LogOut className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold font-display text-slate-900 mb-2">
                  {t.endBlockTitle}
                </h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed max-w-md">
                  {t.endBlockSub}
                </p>

                {/* Micro record visual stats representation */}
                <div className="bg-slate-50 rounded-xl p-4 w-full border border-slate-200 text-xs text-left mb-6 font-mono text-slate-500">
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 mb-2">
                    <span className="font-bold">Linguistic Region:</span>
                    <span>{profile.region || "Wiped"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 mb-2">
                    <span className="font-bold">Socio-Emotional State:</span>
                    <span className="text-green-600 font-bold">Saved on Server File</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-red-500">Client Memory:</span>
                    <span className="font-bold">Cleaned</span>
                  </div>
                </div>

                <button
                  onClick={handleRestartSession}
                  className="px-6 py-3 bg-[#007E8A] hover:bg-[#006670] hover:scale-[1.02] text-white font-bold rounded-xl transition shadow-md w-full"
                >
                  {t.restart}
                </button>
              </motion.div>
            ) :

            /* STAGE B: GEOLOCATION AND PROFILE ONBOARDINGS CARD */
            !isOnboarded ? (
              <motion.div
                key="onboarding-stage"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden max-h-[95%] sm:max-h-full max-w-2xl w-full border border-slate-200 flex flex-col"
                id="onboarding-block"
              >
                {/* Visual Header */}
                <div className="bg-[#1C3144] p-5 sm:p-6 text-white relative text-center shrink-0 flex flex-col items-center justify-center">
                  <div className="absolute right-4 sm:right-6 top-4 sm:top-6 bg-white/10 backdrop-blur-md px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-[#FED766] uppercase">
                    ShiksakSathi
                  </div>

                  {/* Labhya Logo in Headline */}
                  <div className="mb-3 hover:scale-105 transition-transform duration-300 select-none" id="onboarding-headline-logo">
                    <div className="bg-white px-4 py-2 rounded-2xl shadow-md inline-flex items-center justify-center border border-slate-100">
                      <img
                        src="/src/assets/images/labhya_final_logo_1779937435047.png"
                        alt="Labhya Logo"
                        className="h-10 sm:h-12 w-auto shrink-0 object-contain"
                        referrerPolicy="no-referrer"
                        id="onboarding-brand-logo-img"
                      />
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black font-display text-[#FED766] mb-1">
                    शिक्षक साथी
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm">
                    Your companion for socio-emotional well-being.
                  </p>
                </div>

                {onboardingView === "options" ? (
                  /* Two simple, thumb-friendly options on starting screen */
                  <div className="p-5 sm:p-8 space-y-6 flex flex-col justify-center items-center overflow-y-auto" id="onboarding-options-pane">
                    
                    {hasSavedSession && (
                      <div className="w-full bg-[#007E8A]/5 border-2 border-[#007E8A]/25 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left mb-1 shadow-sm" id="continue-prev-session-prompt">
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center justify-center md:justify-start gap-1.5 uppercase tracking-wider">
                            <Sparkles className="h-4 w-4 text-[#007E8A] animate-pulse" />
                            <span>Continue Previous Session? / पिछला सत्र जारी रखें?</span>
                          </h4>
                          <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed max-w-sm sm:max-w-md">
                            We found your unfinished conversation with {profile.name || "Teacher Saathi"} ({Math.round(sessionDuration / 60)} minutes spent). Would you like to resume?
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0 w-full md:w-auto justify-center md:justify-end">
                          <button
                            type="button"
                            onClick={handleContinuePreviousSession}
                            className="px-4 py-2 bg-[#007E8A] hover:bg-[#006670] active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
                            id="btn-restore-session-yes"
                          >
                            Yes, Continue Session
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOnboardingView("details");
                              logAnalytics("START_FRESH_ONBOARDING", { name: profile.name });
                            }}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                            id="btn-restore-session-no"
                          >
                            No, Start Fresh
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="text-center mb-1">
                      <p className="text-slate-500 text-xs sm:text-sm max-w-md leading-relaxed">
                        Choose how you would like to start your professional classroom well-being companion logs.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      {/* Option 1: Choose all details customized way (Now First/Top) */}
                      <button
                        type="button"
                        onClick={() => setOnboardingView("details")}
                        className="group relative flex flex-col items-center justify-between text-center p-5 sm:p-6 bg-slate-50 border border-slate-200 hover:border-[#007E8A] hover:bg-[#007E8A]/5 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer h-52 sm:h-56"
                        id="btn-options-detailed"
                      >
                        <div className="flex flex-col items-center">
                          <div className="p-3 bg-orange-50 text-orange-600 group-hover:bg-orange-100/60 rounded-full transition-colors mb-3.5">
                            <User className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 block group-hover:text-[#007E8A] transition-colors uppercase tracking-wider">
                            📝 Input All Details
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Personal setup</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-2.5 max-w-[200px]">
                            Customise your display name, teaching experience, grade, and languages.
                          </p>
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-200 px-3 py-1 sm:py-1.5 rounded-full group-hover:bg-[#007E8A] group-hover:text-white transition-all mt-3">
                          Fill Form →
                        </div>
                      </button>

                      {/* Option 2: Shortcut way to start (Now Second/Bottom) */}
                      <button
                        type="button"
                        onClick={handleQuickStart}
                        className="group relative flex flex-col items-center justify-between text-center p-5 sm:p-6 bg-slate-50 border border-slate-200 hover:border-[#007E8A] hover:bg-[#007E8A]/5 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer h-52 sm:h-56"
                        id="btn-options-quick-start"
                      >
                        <div className="flex flex-col items-center">
                          <div className="p-3 bg-teal-50 text-[#007E8A] group-hover:bg-[#007E8A]/10 rounded-full transition-colors mb-3.5">
                            <Sparkles className="h-5.5 w-5.5 sm:h-6 sm:w-6 animate-pulse" />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 block group-hover:text-[#007E8A] transition-colors uppercase tracking-wider">
                            🚀 Quick Start
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Shortcut Way</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-2.5 max-w-[200px]">
                            Bypass all forms! Preconfigure custom Delhi & Hinglish defaults in one tap.
                          </p>
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-[#007E8A] uppercase tracking-wider bg-[#007E8A]/10 px-3 py-1 sm:py-1.5 rounded-full group-hover:bg-[#007E8A] group-hover:text-white transition-all mt-3">
                          Instant Launch →
                        </div>
                      </button>
                    </div>

                    <div className="text-center pt-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                        Offline Fallbacks and active rules verified
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Step 2: Personalized customization form view */
                  <div className="flex-1 flex flex-col overflow-hidden" id="onboarding-detailed-pane">
                    {/* Back Button and Path Indicator */}
                    <div className="px-4 sm:px-6 pt-4 flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setOnboardingView("options")}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#007E8A] transition-colors cursor-pointer"
                        id="btn-onboarding-back"
                      >
                        <span>← Back to options</span>
                      </button>
                    </div>

                    {/* Location Detection Feedback Bar */}
                    <div className="bg-slate-50 border-y border-slate-100 p-3 sm:p-4 mt-3 shrink-0">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-slate-200 rounded-lg text-slate-600 shrink-0">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-bounce" />
                        </div>
                        <div className="flex-1 text-[11px] sm:text-xs">
                          {geolocationState === "loading" && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[#007E8A] font-semibold">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>{t.detecting}</span>
                            </div>
                          )}
                          {geolocationState === "detected" && (
                            <div className="text-slate-700 leading-tight">
                              <span className="font-bold text-green-600">✓ Location synchronized!</span>
                              <p className="mt-0.5 text-slate-500">
                                {t.detected} <strong className="text-slate-800">{detectedRegion}</strong> {t.andLanguage} <strong className="text-slate-800">{detectedLanguage}</strong>.
                              </p>
                            </div>
                          )}
                          {geolocationState === "error" && (
                            <span className="text-amber-600 font-bold leading-normal block">
                              ⚠️ Geolocation default system loaded: Delhi NCR / Hinglish script configured!
                            </span>
                          )}
                          {geolocationState === "idle" && (
                            <span className="text-slate-500">Initializing regional services...</span>
                          )}
                        </div>
                        {geolocationState === "detected" && (
                          <button
                            type="button"
                            onClick={() => setShowLanguageModal(true)}
                            className="px-2 py-1 sm:px-3 sm:py-1.5 border border-slate-200 hover:border-[#007E8A] hover:bg-white text-[9px] sm:text-[10px] uppercase font-bold rounded-md bg-transparent text-[#007E8A] transition shadow-xs cursor-pointer"
                          >
                            {t.change}
                          </button>
                        )}
                      </div>
                    </div>

                    <form onSubmit={handleOnboardingSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
                      {/* Returning User Option inside Input Details */}
                      {hasSavedProfile && (
                        <div className="bg-emerald-50 border border-emerald-200 p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-3 text-left animate-none shrink-0" id="returning-user-continue">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span>Returning User Found!</span>
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 leading-normal truncate">
                              Last used profile: <strong className="text-[#007E8A]">{profile.name || "Teacher Saathi"}</strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsOnboarded(true);
                              safeStorage.setItem("labhya_onboarded", "true");
                              logAnalytics("ONBOARDING_CONTINUE_SAVED", { name: profile.name });
                            }}
                            className="px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm shrink-0 cursor-pointer"
                          >
                            Continue Where You Left Off →
                          </button>
                        </div>
                      )}

                      <div className="bg-cyan-50/50 p-3 sm:p-4 rounded-xl border border-teal-100/70 flex gap-2.5 sm:gap-3 shrink-0">
                        <HeartHandshake className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#007E8A] shrink-0 mt-0.5" />
                        <div className="text-[11px] sm:text-xs text-slate-700">
                          <span className="font-bold block">Hello! I am your companion, {mentor.name}.</span>
                          <p className="mt-0.5 sm:mt-1 text-slate-600 font-sans italic">{mentor.background}</p>
                        </div>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 border-l-2 border-[#007E8A] pl-2 uppercase tracking-wide flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{t.onboardingTitle}</span>
                        {(hasSavedProfile || hasSavedSession) && (
                          <button
                            type="button"
                            onClick={handleContinuePreviousSession}
                            className="text-[10px] sm:text-xs font-semibold text-[#007E8A] hover:text-[#006670] hover:underline normal-case tracking-normal cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition inline-flex items-center gap-1 shrink-0"
                          >
                             <span>
                               {language === "Hindi" ? "या पुराना सत्र जारी रखें" :
                                language === "Hinglish" ? "or continue your previous session" :
                                language === "Bengali" ? "অথবা আপনার আগের সেশন চালিয়ে যান" :
                                language === "Gujarati" ? "અથવા તમારું પાછલું સત્ર ચાલુ રાખો" :
                                "or continue your previous session"}
                             </span>
                             <span>→</span>
                          </button>
                        )}
                      </h4>

                      {/* Input Fields Grouped Together */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {/* Auto-continue lookup switch */}
                        <div className="md:col-span-2 bg-slate-50 border border-slate-200/60 p-3 flex items-center justify-between gap-3 text-left rounded-xl" id="chat-continuation-toggle-pane">
                          <div>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                              <MessageSquare className="h-4 w-4 text-[#007E8A]" />
                              <span>Auto-Continue Previous Chat / पुराना चैट जारी रखें</span>
                            </span>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal mt-0.5 max-w-sm sm:max-w-md">
                              Search background records database when filling your details to instantly restore your previous conversation history.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !continuePreviousChat;
                              setContinuePreviousChat(nextVal);
                              logAnalytics("ONBOARDING_TOGGLE_CHAT_CONTINUATION", { isEnabled: nextVal });
                            }}
                            className={`relative inline-flex h-6 w-11 mt-1 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              continuePreviousChat ? 'bg-[#007E8A]' : 'bg-slate-300'
                            }`}
                            id="toggle-chat-lookup"
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                continuePreviousChat ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                        {/* Name Input */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                            {t.name} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                            <input
                              type="text"
                              required
                              value={profile.name}
                              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                              placeholder={t.namePlaceholder}
                              className="w-full pl-9 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#007E8A] focus:bg-white transition-colors"
                            />
                          </div>

                          {/* Real-time server look up match suggestion */}
                          {matchedTeacher && (
                            <div className="mt-3 bg-teal-50 border border-[#007E8A]/30 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left animate-none" id="returning-user-match-instant">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                                  <Sparkles className="h-4 w-4 text-[#007E8A] animate-pulse" />
                                  <span>Server Profile Found! / शिक्षक प्रोफ़ाइल मिली!</span>
                                </p>
                                <p className="text-[11px] text-slate-600 mt-1 max-w-lg leading-relaxed">
                                  We found a registered profile for <strong className="text-[#007E8A]">{matchedTeacher.name}</strong> from our database ({matchedTeacher.gradeClass || "primary"}).
                                  {matchedSession && ` We also found your previous conversational session (${matchedSession.messages?.length || 0} messages).`}
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end mt-1 sm:mt-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    // 1. Restore entire profile state
                                    const restored = {
                                      ...profile,
                                      id: matchedTeacher.id,
                                      name: matchedTeacher.name,
                                      gradeClass: matchedTeacher.gradeClass || profile.gradeClass,
                                      experience: matchedTeacher.experience || profile.experience,
                                      region: matchedTeacher.region || profile.region,
                                      language: matchedTeacher.language || profile.language,
                                      phone: matchedTeacher.phone || profile.phone,
                                      email: matchedTeacher.email || profile.email,
                                      address: matchedTeacher.address || profile.address,
                                      fontSize: matchedTeacher.fontSize || profile.fontSize || "medium"
                                    };
                                    setProfile(restored);
                                    safeStorage.setItem("labhya_profile", JSON.stringify(restored));
                                    safeStorage.setItem("labhya_onboarded", "true");

                                    // 2. Restore previous session chat
                                    if (matchedSession) {
                                      setMessages(matchedSession.messages || []);
                                      if (matchedSession.currentTopic) setCurrentTopic(matchedSession.currentTopic);
                                      if (matchedSession.language) setLanguage(matchedSession.language);
                                      if (matchedSession.timeTakenSeconds) setSessionDuration(matchedSession.timeTakenSeconds);
                                      if (matchedSession.sessionId) {
                                        setSessionId(matchedSession.sessionId);
                                        safeStorage.setItem("labhya_session_id", matchedSession.sessionId);
                                      }
                                      
                                      const mockGroup = {
                                        sessionId: matchedSession.sessionId,
                                        teacherId: restored.phone || restored.email || restored.name || "Guest",
                                        teacherName: restored.name,
                                        messages: matchedSession.messages,
                                        currentTopic: matchedSession.currentTopic,
                                        language: matchedSession.language,
                                        startTime: matchedSession.startTime || new Date().toISOString(),
                                        durationSeconds: matchedSession.timeTakenSeconds
                                      };
                                      safeStorage.setItem("labhya_chat_session", JSON.stringify(mockGroup));
                                      setHasSavedSession(true);
                                    } else {
                                      // clear chat if no session
                                      const newId = "sess_" + Date.now().toString(36);
                                      setSessionId(newId);
                                      safeStorage.setItem("labhya_session_id", newId);
                                      safeStorage.setItem("labhya_session_start_time", new Date().toISOString());
                                      setSessionDuration(0);
                                      setMessages([]);
                                    }

                                    setIsOnboarded(true);
                                    resetIdleTimer();
                                    logAnalytics("RESTORED_PREVIOUS_SESSION_ON_BLUR_MATCH", { name: matchedTeacher.name });
                                  }}
                                  className="px-3 py-1.5 bg-[#007E8A] hover:bg-[#006670] active:scale-95 text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                                >
                                  {matchedSession ? "Continue Previous Chat" : "Continue Profile"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProfile({ ...profile, name: "" });
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-lg transition cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Experience Dropdown - min typing */}
                        <div>
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                            {t.experience}
                          </label>
                          <div className="relative">
                            <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                            <select
                              value={profile.experience}
                              onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                              className="w-full pl-9 pr-8 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm appearance-none focus:outline-none focus:border-[#007E8A] focus:bg-white transition-colors animate-none"
                            >
                              <option value="Beginner (0-2 years)">0-2 Years</option>
                              <option value="Intermediate (3-5 years)">3-5 Years</option>
                              <option value="Experienced (5-10 years)">5-10 Years</option>
                              <option value="Veteran (10+ years)">10+ Years</option>
                            </select>
                          </div>
                        </div>

                        {/* Class/Grade Multi Choice Selection */}
                        <div>
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                            {t.classTaught}
                          </label>
                          <div className="relative">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                            <select
                              value={profile.gradeClass}
                              onChange={(e) => setProfile({ ...profile, gradeClass: e.target.value })}
                              required
                              className="w-full pl-9 pr-8 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm appearance-none focus:outline-none focus:border-[#007E8A] focus:bg-white transition-colors"
                            >
                              <option value="">-- Choose level --</option>
                              <option value="Early Childhood / Primary (Grades 1-5)">Early / Primary (Grades 1-5)</option>
                              <option value="Middle School (Grades 6-8)">Middle School (Grades 6-8)</option>
                              <option value="High School (Grades 9-12)">High School (Grades 9-12)</option>
                            </select>
                          </div>
                        </div>

                        {/* Phone Number (Optional) */}
                        <div>
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                            {t.phone}
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                            <input
                              type="tel"
                              value={profile.phone}
                              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                              placeholder="e.g. 9876543210"
                              className="w-full pl-9 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#007E8A] focus:bg-white transition-colors"
                            />
                          </div>
                        </div>

                        {/* Email Address (Prefilled automatically) */}
                        <div>
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                            {t.email || "Email Address"}
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                            <input
                              type="email"
                              value={profile.email}
                              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                              placeholder="e.g. email@domain.com"
                              className="w-full pl-9 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#007E8A] focus:bg-white transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Confirmation and Submit button */}
                      <div className="pt-3.5 sm:pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3.5 sm:gap-4 shrink-0">
                        <span className="text-[10px] sm:text-[11px] text-slate-500 italic flex items-center gap-1.5 leading-tight">
                          <Globe className="h-3.5 w-3.5 text-[#007E8A] shrink-0" />
                          Profile automatically recorded for analytics and customized guidance.
                        </span>
                        <button
                          type="submit"
                          className="w-full md:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-[#007E8A] hover:bg-[#006670] hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 font-display cursor-pointer"
                        >
                          <span>{t.submit}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            ) :

            /* STAGE C: COMPREHENSIVE SOLUTION CHAT ECOSYSTEM */
            (
              <motion.div
                key="chat-stage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-white flex flex-col overflow-hidden rounded-none border-0 shadow-none sm:rounded-2xl sm:border sm:border-slate-200/80 sm:shadow-lg"
                id="chat-workspace"
              >
                
                {/* Chat Header Widget */}
                <div className="bg-slate-900 text-white px-3 sm:px-5 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Brand Calligraphy Logo */}
                    <div className="bg-white px-2 py-1 rounded-lg shrink-0 border border-slate-800 shadow-xs flex items-center justify-center">
                      <img
                        src="/src/assets/images/labhya_final_logo_1779937435047.png"
                        alt="Labhya Logo"
                        className="h-6 w-auto object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="h-6 w-[1px] bg-slate-700 shrink-0" />
                    <div className="relative shrink-0">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 bg-slate-750 border border-slate-600 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm text-[#FED766] overflow-hidden">
                        {mentor.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 h-2 w-2 sm:h-2.5 sm:w-2.5 bg-green-500 border-2 border-slate-900 rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold font-display text-xs sm:text-sm flex items-center gap-1 text-white">
                        <span className="truncate">{mentor.name}</span>
                        <span className="hidden sm:inline text-[9px] bg-[#007E8A]/30 text-[#007E8A] px-1.5 py-0.5 rounded-full border border-[#007E8A]/40 font-sans">
                          Active
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-slate-400 font-sans max-w-[120px] sm:max-w-sm leading-tight truncate">
                        {mentor.background}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0 select-none justify-end">
                    <button
                      onClick={() => setShowLanguageModal(true)}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white h-8 sm:h-9 px-2 sm:px-2.5 rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      title="Change Language"
                    >
                      <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#FED766] shrink-0" />
                      <span>{language}</span>
                    </button>

                    <button
                      onClick={handleDownloadSummaryPDF}
                      className="bg-slate-800 hover:bg-[#007E8A] text-[#FED766] hover:text-white h-8 sm:h-9 px-2 sm:px-2.5 rounded-md text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-slate-700/60"
                      title="Download PDF Summary"
                    >
                      <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                      <span>Export PDF</span>
                    </button>

                    <button
                      onClick={handleEscalateToHuman}
                      className="bg-slate-800 hover:bg-[#FF4B91]/90 hover:text-white text-[#FF4B91] h-8 sm:h-9 px-2 sm:px-2.5 rounded-md text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-[#FF4B91]/25"
                      title="Escalate Session"
                    >
                      <HeartHandshake className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                      <span>Escalate</span>
                    </button>

                    <button
                      onClick={handleManualEndChat}
                      className="bg-slate-800 hover:bg-red-650 hover:text-white text-red-400 h-8 sm:h-9 px-2 sm:px-2.5 rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-700"
                      title="End Chat"
                    >
                      <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-550 shrink-0" />
                      <span>End</span>
                    </button>
                  </div>
                </div>

                {/* Font Size Selector Sub-Bar */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2 max-w-full overflow-hidden select-none">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">
                      Active: {mentor.name} ({profile.gradeClass || "General"})
                    </span>
                  </div>
                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 select-none">Text size:</span>
                    <div className="inline-flex rounded-md p-0.5 bg-slate-150 border border-slate-200" role="group">
                      <button
                        onClick={() => handleFontSizeChange("small")}
                        className={`h-6 px-2.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          fontSize === "small"
                            ? "bg-[#007E8A] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200/60"
                        }`}
                        title="Small Text Display"
                      >
                        A<span className="text-[8px] font-normal align-super">S</span>
                      </button>
                      <button
                        onClick={() => handleFontSizeChange("medium")}
                        className={`h-6 px-2.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          fontSize === "medium"
                            ? "bg-[#007E8A] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200/60"
                        }`}
                        title="Medium Text Display"
                      >
                        A<span className="text-[8px] font-normal align-super">M</span>
                      </button>
                      <button
                        onClick={() => handleFontSizeChange("large")}
                        className={`h-6 px-1.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          fontSize === "large"
                            ? "bg-[#007E8A] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200/60"
                        }`}
                        title="Large Text Display"
                      >
                        A<span className="text-[8px] font-normal align-super">L</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conversation Message Stream */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" id="chat-messages-scroll">
                  {messages.map((m) => {
                    if (m.sender === "system") {
                      return (
                        <div key={m.id} className="flex justify-center my-1.5">
                          <span className="bg-slate-100 border border-slate-200 text-xs text-slate-500 font-mono font-bold px-3 py-1 rounded-full text-center">
                            {m.text}
                          </span>
                        </div>
                      );
                    }

                    const isUser = m.sender === "user";
                    const truncatedText = m.isLong && !expandedMessages[m.id]
                      ? m.text.slice(0, 360)
                      : m.text;

                    return (
                      <div key={m.id} className={`flex gap-3 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        {!isUser && (
                          <div className="h-8 w-8 bg-[#1C3144] shrink-0 rounded-full flex items-center justify-center font-bold text-xs text-[#FED766]">
                            {mentor.name.charAt(0)}
                          </div>
                        )}

                        {/* Content Container */}
                        <div className="space-y-1">
                          <div className={`rounded-2xl p-4 shadow-xs text-sm leading-relaxed ${
                            isUser 
                              ? 'bg-[#1C3144] text-white rounded-tr-none' 
                              : 'bg-slate-50 border border-slate-200/85 text-slate-800 rounded-tl-none'
                          }`}>
                            
                            {/* Truncated read more section logic */}
                            <div className={`whitespace-pre-line ${
                              fontSize === "small"
                                ? "text-[11px]"
                                : fontSize === "large"
                                ? "text-sm sm:text-base font-medium"
                                : "text-xs sm:text-sm"
                            }`}>
                              {truncatedText}
                              
                              {m.isLong && (
                                <button
                                  onClick={() => toggleExpanded(m.id)}
                                  className="text-[#007E8A] hover:underline font-bold ml-1 text-xs uppercase cursor-pointer"
                                >
                                  {expandedMessages[m.id] ? ` [${t.less}]` : `.... [${t.more}]`}
                                </button>
                              )}
                            </div>

                            {/* Render Solutions Layout: If bot and has deep response, display customizable elements */}
                            {!isUser && m.id !== "init_bot" && expandedMessages[m.id] && (
                              <div className="mt-2 pt-2 border-t border-slate-200 space-y-2 text-[11px]">
                                
                                {/* 🟦 Actionable Teacher Hack Box */}
                                <div className="p-2.5 bg-[#E3F2FD] border-l-4 border-[#007E8A] rounded-r-lg" id="teacher-hack-box">
                                  <span className="font-bold uppercase tracking-wider text-[#007E8A] flex items-center gap-1 mb-0.5">
                                    <span className="inline-block h-3.5 w-3.5 bg-[#007E8A] rounded-xs text-white text-[9px] font-mono leading-none text-center">T</span>
                                    Teacher Hack Routine
                                  </span>
                                  <p className="text-slate-700 italic">
                                    "Aap is kriya ko aane wale Monday se primary focus period me repeat karein."
                                  </p>
                                </div>

                                {/* Dynamic text-based 'Power Keywords' buttons */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                                    Power Inquiry Suggestions
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {WELLBEING_TOPICS.find(w => m.topic?.includes(w.id))?.powerKeywords.map((pw, i) => (
                                      <button
                                        key={i}
                                        onClick={() => handleKeywordQuery(pw)}
                                        className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-[#007E8A] hover:text-white border border-slate-200 rounded-full text-slate-600 transition cursor-pointer"
                                      >
                                        ✨ {pw}
                                      </button>
                                    )) || (
                                      ["Try Morning Circle Routine", "Mindful Breathing Exercise"].map((pw, i) => (
                                        <button
                                          key={i}
                                          onClick={() => handleKeywordQuery(pw)}
                                          className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-[#007E8A] hover:text-white border border-slate-200 rounded-full text-slate-600 transition cursor-pointer"
                                        >
                                          ✨ {pw}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* References list */}
                                <div className="text-[9px] text-slate-400 font-sans border-t border-slate-150 pt-1">
                                  <span className="font-bold">References:</span>
                                    {WELLBEING_TOPICS.find(w => m.topic?.includes(w.id))?.sources.map((src, i) => (
                                      <span key={i} className="block mt-0.5">• {src}</span>
                                    )) || (
                                      <span className="block mt-0.5">• National Education Policy (NEP) 2020 guidelines</span>
                                    )}
                                </div>
                              </div>
                            )}

                          </div>
                          
                          {/* Timestamp & Read Aloud Option */}
                          <div className={`flex items-center gap-3 text-[10px] text-slate-400 px-1 mt-1 ${isUser ? 'justify-end' : 'justify-between'}`}>
                            <span>{m.timestamp}</span>
                            <button
                              onClick={() => speakText(m.text, m.id)}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition cursor-pointer text-[10px] font-bold ${
                                isUser
                                  ? 'bg-transparent hover:bg-white/10 text-white/80 hover:text-white'
                                  : 'bg-[#007E8A]/5 hover:bg-[#007E8A]/10 text-[#007E8A]'
                              }`}
                              title="Read this message aloud"
                            >
                              {activeSpeechId === m.id ? (
                                <>
                                  <VolumeX className="h-3 w-3 animate-pulse text-amber-500" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3 w-3" />
                                  <span>Read Aloud</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* AI Loader Bubble */}
                  {isAiLoading && (
                    <div className="flex gap-3 max-w-lg">
                      <div className="h-8 w-8 bg-[#1C3144] shrink-0 rounded-full flex items-center justify-center font-bold text-xs text-[#FED766] animate-pulse">
                        {mentor.name.charAt(0)}
                      </div>
                      <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none text-xs flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-[#007E8A] animate-spin" />
                        <span>Thinking deeply using structural knowledge base...</span>
                      </div>
                    </div>
                  )}

                  {/* Unified Suggested Prompts & Topics area in continuous scroll stream */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 mt-2 shadow-xs select-none">
                    <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-[#007E8A] animate-pulse" />
                      <span>Suggested Prompts & Topics</span>
                    </div>
                    
                    {/* Focus Topics rendered as compact buttons wrapping naturally */}
                    <div className="flex flex-wrap gap-1">
                      {chatTopics.map((topic, index) => (
                        <button
                          key={topic.id}
                          onClick={() => {
                            logAnalytics("SINGLE_TOPIC_BUTTON_CLICKED", { topic: topic.id });
                            setCurrentTopic(topic.id);
                          }}
                          className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition cursor-pointer border ${
                            currentTopic.toLowerCase() === topic.id.toLowerCase()
                              ? 'bg-teal-50 border-[#007E8A] text-[#007E8A] shadow-xs'
                              : 'bg-white hover:bg-teal-50 border-slate-200 hover:border-[#007E8A] text-slate-700 hover:text-[#007E8A]'
                          }`}
                          id={`topic-btn-${index}`}
                        >
                          {topic.label}
                        </button>
                      ))}
                    </div>

                    {/* Highly descriptive support instructions about multi-number selection */}
                    <div className="text-[10px] text-slate-500 bg-slate-100/80 rounded-lg p-2 border border-slate-200/60 leading-relaxed font-sans select-none">
                      <span className="font-bold text-[#007E8A] mr-1">💡 Pro Tip:</span>
                      <span>You can select multiple topics at once! Type their numbers (e.g. <strong>"1, 3"</strong> or <strong>"2 4"</strong>) in the chat below to trigger a comprehensive study session combining those items.</span>
                    </div>

                    {/* Dynamic suggested prompts buttons wrapping completely with no inner scrollbar */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(dynamicSuggestions[currentTopic.toLowerCase()] || dynamicSuggestions["general"] || []).map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            logAnalytics("CONTEXTUAL_SUGGESTION_CLICKED", { suggestion, topic: currentTopic });
                            sendChatMessage(suggestion, currentTopic);
                          }}
                          className="px-2 py-1 bg-white hover:bg-teal-50 border border-slate-200 hover:border-[#007E8A] rounded-md text-[10px] sm:text-[11px] font-medium text-slate-700 hover:text-[#007E8A] transition cursor-pointer text-left"
                        >
                          💬 {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div ref={listEndRef} />
                </div>

                {/* BOTTOM COMPONENT FOR EVERY TURN: PERSISTENT COMPACT INPUT PANEL */}
                <div className="bg-slate-50 border-t border-slate-200 p-2 sm:p-3 select-none shrink-0">
                  {/* Operational prompt footer trigger */}
                  <div className="w-full">
                    {/* Persistent Text Prompt Field */}
                    <div className="flex gap-2">
                       <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                          resetIdleTimer();
                          setInputValue(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            sendChatMessage(inputValue);
                          }
                        }}
                        placeholder={t.placeholderChat}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#007E8A] focus:bg-white transition"
                      />
                      {inputValue.trim() && (
                        <button
                          onClick={() => speakText(inputValue, "typed_prompt")}
                          className={`p-2 sm:p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 border ${
                            activeSpeechId === "typed_prompt"
                              ? 'bg-amber-50 text-amber-600 border-amber-300 animate-pulse'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Read your typed prompt aloud"
                        >
                          {activeSpeechId === "typed_prompt" ? (
                            <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          )}
                        </button>
                      )}
                      <button
                        id="submit-chat-query"
                        onClick={() => sendChatMessage(inputValue)}
                        disabled={!inputValue.trim()}
                        className="p-2 sm:p-2.5 bg-[#1C3144] hover:bg-[#253e55] disabled:opacity-40 text-white rounded-xl transition shrink-0 flex items-center justify-center"
                      >
                        <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </main>

      {/* LANGUAGE/REGION CONFIGURATION MODAL */}
      <AnimatePresence>
        {showLanguageModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full border border-slate-200"
              id="language-config-modal"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#007E8A]" />
                  {t.changeLangTitle}
                </h3>
                <button
                  onClick={() => setShowLanguageModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Geographic Region override */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Region (Manual override)
                  </label>
                  <input
                    type="text"
                    value={profile.region}
                    onChange={(e) => setProfile({ ...profile, region: e.target.value })}
                    placeholder="e.g., Gujarat, Delhi, Bengal"
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-sm focus:outline-none focus:border-[#007E8A]"
                  />
                </div>

                {/* Spoken script languages */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Spoken Script Language
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["English", "Hindi", "Bengali", "Gujarati", "Hinglish"].map((langOpt) => (
                      <button
                        key={langOpt}
                        onClick={() => handleLanguageChange(langOpt)}
                        className={`p-2.5 rounded-lg border text-xs font-semibold text-left flex items-center justify-between transition-colors ${
                          language === langOpt
                            ? 'bg-teal-50 border-[#007E8A] text-[#007E8A]'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{langOpt}</span>
                        {language === langOpt && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowLanguageModal(false)}
                  className="w-full py-2.5 bg-[#1C3144] hover:bg-[#253e55] text-white font-bold rounded-lg text-xs uppercase"
                >
                  Confirm Configurations
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic admin workspace analytics console */}
      {!isOnboarded && <AdminAnalytics currentUserEmail={profile.email} />}

      {/* Footer layout indicator */}
      <footer className="hidden sm:flex py-4 text-center text-[10px] font-mono text-slate-400 select-none border-t border-slate-100 items-center justify-center gap-4">
        <span>© 2026 Labhya Foundation. All Rights Reserved.</span>
        <span>•</span>
        <span>Registered on Server db: backend_google_file.json</span>
      </footer>

    </div>
  );
}
