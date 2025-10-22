import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HeartIcon, PaperAirplaneIcon, XMarkIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import { useApp } from '../../contexts/AppContext';
import { documentationData, DocSection } from '../../data/documentationData';
import { VisitType, Diagnosis, Role } from '../../types';

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
    const { user, clinics, doctors, visits, diagnoses, patients, revenues, addPatient, addOptimization, addVisit, addManualRevenue, addDiagnosis, addUser, showNotification } = useApp();
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
    
    const addPatientTool: FunctionDeclaration = {
        name: 'addPatient',
        description: 'يضيف مريضًا جديدًا إلى النظام. استخدم هذه الأداة فقط بعد أن يؤكد المستخدم رغبته في إضافة مريض جديد ويوفر التفاصيل اللازمة.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: {
                    type: Type.STRING,
                    description: 'الاسم الكامل للمريض الجديد.',
                },
                phone: {
                    type: Type.STRING,
                    description: 'رقم هاتف المريض الجديد.',
                },
                dob: { // Date of birth
                    type: Type.STRING,
                    description: 'تاريخ ميلاد المريض بتنسيق YYYY-MM-DD. هذا الحقل اختياري.',
                },
                gender: {
                    type: Type.STRING,
                    description: "جنس المريض، يجب أن يكون إما 'ذكر' أو 'أنثى'. هذا الحقل اختياري.",
                },
            },
            required: ['name', 'phone'],
        },
    };

    const addVisitAndRevenueTool: FunctionDeclaration = {
        name: 'addVisitAndRevenue',
        description: 'يقوم بتسجيل زيارة جديدة للمريض وتسجيل الإيراد المقابل لها. استخدم هذه الأداة فقط عندما يؤكد المستخدم جميع التفاصيل (اسم المريض، اسم العيادة، نوع الزيارة، والتاريخ والوقت الاختياريين).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                patientName: {
                    type: Type.STRING,
                    description: 'الاسم الكامل للمريض كما هو مسجل في النظام.',
                },
                clinicName: {
                    type: Type.STRING,
                    description: 'اسم العيادة التي سيقوم المريض بزيارتها.',
                },
                visitType: {
                    type: Type.STRING,
                    description: `نوع الزيارة. يجب أن يكون إما '${VisitType.FirstVisit}' أو '${VisitType.FollowUp}'.`,
                },
                visitDate: {
                    type: Type.STRING,
                    description: 'التاريخ المطلوب للحجز بتنسيق YYYY-MM-DD. إذا لم يتم تحديده، سيتم استخدام تاريخ اليوم.',
                },
                visitTime: {
                    type: Type.STRING,
                    description: 'الوقت المحدد للزيارة بتنسيق HH:MM (24 ساعة). هذا الحقل اختياري.',
                },
            },
            required: ['patientName', 'clinicName', 'visitType'],
        },
    };
    
    const addDiagnosisForVisitTool: FunctionDeclaration = {
        name: 'addDiagnosisForVisit',
        description: 'يقوم بتسجيل تشخيص طبي لزيارة مريض محددة. لا تستخدم هذه الأداة إلا إذا كان المستخدم طبيباً وقام بتأكيد جميع تفاصيل التشخيص.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                visitId: {
                    type: Type.NUMBER,
                    description: 'الرقم التعريفي (ID) للزيارة التي يتم تشخيصها.',
                },
                diagnosisText: {
                    type: Type.STRING,
                    description: 'النص الكامل للتشخيص الطبي.',
                },
                prescriptionText: {
                    type: Type.STRING,
                    description: 'النص الكامل للوصفة الطبية والعلاج.',
                },
                labsNeededText: {
                    type: Type.STRING,
                    description: 'قائمة بالفحوصات أو التحاليل المطلوبة، مفصولة بفاصلة. مثال: "صورة دم كاملة, تحليل سكر".',
                },
                notesText: {
                    type: Type.STRING,
                    description: 'أي ملاحظات إضافية من الطبيب. هذا الحقل اختياري.',
                },
            },
            required: ['visitId', 'diagnosisText', 'prescriptionText'],
        },
    };
    
    const addUserTool: FunctionDeclaration = {
        name: 'addUser',
        description: 'يقوم بإنشاء مستخدم جديد بصلاحية مدير، موظف استقبال، أو شاشة عرض. لا يمكن استخدام هذه الأداة لإنشاء حسابات أطباء.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: {
                    type: Type.STRING,
                    description: 'الاسم الكامل للمستخدم الجديد.',
                },
                username: {
                    type: Type.STRING,
                    description: 'اسم المستخدم لتسجيل الدخول (يجب أن يكون فريداً).',
                },
                password: {
                    type: Type.STRING,
                    description: 'كلمة المرور للمستخدم الجديد.',
                },
                role: {
                    type: Type.STRING,
                    description: `صلاحية المستخدم. يجب أن تكون واحدة من: 'manager', 'reception', 'queuescreen'.`,
                },
            },
            required: ['name', 'username', 'password', 'role'],
        },
    };

    const systemContext = useMemo(() => {
        const documentationContext = formatDocumentation(documentationData);
        const today = getLocalYYYYMMDD(new Date());

        // Simplified dynamic data
        const patientCount = patients.length;
        const clinicsCount = clinics.length;
        const doctorsCount = doctors.length;
        const clinicsDoctorsInfo = `يوجد في النظام ${clinicsCount} عيادة و ${doctorsCount} طبيب. يمكنك السؤال عن تفاصيل عيادة أو طبيب معين، أو الاطلاع على قائمة العيادات والأطباء في الصفحات المخصصة لها.`;

        const waitingVisits = visits.filter(v => {
            const isToday = v.visit_date === today;
            const isWaitingStatus = v.status === 'Waiting' || v.status === 'In Progress';
            const isDiagnosed = diagnoses.some(d => d.visit_id === v.visit_id);
            return isToday && isWaitingStatus && !isDiagnosed;
        });
        const queueInfo = `يوجد حالياً ${waitingVisits.length} مريض في قوائم الانتظار الإجمالية. يمكن للمستخدمين عرض التفاصيل في لوحة التحكم أو شاشة الانتظار.`;

        const todaysRevenues = revenues.filter(r => r.date === today);
        const totalTodaysRevenue = todaysRevenues.reduce((sum, r) => sum + r.amount, 0);
        const revenueInfo = `إجمالي إيرادات اليوم هو ${totalTodaysRevenue.toFixed(2)} ريال. للحصول على تفاصيل، يجب على المدير أو موظف الاستقبال زيارة صفحة التقارير.`;
        
        const bookingPermissions = `
--- صلاحيات وإجراءات الحجز (للمدير والاستقبال) ---
- فقط المستخدمون بصلاحيات 'manager' و 'reception' يمكنهم حجز المواعيد. إذا حاول مستخدم آخر (مثل 'doctor') إجراء حجز، أبلغه بلطف أن هذه المهمة من اختصاص موظف الاستقبال أو المدير.
- عند طلب حجز موعد، اتبع **دائماً** هذا الحوار المتدرج ولا تطلب كل المعلومات دفعة واحدة:
1.  **ابدأ بسؤال المريض:** اسأل "لمن تريد الحجز؟" أو "ما هو اسم المريض؟".
2.  **التحقق من اسم المريض:** بعد الحصول على الاسم، تحقق منه مقابل قائمة المرضى المسجلين.
    - **إذا كان هناك تطابق تام:** انتقل إلى الخطوة 4 مباشرة.
    - **إذا لم يكن هناك تطابق تام:** ابحث عن أقرب اسم مشابه. ثم اسأل المستخدم للتأكيد. مثال: "لم أجد مريضًا بالاسم 'محمد مصطفي'. هل تقصد 'محمد مصطفى'؟".
    - **إذا أكد المستخدم الاسم المقترح:** استخدم الاسم الصحيح وانتقل إلى الخطوة 4.
    - **إذا نفى المستخدم أو لم يوجد اسم مشابه:** انتقل إلى الخطوة 3.
3.  **التعامل مع المريض غير الموجود:**
    - **اسأل عن الإضافة:** قل "لم أجد المريض. هل ترغب في إضافته كمريض جديد؟".
    - **إذا وافق المستخدم:** اطلب المعلومات الضرورية بقول: "حسنًا. ما هو رقم هاتف المريض؟". بعد الحصول على رقم الهاتف، استدعِ أداة 'addPatient' بالاسم ورقم الهاتف، ثم قل "ممتاز، تمت إضافة المريض بنجاح. لنكمل الحجز. في أي عيادة؟" وانتقل للخطوة 4.
    - **إذا رفض المستخدم:** قل "حسنًا، لا يمكن المتابعة بدون تحديد مريض. هل هناك شيء آخر أستطيع المساعدة به؟" وأنهِ محاولة الحجز.
4.  **بعد تأكيد اسم المريض، اسأل عن العيادة:** قل "تمام. وفي أي عيادة؟".
5.  **بعد اختيار العيادة، اسأل عن نوع الزيارة:** قل "تمام، في عيادة [اسم العيادة]. ما هو نوع الزيارة، كشف جديد أم متابعة؟". يمكنك إبلاغ المستخدم بأن تفاصيل الانتظار والطبيب المناوب تظهر في لوحة التحكم.
6.  **بعد تحديد نوع الزيارة، اسأل عن التاريخ والوقت (إذا لزم الأمر):** إذا لم يذكر المستخدم تاريخًا، افترض أنه اليوم. اسأل "هل ترغب في تحديد وقت معين؟" إذا كان ذلك مناسبًا.
7.  **قبل التنفيذ، لخص واطلب التأكيد النهائي:** قل "حسناً، للمراجعة: سيتم حجز موعد لـ [اسم المريض] في عيادة [اسم العيادة] كـ '[نوع الكشف]' بتاريخ [التاريخ]. هل أؤكد الحجز؟".
8.  **عند الحصول على التأكيد فقط،** قم باستدعاء أداة 'addVisitAndRevenue' بالمعلومات المجمعة. لا تستدعِ الأداة أبدًا قبل التأكيد الصريح من المستخدم.
`;

        const revenuePermissions = `
--- صلاحيات الإيرادات (للمدير والاستقبال) ---
- يمكن للمستخدمين بصلاحيات 'manager' و 'reception' الاستعلام عن ملخص الإيرادات.
- إذا سأل مستخدم بصلاحية 'doctor' عن الإيرادات، أبلغه بلطف أن هذه المعلومات مخصصة للإدارة.
`;

        const queueScreenPermissions = `
--- صلاحيات شاشة عرض الانتظار (queuescreen) ---
- هذه الصلاحية مخصصة للعرض فقط.
- المستخدم الذي يمتلك هذه الصلاحية يرى فقط شاشة الانتظار العامة للمرضى.
- هذا المستخدم لا يمكنه التفاعل مع النظام أو إجراء أي تغييرات. دوره هو عرض قائمة الانتظار على شاشة في منطقة استقبال المرضى.
- هذا المستخدم لا يمكنه التفاعل معك (سالم).
`;
        
        const userManagementPermissions = `
--- صلاحيات إدارة المستخدمين (للمدير) ---
- بصفتك مديرًا، يمكنك إضافة مستخدمين جدد (باستثناء الأطباء).
- عند طلب إضافة مستخدم، اجمع التفاصيل: الاسم الكامل، اسم المستخدم، كلمة المرور، والصلاحية.
- الصلاحيات المتاحة للإضافة عبر المساعد هي: 'manager' (مدير), 'reception' (موظف استقبال), 'queuescreen' (شاشة عرض الانتظار).
- **مهم جداً:** لا تقم بإنشاء حسابات "طبيب". يجب على المدير إنشاء حسابات الأطباء من صفحة "إدارة المستخدمين" لضمان ربطها بالطبيب والعيادة بشكل صحيح. إذا طُلب منك إضافة طبيب، اعتذر وأرشد المدير إلى الصفحة الصحيحة.
- بعد جمع وتأكيد المعلومات، استدعِ أداة 'addUser'.
`;
        
        let doctorContext = '';
        if (user?.role === 'doctor') {
            const doctorClinics = clinics.filter(c => c.doctor_id === user.doctor_id);
            const doctorClinicIds = doctorClinics.map(c => c.clinic_id);
            const doctorWaitingVisitsCount = waitingVisits.filter(v => doctorClinicIds.includes(v.clinic_id)).length;
            
            doctorContext = `
--- صلاحيات ومهام الطبيب ---
- بصفتك طبيباً، يمكنك استخدامي للمساعدة في تسجيل التشخيصات. يمكنك أن تطلب مني "تسجيل تشخيص للزيارة رقم 123" أو "اكتب تشخيص للمريض التالي".
- سأقوم بسؤالك عن تفاصيل التشخيص (التشخيص، الوصفة، التحاليل، الملاحظات).
- بعد أن تزودني بالمعلومات، سألخصها لك للتأكيد. بعد تأكيدك، سأقوم بحفظ التشخيص باستخدام أداة 'addDiagnosisForVisit'.
- يوجد في قائمة الانتظار الخاصة بك حالياً: ${doctorWaitingVisitsCount} مرضى. يمكنك رؤية القائمة الكاملة وتفاصيل الزيارات (مثل ID) في لوحة التحكم الخاصة بك.
`;
        }
        
        const baseInstructions = `أنت سالم، مساعد ذكي وودود في نظام إدارة عيادة. مهمتك هي مساعدة المستخدمين من خلال الإجابة على أسئلتهم وتنفيذ المهام بناءً على صلاحياتهم. المستخدم الحالي هو: ${user?.role}.
أجب دائمًا باللغة العربية وبإيجاز ووضوح. استخدم المعلومات التالية فقط كمصدر لمعلوماتك والتزم بالصلاحيات الموضحة في الأقسام المخصصة لكل دور.

--- وثائق النظام ---
${documentationContext}
--- نهاية الوثائق ---

--- بيانات النظام الحية ---
عدد المرضى المسجلين: ${patientCount}. يمكنك البحث عن أي مريض بالاسم عند الحاجة.
تاريخ اليوم: ${today}
العيادات والأطباء:
${clinicsDoctorsInfo}
قائمة الانتظار العامة:
${queueInfo}
الإيرادات (معلومات سرية):
${revenueInfo}
--- نهاية بيانات النظام الحية ---
`;
        const functionCallingInstructions = `
--- تعليمات الأدوات ---
- أداة 'addOptimizationSuggestion': عندما يقدم المستخدم اقتراحًا لتحسين النظام، اسأله إذا كان يرغب في تسجيله رسمياً. إذا وافق، قم باستدعاء الأداة.
- أداة 'addPatient': استخدمها لإضافة مريض جديد بعد أن يؤكد المستخدم رغبته بذلك ويقدم رقم الهاتف.
- أداة 'addVisitAndRevenue': استخدمها لتسجيل زيارة وإيراد بعد تأكيد المستخدم.
- أداة 'addDiagnosisForVisit': استخدمها لتسجيل تشخيص بعد تأكيد الطبيب.
- أداة 'addUser': استخدمها لإضافة مستخدم جديد بعد تأكيد المدير.
--- نهاية تعليمات الأدوات ---`;

        return `${baseInstructions}\n${bookingPermissions}\n${revenuePermissions}\n${userManagementPermissions}\n${queueScreenPermissions}\n${doctorContext}\n${functionCallingInstructions}`;

    }, [documentationData, clinics, doctors, visits, diagnoses, user, revenues, patients]);
    
    useEffect(() => {
        if (isOpen) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                const tools: FunctionDeclaration[] = [addOptimizationTool];
                if (user?.role === 'manager' || user?.role === 'reception') {
                    tools.push(addVisitAndRevenueTool, addPatientTool);
                }
                if (user?.role === 'manager') {
                    tools.push(addUserTool);
                }
                if (user?.role === 'doctor') {
                    tools.push(addDiagnosisForVisitTool);
                }

                const chat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: systemContext,
                        tools: [{ functionDeclarations: tools }],
                    },
                });
                chatRef.current = chat;
                setMessages([{ text: `مرحباً ${user?.Name}! أنا سالم، مساعدك الذكي لإدارة العيادة. كيف يمكنني المساعدة اليوم؟`, isUser: false }]);
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
            
            let functionCallProcessed = false;

            if (response.functionCalls && response.functionCalls.length > 0) {
                 for (const fc of response.functionCalls) {
                    if (fc.name === 'addOptimizationSuggestion') {
                        const { suggestionText } = fc.args;
                        if (suggestionText && user) {
                            await addOptimization({ user: user.username, name: user.Name, page: 'المساعد سالم', optimize: suggestionText });
                        }
                    } else if (fc.name === 'addPatient') {
                        functionCallProcessed = true;
                        const { name, phone, dob, gender } = fc.args;
                        const processingMessage: Message = { text: `جاري إضافة المريض "${name}"...`, isUser: false };
                        setMessages(prev => [...prev, processingMessage]);
                        try {
                            await addPatient({
                                name,
                                phone,
                                dob: dob || '',
                                gender: (gender as 'ذكر' | 'أنثى') || 'ذكر',
                                address: ''
                            });
                        } catch (e: any) {
                            // Error notification is handled by the context function
                            setMessages(prev => [...prev, { text: `حدث خطأ أثناء إضافة المريض: ${e.message}`, isUser: false }]);
                        }
                    } else if (fc.name === 'addUser') {
                        functionCallProcessed = true;
                        const { name, username, password, role } = fc.args;
                        const validRoles = [Role.Manager, Role.Reception, Role.QueueScreen];
                        
                        if (name && username && password && role && validRoles.includes(role as Role)) {
                            const processingMessage: Message = { text: `جاري إنشاء حساب للمستخدم "${name}"...`, isUser: false };
                            setMessages(prev => [...prev, processingMessage]);
                            try {
                                await addUser({
                                    Name: name,
                                    username: username,
                                    password: password,
                                    role: role as Role,
                                    status: 'مفعل',
                                });
                                setMessages(prev => [...prev, { text: `تم إنشاء حساب المستخدم "${name}" بنجاح.`, isUser: false }]);
                            } catch (e: any) {
                                setMessages(prev => [...prev, { text: `حدث خطأ أثناء إنشاء المستخدم: ${e.message}`, isUser: false }]);
                            }
                        } else {
                            setMessages(prev => [...prev, { text: `عذرًا، المعلومات غير مكتملة أو الصلاحية غير مدعومة. لا يمكنني إنشاء حساب طبيب من هنا.`, isUser: false }]);
                        }
                    } else if (fc.name === 'addVisitAndRevenue') {
                        functionCallProcessed = true;
                        const { patientName, clinicName, visitType, visitTime, visitDate } = fc.args;
                        const bookingDate = visitDate || getLocalYYYYMMDD(new Date());
                        const processingMessage: Message = { text: `تمام، جاري محاولة حجز موعد لـ "${patientName}" في تاريخ ${bookingDate}...`, isUser: false };
                        setMessages(prev => [...prev, processingMessage]);
                        
                        const patient = patients.find(p => p.name.toLowerCase() === (patientName || '').toLowerCase().trim());
                        const clinic = clinics.find(c => c.clinic_name.toLowerCase().includes((clinicName || '').toLowerCase().trim()));
                        
                        if (!patient) {
                            setMessages(prev => [...prev, { text: `عذرًا، لم أتمكن من العثور على مريض بالاسم "${patientName}".`, isUser: false }]);
                            break; 
                        }
                        if (!clinic) {
                            setMessages(prev => [...prev, { text: `عذرًا، لم أتمكن من العثور على عيادة بالاسم "${clinicName}".`, isUser: false }]);
                            break; 
                        }

                        try {
                            const newVisit = await addVisit({ patient_id: patient.patient_id, clinic_id: clinic.clinic_id, visit_type: visitType as VisitType, visit_time: visitTime || '', visit_date: bookingDate });
                            const price = (visitType as VisitType) === VisitType.FirstVisit ? clinic.price_first_visit : clinic.price_followup;
                            await addManualRevenue({ visit_id: newVisit.visit_id, patient_id: patient.patient_id, patient_name: patient.name, clinic_id: clinic.clinic_id, amount: price, date: bookingDate, type: visitType as VisitType, notes: `تمت الإضافة بواسطة المساعد سالم` });
                            const timeInfo = newVisit.visit_time ? `\n- الوقت: ${newVisit.visit_time}` : '';
                            setMessages(prev => [...prev, { text: `تم الحجز وتسجيل الإيراد بنجاح!\n- المريض: ${patient.name}\n- العيادة: ${clinic.clinic_name}\n- التاريخ: ${bookingDate}${timeInfo}\n- رقم الانتظار: ${newVisit.queue_number}\n- المبلغ: ${price} ريال`, isUser: false }]);
                        } catch (e: any) {
                             setMessages(prev => [...prev, { text: `حدث خطأ أثناء محاولة الحجز: ${e.message}`, isUser: false }]);
                        }
                    } else if (fc.name === 'addDiagnosisForVisit') {
                        functionCallProcessed = true;
                        const { visitId, diagnosisText, prescriptionText, labsNeededText, notesText } = fc.args;
                        const processingMessage: Message = { text: `جاري تسجيل التشخيص للزيارة رقم ${visitId}...`, isUser: false };
                        setMessages(prev => [...prev, processingMessage]);
                        const visitExists = visits.some(v => v.visit_id === visitId);
                        if (!visitExists) {
                            setMessages(prev => [...prev, { text: `عذرًا، الزيارة رقم ${visitId} غير موجودة.`, isUser: false }]);
                            break;
                        }
                        try {
                            await addDiagnosis({ visit_id: Number(visitId), doctor: user?.username || 'doctor_ai', diagnosis: diagnosisText, prescription: prescriptionText, labs_needed: labsNeededText ? (labsNeededText as string).split(',').map(s => s.trim()).filter(Boolean) : [], notes: notesText || '' });
                            setMessages(prev => [...prev, { text: `تم تسجيل التشخيص للزيارة رقم ${visitId} بنجاح.`, isUser: false }]);
                        } catch (e: any) {
                            setMessages(prev => [...prev, { text: `حدث خطأ أثناء تسجيل التشخيص: ${e.message}`, isUser: false }]);
                        }
                    }
                }
            }
            
            const aiResponseText = response.text;
            if (aiResponseText) {
                setMessages(prev => [...prev, { text: aiResponseText, isUser: false }]);
            } else if (!functionCallProcessed && response.functionCalls && response.functionCalls.length > 0) {
                setMessages(prev => [...prev, { text: "تمت إضافة اقتراحك بنجاح. شكراً لمساهمتك!", isUser: false }]);
            }

        } catch (error) {
            console.error("AI Assistant Error:", error);
            setMessages(prev => [...prev, { text: "عذراً، حدث خطأ أثناء التواصل مع سالم. يرجى المحاولة مرة أخرى.", isUser: false }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleListen = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        try {
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

                recognition.onstart = () => setIsListening(true);
                recognition.onend = () => setIsListening(false);
                
                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error:", event.error);
                    if (event.error === 'no-speech') {
                        setMessages(prev => [...prev, { text: "لم أسمع أي شيء. يرجى النقر على الميكروفون والمحاولة مرة أخرى.", isUser: false }]);
                    } else if (event.error === 'not-allowed') {
                        showNotification("تم رفض إذن استخدام الميكروفون. يرجى تفعيله من إعدادات المتصفح.", 'error');
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
        } catch (e) {
            console.error("Failed to start speech recognition:", e);
            showNotification("لا يمكن بدء التعرف على الصوت. قد لا يكون مدعومًا أو مسموحًا به في هذا السياق.", 'error');
            setIsListening(false);
        }
    };

    if (!user) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="no-print fixed bottom-24 left-6 z-40 bg-teal-500 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-teal-600 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                title="المساعد سالم"
            >
                <HeartIcon className="h-7 w-7" />
            </button>

            {isOpen && (
                <div className="no-print fixed bottom-6 left-6 z-50 w-[90vw] max-w-sm h-[70vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out">
                    <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center">
                            <HeartIcon className="h-6 w-6 text-teal-500 ml-2" />
                            <h3 className="font-bold text-lg text-teal-800 dark:text-teal-300">المساعد سالم</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    <div className="flex-grow p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                                {!msg.isUser && <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 text-white font-bold">S</div>}
                                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${msg.isUser ? 'bg-teal-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-end gap-2 justify-start">
                                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 text-white font-bold">S</div>
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
                                    placeholder={isListening ? 'جاري الاستماع...' : "اسأل سالم أي شيء..."}
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