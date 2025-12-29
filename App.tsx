
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Difficulty, ColumnData, Question, AbacusStep 
} from './types';
import { 
  getInitialAbacus, valueToState, stateToValue, 
  calculateTotal, generateSteps, COLUMNS 
} from './utils/abacusLogic';
import AbacusColumn from './components/AbacusColumn';
import ControlPanel from './components/ControlPanel';
import { getAiTip } from './services/geminiService';
import { generateGeminiSpeech, decodeAudioData } from './services/ttsService';

const App: React.FC = () => {
  const [columns, setColumns] = useState<ColumnData[]>(getInitialAbacus());
  const [question, setQuestion] = useState<Question | null>(null);
  const [teachingSteps, setTeachingSteps] = useState<AbacusStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [resultMsg, setResultMsg] = useState<{ text: string, type: 'success' | 'error' | 'ai' } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio for Gemini TTS
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const playGeminiAudio = async (text: string) => {
    const audioData = await generateGeminiSpeech(text);
    if (!audioData) return false;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const buffer = await decodeAudioData(new Uint8Array(audioData), ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    return true;
  };

  const speak = useCallback((text: string, forceNative = true) => {
    if (!window.speechSynthesis) return;

    // Fix for Chrome getting stuck
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang === 'zh-TW') || 
                            voices.find(v => v.lang.startsWith('zh-TW')) ||
                            voices.find(v => v.lang.startsWith('zh-HK')) ||
                            voices.find(v => v.lang.startsWith('zh'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }, 100);
  }, []);

  useEffect(() => {
    if (window.speechSynthesis) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) setVoicesReady(true);
      };
      window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
      updateVoices();
      return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    }
  }, []);

  const handleBeadClick = (colId: number, type: 'top' | 'bottom', beadIdx?: number) => {
    if (currentStepIdx !== -1) return;
    setColumns(prev => prev.map(col => {
      if (col.id !== colId) return col;
      const newState = { ...col.state };
      if (type === 'top') newState.top = !newState.top;
      else if (beadIdx !== undefined) {
        const isActive = newState.bottom[beadIdx];
        if (!isActive) newState.bottom = newState.bottom.map((_, i) => i <= beadIdx);
        else newState.bottom = newState.bottom.map((val, i) => i < beadIdx ? val : false);
      }
      return { ...col, state: newState, value: stateToValue(newState) };
    }));
    setResultMsg(null);
  };

  const handleNewTask = (diff: Difficulty) => {
    let n1 = 0, n2 = 0;
    let diffName = "";
    const op = Math.random() > 0.4 ? '+' : '-';
    switch(diff) {
      case Difficulty.UNIT: n1 = Math.floor(Math.random() * 9) + 1; n2 = Math.floor(Math.random() * 9) + 1; diffName = "個位數"; break;
      case Difficulty.TENS: n1 = Math.floor(Math.random() * 89) + 10; n2 = Math.floor(Math.random() * 89) + 10; diffName = "十位數"; break;
      case Difficulty.HUNDREDS: n1 = Math.floor(Math.random() * 899) + 100; n2 = Math.floor(Math.random() * 899) + 100; diffName = "百位數"; break;
      case Difficulty.THOUSANDS: n1 = Math.floor(Math.random() * 8999) + 1000; n2 = Math.floor(Math.random() * 8999) + 1000; diffName = "千位數"; break;
      case Difficulty.MIXED:
        const exp = Math.floor(Math.random() * 4) + 1;
        n1 = Math.floor(Math.random() * Math.pow(10, exp));
        n2 = Math.floor(Math.random() * Math.pow(10, exp));
        diffName = "隨機挑戰";
        break;
    }
    if (op === '-' && n1 < n2) [n1, n2] = [n2, n1];
    setQuestion({ n1, n2, op, target: op === '+' ? n1 + n2 : n1 - n2 });
    setColumns(getInitialAbacus());
    setTeachingSteps([]);
    setCurrentStepIdx(-1);
    setResultMsg(null);
    setIsAiLoading(false);
    speak(`好的，開始練習${diffName}。題目是：${n1} ${op === '+' ? '加' : '減'} ${n2}`);
  };

  const handleCheck = async () => {
    if (!question || isAiLoading) return;
    const currentVal = calculateTotal(columns);
    if (currentVal === question.target) {
      setResultMsg({ text: "🌟 太棒了！撥珠完全正確！", type: 'success' });
      speak("太棒了，撥珠完全正確");
    } else {
      const errorMsg = `❌ 哎呀，不對喔。撥出的值是 ${currentVal}，再試一次！`;
      setResultMsg({ text: errorMsg, type: 'error' });
      speak("不對喔，再檢查一下");
      try {
        setIsAiLoading(true);
        const tip = await getAiTip(`${question.n1} ${question.op} ${question.n2}`, currentVal, question.target);
        setResultMsg({ text: `${errorMsg}\n\n🤖 AI 老師建議：${tip}`, type: 'ai' });
        // Use Gemini TTS for AI Teacher Tip
        const played = await playGeminiAudio(tip);
        if (!played) speak(tip);
      } catch (err) {
        console.error(err);
      } finally {
        setIsAiLoading(false);
      }
    }
  };

  const handleTeach = () => {
    if (!question) return;
    const steps = generateSteps(question);
    setTeachingSteps(steps);
    setCurrentStepIdx(0);
    setColumns(getInitialAbacus());
    applyStep(steps[0]);
    setResultMsg(null);
    speak("進入演示教學模式，請跟著我一步步練習");
  };

  const applyStep = useCallback((step: AbacusStep) => {
    setColumns(step.snapshot);
    speak(step.speak);
  }, [speak]);

  const exitTeaching = useCallback(() => {
    setCurrentStepIdx(-1);
    setTeachingSteps([]);
    window.speechSynthesis.cancel();
    speak("已退出教學模式");
  }, [speak]);

  return (
    <div className="min-h-screen pb-20 pt-8 px-4 sm:px-10 bg-slate-50">
      <header className="text-center mb-8 relative max-w-5xl mx-auto">
        <div className="hidden sm:flex absolute top-0 right-0 items-center gap-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${voicesReady ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {voicesReady ? '🔊 語音就緒' : '⌛ 語音載入中'}
          </span>
          <button 
            onClick={() => speak("測試語音成功，請開始練習")}
            className="text-xs bg-stone-200 hover:bg-stone-300 px-2 py-1 rounded font-medium transition-colors"
          >
            🔊 測試語音
          </button>
        </div>
        <h1 className="text-5xl font-black text-stone-800 tracking-tight">
          珠心算專業教室 <span className="text-amber-600">Pro</span>
        </h1>
        <p className="text-stone-500 mt-2 font-medium">學習傳統智慧，啟發無限腦力</p>
      </header>

      <main className="max-w-5xl mx-auto bg-white p-4 sm:p-10 rounded-3xl shadow-xl border border-stone-100">
        <div className="mb-12">
          <ControlPanel 
            onNewTask={handleNewTask}
            onCheck={handleCheck}
            onTeach={handleTeach}
            onReset={() => {
              setColumns(getInitialAbacus());
              setResultMsg(null);
              exitTeaching();
              setIsAiLoading(false);
              speak("算盤已歸零清空");
            }}
            isTeaching={currentStepIdx !== -1}
            hasQuestion={!!question}
            isLoading={isAiLoading}
          />
        </div>

        <div className="text-center mb-10 h-28 flex flex-col justify-center border-b border-stone-100 pb-6">
          {question ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl text-stone-400 font-bold mb-1">當前題目</span>
              <span className="text-7xl font-black text-stone-800 animate-in fade-in zoom-in duration-300 tracking-wider">
                {question.n1} {question.op} {question.n2}
              </span>
            </div>
          ) : (
            <p className="text-2xl text-stone-400 font-bold italic">請選擇難度開始練習</p>
          )}
        </div>

        {currentStepIdx !== -1 && (
          <div className="mb-8 p-6 bg-amber-50 rounded-2xl border-2 border-amber-200 shadow-inner animate-in slide-in-from-top duration-300">
            <div className="flex flex-col items-center gap-4">
              <div className="text-2xl font-bold text-amber-900 bg-white px-8 py-3 rounded-full shadow-sm border border-amber-200">
                {teachingSteps[currentStepIdx].message}
              </div>
              {teachingSteps[currentStepIdx].formula && (
                <div className="px-6 py-2 bg-rose-500 text-white font-black rounded-xl text-xl uppercase tracking-widest shadow-lg animate-bounce">
                  口訣：{teachingSteps[currentStepIdx].formula}
                </div>
              )}
              <div className="flex gap-4">
                <button onClick={() => currentStepIdx > 0 && (setCurrentStepIdx(currentStepIdx-1), applyStep(teachingSteps[currentStepIdx-1]))} disabled={currentStepIdx === 0} className="px-8 py-3 bg-stone-700 hover:bg-stone-800 text-white rounded-xl disabled:opacity-30 transition-all font-bold">⬅️ 上一步</button>
                <button onClick={() => currentStepIdx < teachingSteps.length-1 && (setCurrentStepIdx(currentStepIdx+1), applyStep(teachingSteps[currentStepIdx+1]))} disabled={currentStepIdx === teachingSteps.length - 1} className="px-8 py-3 bg-stone-700 hover:bg-stone-800 text-white rounded-xl disabled:opacity-30 transition-all font-bold">下一步 ➡️</button>
                <button onClick={exitTeaching} className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all font-bold shadow-lg">❌ 退出教學</button>
              </div>
            </div>
          </div>
        )}

        <div className="relative mb-10 overflow-x-auto pb-6">
          <div className="min-w-[700px] flex justify-center items-end bg-stone-800 p-8 rounded-3xl abacus-frame border-[16px] border-stone-900 mx-auto shadow-2xl">
            {columns.map(col => (
              <AbacusColumn 
                key={col.id} data={col} onBeadClick={handleBeadClick}
                isActive={currentStepIdx !== -1 && teachingSteps[currentStepIdx].activeCol === col.id}
              />
            ))}
          </div>
        </div>

        {resultMsg && (
          <div className={`p-8 rounded-3xl border-4 whitespace-pre-line animate-in fade-in slide-in-from-bottom duration-500 ${
            resultMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
            resultMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}>
            <div className="text-2xl font-black flex items-start gap-4">
              <span className="text-4xl">{resultMsg.type === 'success' ? '🎖️' : resultMsg.type === 'error' ? '💡' : '🤖'}</span>
              <div className="flex-1">
                {resultMsg.text}
              </div>
            </div>
          </div>
        )}

        {isAiLoading && (
          <div className="mt-8 flex flex-col items-center gap-3 text-indigo-600 font-bold animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg">AI 老師正在準備個別化指導...</p>
          </div>
        )}
      </main>
      <footer className="text-center mt-12 text-stone-400 text-sm font-medium">
        <p>&copy; 2026 珠心算專業教室 Pro - 智慧與傳統的完美結合</p>
      </footer>
    </div>
  );
};

export default App;
