'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, Loader2, User, X, Camera,
  MessageCircle, Languages, Book, Keyboard, Send, ArrowRightLeft
} from 'lucide-react';

type Mode = 'conversation' | 'translator' | 'dictionary';
type TutorLang = 'hindi' | 'english';

export default function Home() {
  const [username, setUsername] = useState("Arjun");
  const [age, setAge] = useState(18);
  const [tutorLang, setTutorLang] = useState<TutorLang>('hindi');
  const [mode, setMode] = useState<Mode>('conversation');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");

  const [transcript, setTranscript] = useState("");
  const [responseEn, setResponseEn] = useState("");
  const [responseHi, setResponseHi] = useState("");
  const [showEnglishInCard, setShowEnglishInCard] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestState = useRef({ username, age, mode, tutorLang, selectedImage });

  useEffect(() => {
    latestState.current = { username, age, mode, tutorLang, selectedImage };
  }, [username, age, mode, tutorLang, selectedImage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'hi-IN';
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          const current = latestState.current;
          handleAISubmission(text, current.selectedImage, current.username, current.age, current.mode, current.tutorLang);
        };
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setTranscript("Image attached.");
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const speakText = (text: string, langCode: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const currentAge = latestState.current.age;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = currentAge <= 12 ? 0.8 : 1.0;

    const voices = synthRef.current.getVoices();
    const bestVoice = voices.find(v => v.lang.includes(langCode.split('-')[0]) && v.name.includes('Google'));
    if (bestVoice) utterance.voice = bestVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const handleAISubmission = async (text: string, img: string | null, user: string, userAge: number, activeMode: Mode, lang: TutorLang) => {
    setIsThinking(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, username: user, age: userAge, mode: activeMode, tutorLang: lang, image: img }),
      });

      const data = await res.json();
      if (data.english) {
        setResponseEn(data.english);
        setResponseHi(data.hindi);

        const isHindiTutor = lang === 'hindi';
        setShowEnglishInCard(!isHindiTutor);
        if (isHindiTutor) {
          speakText(data.hindi, 'hi-IN');
        } else {
          speakText(data.english, 'en-US');
        }

        if (img) clearImage();
        setTextInput("");
        setShowTextInput(false);
      }
    } catch (err) {
      console.error(err);
      setResponseEn("Error.");
      setResponseHi("Error.");
    } finally {
      setIsThinking(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("Use Chrome browser.");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (synthRef.current) synthRef.current.cancel();
      recognitionRef.current.lang = tutorLang === 'hindi' ? 'hi-IN' : 'en-US';
      setTranscript("");
      recognitionRef.current.start();
    }
  };

  const submitText = () => {
    if (!textInput.trim()) return;
    setTranscript(textInput);
    handleAISubmission(textInput, selectedImage, username, age, mode, tutorLang);
  };

  const bgColor = tutorLang === 'hindi' ? 'bg-orange-500' : 'bg-blue-600';
  const textColor = tutorLang === 'hindi' ? 'text-orange-400' : 'text-blue-400';
  const borderColor = tutorLang === 'hindi' ? 'border-orange-500' : 'border-blue-500';

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-950 text-white p-4 relative overflow-hidden font-sans">

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${tutorLang === 'hindi' ? 'bg-orange-600/10' : 'bg-blue-600/10'}`} />

      <div className="z-30 w-full max-w-md flex justify-between items-center mb-4 pt-2">
        <h1 className="text-xl font-bold tracking-tight">Linguist AI</h1>
        <button
          onClick={() => {
            setTutorLang(prev => prev === 'hindi' ? 'english' : 'hindi');
            setResponseEn(""); setResponseHi(""); clearImage();
          }}
          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${bgColor} text-white shadow-lg`}
        >
          {tutorLang === 'hindi' ? ' Hindi Tutor' : ' English (Tamil)'}
        </button>
      </div>

      <div className="z-20 w-full max-w-md bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col w-1/2">
            <label className="text-xs text-gray-400 uppercase font-bold flex items-center gap-1"><User className="w-3 h-3" /> Student</label>
            <select
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="bg-gray-800 text-white mt-1 text-sm font-semibold rounded p-1 outline-none border border-gray-700 w-[90%]"
            >
              <option value="Arjun">Arjun</option>
              <option value="Karunya">Karunya</option>
              <option value="Tamil Elakkiyam">Tamil Elakkiyam</option>
            </select>
          </div>
          <div className="flex flex-col w-1/2 pl-4">
            <div className="flex justify-between text-xs text-gray-400 font-bold mb-1"><span>AGE</span><span className={textColor}>{age} Years</span></div>
            <input type="range" min="5" max="60" value={age} onChange={(e) => setAge(parseInt(e.target.value))} className={`h-1.5 rounded-lg appearance-none cursor-pointer ${tutorLang === 'hindi' ? 'accent-orange-500' : 'accent-blue-500'} bg-gray-700`} />
          </div>
        </div>
      </div>

      <div className="z-20 w-full max-w-md flex bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
        {[
          { id: 'conversation', icon: MessageCircle, label: 'Chat' },
          { id: 'translator', icon: Languages, label: 'Translate' },
          { id: 'dictionary', icon: Book, label: 'Meaning' }
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as Mode)}
            className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-all ${mode === m.id ? 'bg-gray-800 text-white shadow ring-1 ring-white/10' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <m.icon className="w-4 h-4" /> {m.label}
          </button>
        ))}
      </div>

      {selectedImage && (
        <div className="z-20 w-full max-w-md bg-gray-800 rounded-xl p-2 mb-4 relative border border-gray-700">
          <button onClick={clearImage} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-md"><X className="w-4 h-4 text-white" /></button>
          <div className="flex gap-3 items-center">
            <img src={selectedImage} alt="Upload" className="w-16 h-16 object-cover rounded-lg border border-gray-600" />
            <div className="text-sm text-gray-300">
              <p className="font-bold text-white">Image attached</p>
              <p className="text-xs text-gray-400">Ready to analyze in English & Hindi.</p>
            </div>
          </div>
        </div>
      )}

      <div className="z-10 w-full max-w-md flex flex-col items-center gap-6">

        {!showTextInput ? (
          <div className="flex items-center justify-center gap-6">
            <div className="relative group">
              <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" onChange={handleImageUpload} ref={fileInputRef} />
              <button className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg"><Camera className="w-6 h-6 text-gray-300" /></button>
            </div>

            <div className="relative">
              {isListening && <div className={`absolute inset-0 rounded-full border-4 animate-ping opacity-75 ${borderColor}`}></div>}
              <button onClick={toggleListening} className={`w-24 h-24 rounded-full flex items-center justify-center transition-transform shadow-2xl border-4 ${isListening ? 'bg-red-500 border-red-400 scale-110' : isThinking ? 'bg-white border-gray-200 animate-pulse' : `bg-gray-800 ${borderColor}`}`}>
                {isThinking ? <Loader2 className="w-8 h-8 animate-spin text-black" /> : isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className={`w-8 h-8 ${textColor}`} />}
              </button>
            </div>

            <button onClick={() => setShowTextInput(true)} className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg">
              <Keyboard className="w-6 h-6 text-gray-300" />
            </button>
          </div>
        ) : (
          <div className="w-full flex gap-2 items-center animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setShowTextInput(false)} className="p-3 rounded-full bg-gray-800 text-gray-400"><X className="w-5 h-5" /></button>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={selectedImage ? "Ask about the image..." : "Type here..."}
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-full px-6 py-3 outline-none focus:border-white transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && submitText()}
            />
            <button onClick={submitText} className={`p-3 rounded-full ${bgColor} text-white`}>
              {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        )}

        {responseEn && (
          <div className="w-full animate-in zoom-in-50 duration-300 pb-12">
            <div className={`relative p-6 rounded-2xl border shadow-lg backdrop-blur-sm ${tutorLang === 'hindi' ? 'bg-orange-950/40 border-orange-500/30' : 'bg-blue-950/40 border-blue-500/30'}`}>

              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold uppercase ${textColor}`}>AI Explanation</span>

                <div className="flex gap-3">
                  <button
                    onClick={() => speakText(showEnglishInCard ? responseEn : responseHi, showEnglishInCard ? 'en-US' : 'hi-IN')}
                    className="p-1 hover:bg-white/10 rounded-full"
                  >
                    <Volume2 className={`w-5 h-5 ${isSpeaking ? 'text-green-400 animate-pulse' : 'text-gray-400'}`} />
                  </button>
                  {/* THE TOGGLE BUTTON - Only show if Hindi response exists */}
                  {responseHi && (
                    <button
                      onClick={() => setShowEnglishInCard(!showEnglishInCard)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs font-bold hover:bg-gray-700 transition-colors"
                    >
                      <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                      {showEnglishInCard ? "Show Hindi" : "Show English"}
                    </button>
                  )}
                </div>
              </div>

              <div className="min-h-[60px]">
                <p className={`text-lg font-medium leading-relaxed transition-opacity duration-300 ${showEnglishInCard ? 'text-blue-100' : 'text-orange-100'}`}>
                  {showEnglishInCard ? responseEn : responseHi}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex justify-between text-xs text-gray-500">
                <span>Currently viewing: <span className="text-white">{showEnglishInCard ? "English" : "Hindi"}</span></span>
              </div>

            </div>
          </div>
        )}
      </div>
    </main>
  );
}