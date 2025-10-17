import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { GoogleGenAI } from "@google/genai";
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


const AiAssistant: React.FC = () => {
    const { user } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (isOpen) {
            setMessages([{ text: `مرحباً ${user?.Name}! أنا مساعدك الذكي. سأجيب على أسئلتك بناءً على وثائق النظام. كيف يمكنني المساعدة اليوم؟`, isUser: false }]);
        }
    }, [isOpen, user]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { text: input, isUser: true };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            // Format the documentation into a string context
            const documentationContext = formatDocumentation(documentationData);

            const systemInstruction = `أنت مساعد ذكي في نظام إدارة عيادة. مهمتك هي الإجابة على أسئلة المستخدم حول كيفية استخدام النظام. 
            استخدم المعلومات التالية فقط من وثائق النظام كمصدر أساسي لمعلوماتك. لا تخترع أي ميزات غير موجودة في الوثائق. 
            أجب دائمًا باللغة العربية وبإيجاز ووضوح.
            المستخدم الحالي هو: ${user?.role}.
            
            --- وثائق النظام ---
            ${documentationContext}
            --- نهاية الوثائق ---
            `;

            const fullPrompt = `بناءً على الوثائق، أجب على السؤال التالي: "${input}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    systemInstruction: systemInstruction,
                }
            });
            
            const aiResponseText = response.text;
            
            const aiMessage: Message = { text: aiResponseText, isUser: false };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("AI Assistant Error:", error);
            const errorMessage: Message = { text: "عذراً، حدث خطأ أثناء التواصل مع المساعد الذكي. يرجى المحاولة مرة أخرى.", isUser: false };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
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
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center">
                            <SparklesIcon className="h-6 w-6 text-teal-500 ml-2" />
                            <h3 className="font-bold text-lg text-teal-800 dark:text-teal-300">المساعد الذكي</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Messages */}
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

                    {/* Input */}
                    <div className="p-4 border-t dark:border-gray-700 flex-shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="اسأل عن أي شيء..."
                                className="w-full p-3 pr-12 border border-gray-300 rounded-full focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-400"
                                disabled={isLoading || !input.trim()}
                            >
                                <PaperAirplaneIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AiAssistant;