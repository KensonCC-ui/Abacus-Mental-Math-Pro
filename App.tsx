
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Difficulty, ColumnData, Question, AbacusStep 
} from './types';
import { 
  getInitialAbacus, stateToValue, 
  calculateTotal, generateSteps, COLUMNS
} from './utils/abacusLogic';
import AbacusColumn from './components/AbacusColumn';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  // 基本算盤狀態
  const [columns, setColumns] = useState<ColumnData[]>(getInitialAbacus());
  const [question, setQuestion] = useState<Question | null>(null);
  const [teachingSteps, setTeachingSteps] = useState<AbacusStep[]>([]);
  const [correctionSteps, setCorrectionSteps] = useState<AbacusStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [resultMsg, setResultMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [errorColumns, setErrorColumns] = useState<number[]>([]);
  
  // 測驗模式狀態
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizHistory, setQuizHistory] = useState<{ correct: boolean }[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // 計時器狀態
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('stopwatch');
  const [durationInput, setDurationInput] = useState(5); // 分鐘
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  
  const timerRef = useRef<number | null>(null);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    window.speechSynthesis.speak(utterance);
  }, []);

  // 計時器邏輯
  useEffect(() => {
    if (isQuizActive && !showSummary) {
      timerRef.current = window.setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
        if (timerMode === 'countdown') {
          setSecondsLeft(prev => {
            if (prev <= 1) {
              handleFinishQuiz();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isQuizActive, showSummary, timerMode]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleBeadClick = (colId: number, type: 'top' | 'bottom', beadIdx?: number) => {
    if (currentStepIdx !== -1 || hasChecked) return;
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
    setErrorColumns(prev => prev.filter(id => id !== colId));
  };

  const generateSingleQuestion = (diff: Difficulty): Question => {
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
    return { n1, n2, op, target: op === '+' ? n1 + n2 : n1 - n2 };
  };

  const handleStartQuiz = (diff: Difficulty, mode: 'countdown' | 'stopwatch', mins: number) => {
    const qs = Array.from({ length: 10 }).map(() => generateSingleQuestion(diff));
    setQuizQuestions(qs);
    setCurrentQuizIdx(0);
    setQuizScore(0);
    setQuizHistory([]);
    setIsQuizActive(true);
    setShowSummary(false);
    setTimerMode(mode);
    setSecondsElapsed(0);
    setSecondsLeft(mins * 60);
    setHasChecked(false);
    setErrorColumns([]);
    
    const firstQ = qs[0];
    setQuestion(firstQ);
    setColumns(getInitialAbacus());
    setTeachingSteps([]);
    setCorrectionSteps([]);
    setResultMsg(null);
    speak(`測驗開始。第一題：${firstQ.n1} ${firstQ.op === '+' ? '加' : '減'} ${firstQ.n2}`);
  };

  const handleNextQuizQuestion = () => {
    const nextIdx = currentQuizIdx + 1;
    if (nextIdx < 10) {
      setCurrentQuizIdx(nextIdx);
      const nextQ = quizQuestions[nextIdx];
      setQuestion(nextQ);
      setColumns(getInitialAbacus());
      setCorrectionSteps([]);
      setResultMsg(null);
      setHasChecked(false);
      setErrorColumns([]);
      speak(`第 ${nextIdx + 1} 題：${nextQ.n1} ${nextQ.op === '+' ? '加' : '減'} ${nextQ.n2}`);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = () => {
    setIsQuizActive(false);
    setShowSummary(true);
    speak(`測驗結束。`);
  };

  const handleCheck = () => {
    if (!question || hasChecked) return;
    const currentVal = calculateTotal(columns);
    setHasChecked(true);
    
    // 計算正確的答案佈局來進行比對
    const correctSteps = generateSteps(question);
    const finalCorrectSnapshot = correctSteps[correctSteps.length - 1].snapshot;
    
    const errors: number[] = [];
    columns.forEach((col, i) => {
      if (col.value !== finalCorrectSnapshot[i].value) {
        errors.push(col.id);
      }
    });
    
    if (currentVal === question.target) {
      setResultMsg({ text: "🌟 撥珠正確！", type: 'success' });
      speak("正確");
      if (isQuizActive) {
        setQuizScore(prev => prev + 10);
        setQuizHistory(prev => [...prev, { correct: true }]);
      }
      setErrorColumns([]);
      setCorrectionSteps([]); // 正確則不顯示引導
    } else {
      setResultMsg({ text: `❌ 錯誤。答案是 ${question.target}`, type: 'error' });
      speak(`不對喔，正確答案是${question.target}`);
      if (isQuizActive) {
        setQuizHistory(prev => [...prev, { correct: false }]);
      }
      setErrorColumns(errors);
      setCorrectionSteps(correctSteps);
    }
  };

  const handleReset = (shouldClearQuestion = false) => {
    setColumns(getInitialAbacus());
    setResultMsg(null);
    setCorrectionSteps([]);
    setTeachingSteps([]);
    setCurrentStepIdx(-1);
    setHasChecked(false);
    setErrorColumns([]);
    if (shouldClearQuestion) setQuestion(null);
    speak("歸零");
  };

  const closeTeaching = () => {
    setCurrentStepIdx(-1);
    setTeachingSteps([]);
    setColumns(getInitialAbacus());
    speak("關閉演示，換你撥撥看。");
  };

  return (
    <div className="min-h-screen pb-4 pt-2 sm:pt-4 px-2 sm:px-6 bg-slate-50 flex flex-col">
      <header className="text-center mb-2 sm:mb-4 max-w-5xl mx-auto shrink-0">
        <h1 className="text-3xl sm:text-5xl font-black text-stone-800 tracking-tight">
          珠心算教室 <span className="text-amber-600">Pro</span>
        </h1>
      </header>

      <main className="max-w-6xl mx-auto bg-white p-3 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-stone-100 relative overflow-hidden flex-1 flex flex-col">
        {/* 測驗狀態欄 */}
        {isQuizActive && (
          <div className="absolute top-0 left-0 right-0 bg-stone-900 text-white px-4 sm:px-8 py-2 sm:py-3 flex justify-between items-center z-[60] shadow-2xl shrink-0">
            <div className="flex items-center gap-4 sm:gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-stone-400">進度</span>
                <span className="text-base sm:text-xl font-black">{currentQuizIdx + 1} / 10</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-stone-400">得分</span>
                <span className="text-base sm:text-xl font-black text-amber-400">{quizScore}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6">
               <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-stone-400">計時</span>
                <span className={`text-xl sm:text-2xl font-mono font-black ${timerMode === 'countdown' && secondsLeft < 30 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                  {timerMode === 'countdown' ? formatTime(secondsLeft) : formatTime(secondsElapsed)}
                </span>
              </div>
              <button 
                type="button"
                onClick={handleFinishQuiz}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-90 shadow-xl border-b-4 border-rose-800 active:border-b-0"
              >
                🚩 結束
              </button>
            </div>
          </div>
        )}

        <div className={`transition-all duration-500 shrink-0 ${isQuizActive ? 'mt-12 sm:mt-16' : ''}`}>
          <ControlPanel 
            onNewTask={(diff) => {
              if (isQuizActive) return;
              const newQ = generateSingleQuestion(diff);
              setQuestion(newQ);
              handleReset(false);
              speak(`練習題目：${newQ.n1} ${newQ.op === '+' ? '加' : '減'} ${newQ.n2}`);
            }}
            onStartQuiz={handleStartQuiz}
            onCheck={handleCheck}
            onReset={() => handleReset(false)}
            onTeach={() => {
              if (!question || isQuizActive) return;
              const steps = generateSteps(question);
              setTeachingSteps(steps);
              setCurrentStepIdx(0);
              setColumns(getInitialAbacus());
              setColumns(steps[0].snapshot);
              speak(steps[0].speak);
            }}
            isTeaching={currentStepIdx !== -1}
            isQuizActive={isQuizActive}
            hasQuestion={!!question}
            hasChecked={hasChecked}
            durationInput={durationInput}
            setDurationInput={setDurationInput}
          />
        </div>

        {/* 題目顯示區 + 核對結果顯示 */}
        <div className={`text-center my-3 sm:my-4 h-24 sm:h-32 flex flex-col justify-center rounded-2xl border-2 border-dashed transition-all duration-300 shrink-0 overflow-hidden relative ${
            resultMsg ? (resultMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300') : 'bg-stone-50 border-stone-200'
        }`}>
          {question ? (
            <div className="flex flex-col items-center relative z-10">
              {!resultMsg ? (
                <>
                  <span className="text-[10px] sm:text-xs text-stone-400 font-bold mb-1 uppercase tracking-widest">{isQuizActive ? '測驗題目' : '練習題目'}</span>
                  <span className="text-4xl sm:text-6xl font-black text-stone-800 tracking-tighter">
                    {question.n1} <span className="text-amber-500">{question.op}</span> {question.n2}
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-4 sm:gap-10 animate-in zoom-in duration-300 w-full px-6">
                  <div className="flex-1 text-left flex items-center gap-4">
                    <span className="text-4xl sm:text-6xl">{resultMsg.type === 'success' ? '🎉' : '💡'}</span>
                    <div>
                        <span className={`text-lg sm:text-3xl font-black block ${resultMsg.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {resultMsg.text}
                        </span>
                        <span className="text-sm font-bold text-stone-400">
                             {question.n1} {question.op} {question.n2} = {question.target}
                        </span>
                    </div>
                  </div>
                  {isQuizActive && (
                    <button 
                      onClick={handleNextQuizQuestion}
                      className="px-6 py-3 sm:px-10 sm:py-4 bg-stone-800 text-white font-black rounded-xl hover:bg-stone-700 shadow-xl transition-all active:scale-95 text-base sm:text-xl border-b-4 border-stone-950 active:border-b-0"
                    >
                      下一題 ➡️
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm sm:text-lg text-stone-400 font-bold italic px-4">請點選上方難度，開始練習吧！</p>
          )}
        </div>

        {/* 算盤主體 */}
        <div className="relative mb-4 flex-1 flex justify-center items-center bg-stone-100/50 rounded-[2rem] min-h-[300px] sm:min-h-[400px]">
          <div className="scale-[0.45] xs:scale-[0.55] sm:scale-[0.65] md:scale-[0.8] lg:scale-90 xl:scale-100 origin-center transition-transform duration-500">
            <div className="flex justify-center items-end bg-stone-800 p-4 sm:p-8 rounded-[2.5rem] abacus-frame border-[12px] border-stone-900 shadow-2xl">
              {columns.map(col => (
                <AbacusColumn 
                  key={col.id} data={col} onBeadClick={handleBeadClick}
                  isActive={
                      (currentStepIdx !== -1 && teachingSteps[currentStepIdx].activeCol === col.id) || 
                      (errorColumns.includes(col.id))
                  }
                  isError={errorColumns.includes(col.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 下方浮動引導與演示區 */}
        <div className="shrink-0 space-y-4">
            {/* 修正引導區域 - 現在測驗模式也能顯示引導 */}
            {correctionSteps.length > 0 && hasChecked && (
              <div className="p-4 bg-amber-50/50 rounded-[1.5rem] border-2 border-amber-100/50 shadow-md animate-in slide-in-from-top duration-500">
                <h3 className="text-xs sm:text-sm font-black text-amber-800 mb-2 flex items-center gap-2">
                  <span>💡</span> {isQuizActive ? '答錯了，點擊下方步驟看看正確撥法：' : '查看撥珠步驟引導：'}
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {correctionSteps.map((step, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => {
                          setColumns(step.snapshot);
                          speak(step.speak);
                          if (step.activeCol !== undefined) {
                              setErrorColumns([step.activeCol]);
                          }
                      }}
                      className="flex-shrink-0 w-32 sm:w-40 bg-white border border-amber-200 p-2 sm:p-3 rounded-xl hover:border-amber-400 hover:shadow-md transition-all text-left"
                    >
                      <span className="text-[10px] font-black text-amber-500 block">步 {idx + 1}</span>
                      <p className="text-xs font-bold text-stone-800 line-clamp-1">{step.message}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 教學演示導航 */}
            {currentStepIdx !== -1 && (
              <div className="p-4 sm:p-6 bg-amber-50 rounded-[1.5rem] border-2 border-amber-200 text-center shadow-lg animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-amber-800 font-bold text-sm">步驟 {currentStepIdx + 1} / {teachingSteps.length}</span>
                  <p className="text-lg sm:text-2xl font-black text-amber-950 flex-1 px-4">{teachingSteps[currentStepIdx].message}</p>
                  <button onClick={closeTeaching} className="text-rose-500 font-black text-sm">✕ 關閉</button>
                </div>
                
                <div className="flex justify-center gap-4">
                  <button disabled={currentStepIdx === 0} onClick={() => {
                      const i = Math.max(0, currentStepIdx - 1);
                      setCurrentStepIdx(i);
                      setColumns(teachingSteps[i].snapshot);
                      speak(teachingSteps[i].speak);
                  }} className="flex-1 max-w-[140px] py-2 sm:py-3 bg-stone-700 disabled:bg-stone-200 text-white rounded-xl text-sm sm:text-lg font-black shadow transition-all">上一步</button>
                  
                  <button onClick={() => {
                      if (currentStepIdx < teachingSteps.length - 1) {
                        const i = currentStepIdx + 1;
                        setCurrentStepIdx(i);
                        setColumns(teachingSteps[i].snapshot);
                        speak(teachingSteps[i].speak);
                      } else {
                        closeTeaching();
                      }
                  }} className={`flex-1 max-w-[140px] py-2 sm:py-3 text-white rounded-xl text-sm sm:text-lg font-black shadow transition-all ${
                      currentStepIdx === teachingSteps.length - 1 ? 'bg-emerald-500' : 'bg-stone-800'
                  }`}>
                    {currentStepIdx === teachingSteps.length - 1 ? '🎉 完成' : '下一步'}
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* 結算彈窗 */}
        {showSummary && (
          <div className="fixed inset-0 z-[100] bg-stone-900/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 text-center shadow-2xl border-4 border-amber-400 animate-in zoom-in duration-500">
              <div className="text-6xl mb-4 animate-bounce">{quizScore >= 80 ? '🏆' : quizScore >= 60 ? '🥈' : '💪'}</div>
              <h2 className="text-3xl font-black text-stone-800 mb-2">測驗成果</h2>
              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <span className="text-xs text-stone-400 font-bold block">得分</span>
                  <span className="text-4xl font-black text-amber-600">{quizScore}</span>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <span className="text-xs text-stone-400 font-bold block">時間</span>
                  <span className="text-3xl font-black text-stone-800">{formatTime(secondsElapsed)}</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setShowSummary(false); setIsQuizActive(false); handleReset(true); }}
                className="w-full py-4 bg-stone-800 text-white font-black rounded-2xl shadow hover:bg-stone-700 transition-all active:scale-95 text-xl"
              >
                回到首頁
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center mt-3 text-stone-400 text-[10px] sm:text-xs font-medium shrink-0">
        <p>&copy; 2026 珠心算教室 Pro · 專業演示版本</p>
      </footer>
    </div>
  );
};

export default App;
