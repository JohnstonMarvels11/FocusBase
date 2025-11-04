import React, { useState, useMemo, useEffect } from 'react';
import type { GeneratedQuiz, QuizQuestion, MultipleChoiceQuestion, TrueFalseQuestion, ShortAnswerQuestion } from '../types';

interface QuizTakerProps {
    quiz: GeneratedQuiz;
    onFinish: () => void;
}

type Answer = string | boolean | null;

type QuizView = 'taking' | 'score' | 'review';

const QuizTaker: React.FC<QuizTakerProps> = ({ quiz, onFinish }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>(Array(quiz.questions.length).fill(null));
    const [view, setView] = useState<QuizView>('taking');
    const [animationClass, setAnimationClass] = useState('animate-question-in');
    
    const currentQuestion = quiz.questions[currentQuestionIndex];

    const handleAnswerChange = (answer: Answer) => {
        if (view !== 'taking') return;
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);
    };
    
    const changeQuestion = (direction: 'next' | 'prev') => {
        setAnimationClass('animate-question-out');
        setTimeout(() => {
            if (direction === 'next' && currentQuestionIndex < quiz.questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else if (direction === 'prev' && currentQuestionIndex > 0) {
                setCurrentQuestionIndex(prev => prev - 1);
            }
            setAnimationClass('animate-question-in');
        }, 300); // Match animation duration
    };
    
    const handleSubmit = () => {
        setView('score');
    };
    
    const score = useMemo(() => {
        return answers.reduce((correctCount, answer, index) => {
            const question = quiz.questions[index];
            const isCorrect = String(answer).toLowerCase().trim() === String(question.answer).toLowerCase().trim();
            return isCorrect ? correctCount + 1 : correctCount;
        }, 0);
    }, [answers, quiz.questions]);
    
    const scorePercentage = Math.round((score / quiz.questions.length) * 100);

    // Render logic for different views
    if (view === 'score') {
        const strokeDasharray = 2 * Math.PI * 56; // 2 * PI * radius
        const strokeDashoffset = strokeDasharray - (strokeDasharray * scorePercentage) / 100;
        
        return (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <h2 className="text-2xl font-bold text-white mb-4">Quiz Complete!</h2>
                <div className="relative w-48 h-48 my-4">
                    <svg className="w-full h-full" viewBox="0 0 120 120">
                        <circle className="text-black/20" strokeWidth="8" stroke="currentColor" fill="transparent" r="56" cx="60" cy="60" />
                        <circle className="progress-ring text-[var(--primary-400)]" strokeWidth="8" strokeLinecap="round" stroke="currentColor" fill="transparent" r="56" cx="60" cy="60" strokeDasharray={strokeDasharray} style={{ strokeDashoffset }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-5xl font-bold text-white">{scorePercentage}<span className="text-3xl text-slate-400">%</span></p>
                    </div>
                </div>
                <p className="text-slate-300">You got <span className="font-bold text-white">{score}</span> out of <span className="font-bold text-white">{quiz.questions.length}</span> questions correct.</p>
                <div className="flex gap-4 mt-8">
                    <button onClick={() => setView('review')} className="px-5 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 button-active">
                        Review Answers
                    </button>
                    <button onClick={onFinish} className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] transition-colors button-active">
                        Finish
                    </button>
                </div>
            </div>
        );
    }
    
    if (view === 'review') {
         return (
             <div className="flex flex-col h-full">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Review Answers</h3>
                    <button onClick={onFinish} className="px-4 py-2 rounded-lg bg-[var(--primary-500)] text-white font-semibold button-active">Finish</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 -mr-4 space-y-4">
                    {quiz.questions.map((q, index) => {
                        const userAnswer = answers[index];
                        const isCorrect = String(userAnswer).toLowerCase().trim() === String(q.answer).toLowerCase().trim();
                        
                        const renderOptions = (question: QuizQuestion) => {
                             switch (question.type) {
                                case 'multiple-choice':
                                    const mcq = question as MultipleChoiceQuestion;
                                    return mcq.options.map((option, i) => {
                                        const isUserAnswer = String(userAnswer) === String(option);
                                        const isCorrectAnswer = String(q.answer) === String(option);
                                        let classes = "review-option ";
                                        if (isCorrectAnswer) classes += "correct-answer ";
                                        if (isUserAnswer) classes += `user-answer ${isCorrect ? 'correct' : 'incorrect'}`;
                                        
                                        return (
                                            <div key={i} className={classes}>
                                                {option}
                                                {isUserAnswer && !isCorrect && <span className="material-symbols-outlined text-red-500 absolute top-2 right-2">cancel</span>}
                                                {isCorrectAnswer && <span className="material-symbols-outlined text-green-500 absolute top-2 right-2">check_circle</span>}
                                            </div>
                                        );
                                    });
                                case 'true-false':
                                     const tfq = question as TrueFalseQuestion;
                                     return (
                                        <div className="flex gap-4">
                                            {[true, false].map(option => {
                                                const isUserAnswer = userAnswer === option;
                                                const isCorrectAnswer = tfq.answer === option;
                                                let classes = "review-option flex-1 text-center ";
                                                if (isCorrectAnswer) classes += "correct-answer ";
                                                if (isUserAnswer) classes += `user-answer ${isCorrect ? 'correct' : 'incorrect'}`;
                                                
                                                return (
                                                    <div key={String(option)} className={classes}>
                                                        {String(option)}
                                                        {isUserAnswer && !isCorrect && <span className="material-symbols-outlined text-red-500 absolute top-2 right-2">cancel</span>}
                                                        {isCorrectAnswer && <span className="material-symbols-outlined text-green-500 absolute top-2 right-2">check_circle</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                     );
                                case 'short-answer':
                                    return (
                                        <div>
                                            <div className={`review-option user-answer ${isCorrect ? 'correct' : 'incorrect'}`}>
                                                <p className="text-xs text-slate-400 mb-1">Your Answer:</p>
                                                {String(userAnswer)}
                                            </div>
                                            {!isCorrect && (
                                                <div className="review-option correct-answer mt-2">
                                                    <p className="text-xs text-slate-400 mb-1">Correct Answer:</p>
                                                    {String(q.answer)}
                                                </div>
                                            )}
                                        </div>
                                    );
                             }
                        };

                        return (
                            <div key={index} className="review-question">
                                <p className="font-semibold text-white mb-3">{index + 1}. {q.question}</p>
                                <div className="space-y-2">{renderOptions(q)}</div>
                            </div>
                        )
                    })}
                </div>
             </div>
         )
    }

    const renderQuestionInput = (question: QuizQuestion) => {
        const answer = answers[currentQuestionIndex];
        switch (question.type) {
            case 'multiple-choice':
                return (
                    <div className="space-y-3">
                        {(question as MultipleChoiceQuestion).options.map((option, i) => (
                            <button key={i} onClick={() => handleAnswerChange(option)} className={`w-full text-left p-4 rounded-lg transition-colors quiz-option ${answer === option ? 'selected' : ''}`}>
                                {option}
                            </button>
                        ))}
                    </div>
                );
            case 'true-false':
                 return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => handleAnswerChange(true)} className={`p-4 rounded-lg transition-colors quiz-option ${answer === true ? 'selected' : ''}`}>True</button>
                        <button onClick={() => handleAnswerChange(false)} className={`p-4 rounded-lg transition-colors quiz-option ${answer === false ? 'selected' : ''}`}>False</button>
                    </div>
                );
            case 'short-answer':
                return <textarea value={(answer as string) || ''} onChange={e => handleAnswerChange(e.target.value)} rows={4} placeholder="Type your answer here..." className="w-full p-3 rounded-md liquid-glass-inset text-white"/>;
        }
    };
    
    const progressPercentage = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-4">
                 <div className="w-full bg-black/30 rounded-full h-1.5 mb-2">
                    <div className="bg-[var(--primary-500)] h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <p className="text-sm text-slate-400">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 relative">
                <div className={animationClass}>
                    <p className="text-xl font-semibold text-white mb-6">{currentQuestion.question}</p>
                    {renderQuestionInput(currentQuestion)}
                </div>
            </div>

            <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t border-white/10 mt-4">
                <button onClick={() => changeQuestion('prev')} disabled={currentQuestionIndex === 0} className="px-5 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 button-active disabled:opacity-50">Previous</button>
                {currentQuestionIndex === quiz.questions.length - 1 ? (
                    <button onClick={handleSubmit} disabled={answers.some(a => a === null)} className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold button-active disabled:opacity-50">Submit Quiz</button>
                ) : (
                    <button onClick={() => changeQuestion('next')} disabled={answers[currentQuestionIndex] === null} className="px-5 py-2 rounded-lg bg-[var(--primary-500)] text-white font-semibold button-active disabled:opacity-50">Next</button>
                )}
            </div>
        </div>
    );
};

export default QuizTaker;