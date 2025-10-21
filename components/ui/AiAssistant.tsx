import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import { useApp } from '../../contexts/AppContext';
import { documentationData, DocSection } from '../../data/documentationData';

interface Message {
    text: string;
    isUser: boolean;
}

// Helper function to stringify the documentation for the AI context
const formatDocumentation = (sections: DocSection[], level = 0): string => {
    return sections.map(section => {
        const title = `${'#'.repeat(level + 1)} ${section.title}`;
        const content = section.content;
        const subsections = section.subsections ? formatDocumentation(section.subsections, level + 1) : '';
        return `${title}\n${content}\n\n${subsections}`;
    }).join('');
};

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AiAssistant: React.FC = () => {
    const { user, clinics, doctors, visits, diagnoses, addOptimization, showNotification } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<Chat | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    const addOptimizationTool: FunctionDeclaration = {
        name: 'addOptimizationSuggestion',
        description: 'يضيف اقتراحًا للتحسين إلى النظام بناءً على ملاحظات المستخدم.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                suggestionText: {
                    type: Type.STRING,
                    description: 'ملخص واضح لمشكلة المستخدم أو اقتراحه.',
                },
            },
            required: ['suggestionText'],
        },
    };

    const systemContext = useMemo(() => {
        const documentationContext = formatDocumentation(documentationData);
        const clinicsDoctorsInfo = clinics.map(clinic => {
            const doctor = doctors.find(d => d.doctor_id === clinic.doctor_id);
            return ` - عيادة ${clinic.clinic_name} (الطبيب: ${doctor ? doctor.doctor_name : 'غير محدد'})`;
        }).join('\n');
        const today = getLocalYYYYMMDD(new Date());
        const waitingVisits = visits.filter(v => {
            const isToday = v.visit_date === today;
            const isWaitingStatus = v.status === 'Waiting' || v.status === 'In Progress';
            const isDiagnosed = diagnoses.some(d => d.visit_id === v.visit_id);
            return isToday && isWaitingStatus && !isDiagnosed;
        });
        const visitsByClinic = waitingVisits.reduce((acc, visit) => {
            const clinicId = visit.clinic_id;
            if (!acc[clinicId]) {
                acc[clinicId] = 0;
            }
            acc[clinicId]++;
            return acc;
        }, {} as Record<number, number>);
        
        let queueInfo = "لا يوجد مرضى في قائمة الانتظار حالياً.";
        if (Object.keys(visitsByClinic).length > 0) {
            queueInfo = "قائمة الانتظار الحالية:\n" + Object.entries(visitsByClinic).map(([clinicId, count]) => {
                const clinic = clinics.find(c => c.clinic_id === Number(clinicId));
                if (!clinic) return null;
                const doctor = doctors.find(d => d.doctor_id === clinic.doctor_id);
                const clinicName = clinic.clinic_name;
                const doctorName = doctor ? doctor.doctor_name : 'غير محدد';
                const caseWord = count === 1 ? 'حالة واحدة' : count === 2 ? 'حالتان' : count <= 10 ? `${count} حالات` : `${count} حالة`;
                return ` - عيادة ${clinicName} (الطبيب: ${doctorName}): ${caseWord} في الانتظار.`;
            }).filter(Boolean).join('\n');
        }

        const baseInstructions = `أنت مساعد ذكي في نظام إدارة عيادة. مهمتك هي الإجابة على أسئلة المستخدم حول كيفية استخدام النظام وحول البيانات الحية للنظام. 
استخدم المعلومات التالية فقط كمصدر أساسي لمعلوماتك. لا تخترع أي ميزات أو بيانات غير موجودة. 
أجب دائمًا باللغة العربية وبإيجاز ووضوح.
المستخدم الحالي هو: ${user?.role}.

--- وثائق النظام ---
${documentationContext}
--- نهاية الوثائق ---

--- بيانات النظام الحية ---
تاريخ اليوم: ${today}

العيادات والأطباء:
${clinicsDoctorsInfo}

قائمة الانتظار:
${queueInfo}
--- نهاية بيانات النظام الحية ---
`;
        const functionCallingInstructions = `
--- تعليمات الأدوات ---
لديك أداة متاحة اسمها 'addOptimizationSuggestion'.
عندما يذكر المستخدم مشكلة أو صعوبة أو يقدم اقتراحًا لتحسين النظام:
1. أولاً، أجب على سؤال المستخدم مباشرة.
2. بعد ذلك، اسأله إذا كان يرغب في تسجيل ملاحظاته كاقتراح رسمي للتحسين.
3. إذا كانت إجابته في الرسالة التالية إيجابية (مثل "نعم"، "بالتأكيد"، "حسنًا")، قم باستدعاء أداة 'addOptimizationSuggestion' وأرسل ملخصًا لملاحظاته كقيمة للمعامل 'suggestionText'.
4. لا تستدع الأداة أبدًا بدون تأكيد صريح من المستخدم في رسالة منفصلة.
5. بعد استدعاء الأداة بنجاح، أبلغ المستخدم بأنه تم إضافة اقتراحه.
--- نهاية تعليمات الأدوات ---`;

        return `${baseInstructions}\n${functionCallingInstructions}`;

    }, [documentationData, clinics, doctors, visits, diagnoses, user]);
    
    useEffect(() => {
        if (isOpen) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                const chat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: systemContext,
                        tools: [{ functionDeclarations: [addOptimizationTool] }],
                    },
                });
                chatRef.current = chat;
                setMessages([{ text: `مرحباً ${user?.Name}! أنا مساعدك الذكي. سأجيب على أسئلتك بناءً على وثائق وبيانات النظام الحية. كيف يمكنني المساعدة اليوم؟`, isUser: false }]);
            } catch (e) {
                console.error("Failed to initialize AI Chat:", e);
                setMessages([{ text: "عذرًا، لم أتمكن من بدء المحادثة. يرجى المحاولة مرة أخرى.", isUser: false }]);
            }
        } else {
            chatRef.current = null;
        }
    }, [isOpen, user, systemContext]);


    const handleSend = async (textOverride?: string) => {
        const messageText = textOverride || input;
        if (!messageText.trim() || isLoading || !chatRef.current) return;

        const userMessage: Message = { text: messageText, isUser: true };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatRef.current.sendMessage({ message: messageText });

            if (response.functionCalls && response.functionCalls.length > 0) {
                for (const fc of response.functionCalls) {
                    if (fc.name === 'addOptimizationSuggestion') {
                        const { suggestionText } = fc.args;
                        if (suggestionText && user) {
                            await addOptimization({
                                user: user.username,
                                name: user.Name,
                                page: 'AI Assistant',
                                optimize: suggestionText,
                            });
                        }
                    }
                }
            }

            const aiResponseText = response.text;
            if (aiResponseText) {
                const aiMessage: Message = { text: aiResponseText, isUser: false };
                setMessages(prev => [...prev, aiMessage]);
            } else if (response.functionCalls && response.functionCalls.length > 0) {
                const confirmationMessage: Message = { text: "تمت إضافة اقتراحك بنجاح. شكراً لمساهمتك!", isUser: false };
                setMessages(prev => [...prev, confirmationMessage]);
            }

        } catch (error) {
            console.error("AI Assistant Error:", error);
            const errorMessage: Message = { text: "عذراً، حدث خطأ أثناء التواصل مع المساعد الذكي. يرجى المحاولة مرة أخرى.", isUser: false };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleListen = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showNotification("متصفحك لا يدعم خاصية تحويل الكلام إلى نص.", 'error');
            return;
        }

        if (!recognitionRef.current) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'ar-SA';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };
            
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);

                if (event.error === 'no-speech') {
                    const noSpeechMessage: Message = { text: "لم أسمع أي شيء. يرجى النقر على الميكروفون والمحاولة مرة أخرى.", isUser: false };
                    setMessages(prev => [...prev, noSpeechMessage]);
                } else if (event.error === 'not-allowed') {
                    showNotification("تم رفض إذن استخدام الميكروفون. يرجى تفعيله من إعدادات المتصفح.", 'error');
                } else if (event.error === 'aborted') {
                    // User intentionally stopped the recognition. No message needed.
                } else if (event.error === 'audio-capture') {
                    showNotification("فشل الوصول للميكروفون. يرجى التحقق من توصيله وإعداده بشكل صحيح.", 'error');
                } else {
                    showNotification("حدث خطأ أثناء التعرف على الصوت. يرجى المحاولة مرة أخرى.", 'error');
                }

                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                handleSend(transcript);
            };
            
            recognitionRef.current = recognition;
        }

        recognitionRef.current.start();
    };


    if (!user) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="no-print fixed bottom-24 left-6 z-40 bg-teal-500 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-teal-600 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                title="المساعد الذكي"
            >
                <SparklesIcon className="h-7 w-7" />
            </button>

            {isOpen && (
                <div className="no-print fixed bottom-6 left-6 z-50 w-[90vw] max-w-sm h-[70vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out">
                    <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center">
                            <SparklesIcon className="h-6 w-6 text-teal-500 ml-2" />
                            <h3 className="font-bold text-lg text-teal-800 dark:text-teal-300">المساعد الذكي</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    <div className="flex-grow p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                                {!msg.isUser && <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 text-white font-bold">A</div>}
                                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${msg.isUser ? 'bg-teal-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-end gap-2 justify-start">
                                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 text-white font-bold">A</div>
                                <div className="px-4 py-2 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                                   <div className="flex items-center space-x-1 space-x-reverse">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                   </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder={isListening ? 'جاري الاستماع...' : "اسأل عن أي شيء..."}
                                    className="w-full p-3 pl-12 pr-4 border border-gray-300 rounded-full focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={isLoading || isListening}
                                />
                                <button
                                    onClick={() => handleSend()}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-400"
                                    disabled={isLoading || !input.trim()}
                                    title="إرسال"
                                >
                                    <PaperAirplaneIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <button
                                onClick={handleListen}
                                className={`p-3 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300'}`}
                                title="تحدث"
                                disabled={isLoading}
                            >
                                <MicrophoneIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AiAssistant;