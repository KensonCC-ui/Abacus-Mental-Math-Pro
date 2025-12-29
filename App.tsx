
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Difficulty, ColumnData, Question, AbacusStep 
} from './types';
import { 
  getInitialAbacus, stateToValue, 
  calculateTotal, generateSteps
} from './utils/abacusLogic';
import AbacusColumn from './components/AbacusColumn';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  const [columns, setColumns] = useState<ColumnData[]>(getInitialAbacus());
  const [question, setQuestion] = useState<Question | null>(null);
  const [teachingSteps, setTeachingSteps] = useState<AbacusStep[]>([]);
  const [correctionSteps, setCorrectionSteps] = useState<AbacusStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [resultMsg, setResultMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [voicesReady, setVoicesReady] = useState(false);
  
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW';
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('zh-TW')) || 
                            voices.find(v => v.lang.startsWith('zh-HK')) ||
                            voices.find(v => v.lang.startsWith('zh'));
      if (preferredVoice) utterance.voice = preferredVoice;
      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }, 100);
  }, []);

  useEffect(() => {
    if (window.speechSynthesis) {
      const updateVoices = () => {
        if (window.speechSynthesis.getVoices().length > 0) setVoicesReady(true);
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
    const op = Math.random() > 0.4 ? '+' : '-';
    switch(diff) {
      case Difficulty.UNIT: n1 = Math.floor(Math.random() * 9) + 1; n2 = Math.floor(Math.random() * 9) + 1; break;
      case Difficulty.TENS: n1 = Math.floor(Math.random() * 89) + 10; n2 = Math.floor(Math.random() * 89) + 10; break;
      case Difficulty.HUNDREDS: n1 = Math.floor(Math.random() * 899) + 100; n2 = Math.floor(Math.random() * 899) + 100; break;
      case Difficulty.THOUSANDS: n1 = Math.floor(Math.random() * 8999) + 1000; n2 = Math.floor(Math.random() * 8999) + 1000; break;
      case Difficulty.MIXED:
        const exp = Math.floor(Math.random() * 4) + 1;
        n1 = Math.floor(Math.random() * Math.pow(10, exp));
        n2 = Math.floor(Math.random() * Math.pow(10, exp));
        break;
    }
    if (op === '-' && n1 < n2) [n1, n2] = [n2, n1];
    setQuestion({ n1, n2, op, target: op === '+' ? n1 + n2 : n1 - n2 });
    setColumns(getInitialAbacus());
    setTeachingSteps([]);
    setCorrectionSteps([]);
    setCurrentStepIdx(-1);
    setResultMsg(null);
    speak(`準備好了，題目是：${n1} ${op === '+' ? '加' : '減'} ${n2}`);
  };

  const handleCheck = async () => {
    if (!question) return;
    const currentVal = calculateTotal(columns);
    
    if (currentVal === question.target) {
      setResultMsg({ text: "🌟 太棒了！撥珠完全正確！", type: 'success' });
      speak("太棒了，撥珠完全正確");
      setCorrectionSteps([]);
    } else {
      const basicError = `❌ 哎呀，不對喔。撥出的值是 ${currentVal}，正確應該是 ${question.target}。再試一次！`;
      setResultMsg({ text: basicError, type: 'error' });
      speak("不對喔，再檢查一下");

      // Show correction steps automatically in traditional mode
      const steps = generateSteps(question);
      setCorrectionSteps(steps);
      speak("別擔心，下面為你列出了正確的撥珠步驟，請參考看看。");
    }
  };

  const handleTeach = () => {
    if (!question) return;
    const steps = generateSteps(question);
    setTeachingSteps(steps);
    setCorrectionSteps([]);
    setCurrentStepIdx(0);
    setColumns(getInitialAbacus());
    setColumns(steps[0].snapshot);
    speak(steps[0].speak);
    setResultMsg(null);
  };

  const exitTeaching = useCallback(() => {
    setCurrentStepIdx(-1);
    setTeachingSteps([]);
    window.speechSynthesis.cancel();
    speak("已退出教學模式");
  }, [speak]);

  return (
    <div className="min-h-screen pb-20 pt-8 px-4 sm:px-10 bg-slate-50">
      <header className="text-center mb-8 relative max-w-5xl mx-auto">
        <div className="flex absolute top-0 right-0 items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${voicesReady ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {voicesReady ? '🔊 語音就緒' : '⌛ 語音載入'}
          </span>
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
              setCorrectionSteps([]);
              exitTeaching();
              speak("算盤已歸零清空");
            }}
            isTeaching={currentStepIdx !== -1}
            hasQuestion={!!question}
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
          <div className="mb-8 p-6 bg-amber-50 rounded-2xl border-2 border-amber-200 shadow-inner">
            <div className="flex flex-col items-center gap-4">
              <div className="text-2xl font-bold text-amber-900 bg-white px-8 py-3 rounded-full shadow-sm border border-amber-200 text-center">
                {teachingSteps[currentStepIdx].message}
              </div>
              {teachingSteps[currentStepIdx].formula && (
                <div className="px-6 py-2 bg-rose-500 text-white font-black rounded-xl text-xl uppercase shadow-lg animate-bounce">
                  口訣：{teachingSteps[currentStepIdx].formula}
                </div>
              )}
              <div className="flex gap-4">
                <button onClick={() => {
                  const idx = Math.max(0, currentStepIdx - 1);
                  setCurrentStepIdx(idx);
                  setColumns(teachingSteps[idx].snapshot);
                  speak(teachingSteps[idx].speak);
                }} disabled={currentStepIdx === 0} className="px-8 py-3 bg-stone-700 text-white rounded-xl disabled:opacity-30">⬅️ 上一步</button>
                <button onClick={() => {
                  const idx = Math.min(teachingSteps.length - 1, currentStepIdx + 1);
                  setCurrentStepIdx(idx);
                  setColumns(teachingSteps[idx].snapshot);
                  speak(teachingSteps[idx].speak);
                }} disabled={currentStepIdx === teachingSteps.length - 1} className="px-8 py-3 bg-stone-700 text-white rounded-xl disabled:opacity-30">下一步 ➡️</button>
                <button onClick={exitTeaching} className="px-8 py-3 bg-rose-600 text-white rounded-xl shadow-lg">❌ 退出</button>
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
            resultMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="text-2xl font-black flex items-start gap-4">
              <span className="text-4xl">{resultMsg.type === 'success' ? '🎖️' : '💡'}</span>
              <div className="flex-1">
                {resultMsg.text}
              </div>
            </div>
          </div>
        )}

        {/* Correction Steps Section */}
        {correctionSteps.length > 0 && (
          <div className="mt-10 animate-in fade-in slide-in-from-top duration-700">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📝</span>
              <h3 className="text-2xl font-black text-stone-700">正確撥珠步驟回顧</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {correctionSteps.map((step, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setColumns(step.snapshot)}
                  className="group cursor-pointer bg-stone-50 border border-stone-200 p-5 rounded-2xl hover:border-amber-400 hover:bg-amber-50 transition-all shadow-sm active:scale-95"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-tighter">步驟 {idx + 1}</span>
                    {step.formula && (
                      <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded font-black">{step.formula}</span>
                    )}
                  </div>
                  <p className="text-stone-800 font-bold group-hover:text-amber-700 transition-colors">{step.message}</p>
                  <div className="mt-3 flex gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                    {step.snapshot.map((c, i) => (
                      <div key={i} className={`w-full h-1 rounded-full ${c.value > 0 ? 'bg-amber-500' : 'bg-stone-300'}`}></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-amber-100/50 rounded-xl text-amber-800 text-sm font-medium text-center">
              💡 點擊上方的步驟卡片，可以將算盤切換到該步驟的狀態進行觀察。
            </div>
          </div>
        )}
      </main>
      <footer className="text-center mt-12 text-stone-400 text-sm">
        <p>&copy; 2026 珠心算專業教室 Pro - 智慧與傳統的完美結合</p>
      </footer>
    </div>
  );
};

export default App;
