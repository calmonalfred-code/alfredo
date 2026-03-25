'use client';

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Users, 
  BookOpen, 
  Settings, 
  HelpCircle, 
  PlusCircle,
  User,
  Bell,
  Calendar,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Pill,
  Lightbulb,
  ChevronRight,
  History,
  Printer,
  Siren,
  CheckCircle2,
  Download,
  Trash2,
  Calculator,
  X,
  Plus,
  Minus,
  Divide,
  Percent,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  LogIn,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  getDocFromServer,
  doc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';

// --- Types ---

interface Patient {
  id: string;
  name: string;
  age: string;
  complaint: string;
  procedures: string[];
  consultationData?: Guidance;
  timestamp: number;
}

interface Guidance {
  id: string;
  protocol: {
    title: string;
    description: string;
    priority: 'critical' | 'standard';
    reference: string;
  };
  medication: {
    title: string;
    description: string;
    calculatorLabel: string;
  };
  differentials: string[];
  questions?: string[];
  completeConsultation?: string;
}

import Markdown from 'react-markdown';

// --- Calculator Components ---

interface CalculatorProps {
  onClose: () => void;
  type: string;
}

const DosageCalculator = ({ type, onClose }: CalculatorProps) => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [result, setResult] = useState<string | null>(null);

  // GRACE & TIMI specific states
  const [hr, setHr] = useState('');
  const [sbp, setSbp] = useState('');
  const [killip, setKillip] = useState('1');
  const [cardiacArrest, setCardiacArrest] = useState(false);
  const [stDeviation, setStDeviation] = useState(false);
  const [elevatedEnzymes, setElevatedEnzymes] = useState(false);
  
  const [timiRiskFactors, setTimiRiskFactors] = useState(false);
  const [timiKnownCAD, setTimiKnownCAD] = useState(false);
  const [timiASA, setTimiASA] = useState(false);
  const [timiAngina, setTimiAngina] = useState(false);

  const calculateBMI = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (w && h) {
      const bmi = w / (h * h);
      setResult(`IMC: ${bmi.toFixed(2)} kg/m²`);
    }
  };

  const calculateCrCl = () => {
    const w = parseFloat(weight);
    const a = parseFloat(age);
    const cr = parseFloat(creatinine);
    if (w && a && cr) {
      let crcl = ((140 - a) * w) / (72 * cr);
      if (sex === 'female') crcl *= 0.85;
      setResult(`ClCr: ${crcl.toFixed(2)} mL/min`);
    }
  };

  const calculatePediatricDose = () => {
    const w = parseFloat(weight);
    // Exemplo genérico: 15mg/kg
    if (w) {
      const dose = w * 15;
      setResult(`Dose Sugerida (15mg/kg): ${dose.toFixed(2)} mg`);
    }
  };

  const calculateGRACE = () => {
    let score = 0;
    const a = parseInt(age);
    const h = parseInt(hr);
    const s = parseInt(sbp);
    const cr = parseFloat(creatinine);

    // Age
    if (a < 30) score += 0;
    else if (a < 40) score += 8;
    else if (a < 50) score += 25;
    else if (a < 60) score += 41;
    else if (a < 70) score += 58;
    else if (a < 80) score += 75;
    else if (a < 90) score += 91;
    else score += 100;

    // HR
    if (h < 50) score += 0;
    else if (h < 70) score += 3;
    else if (h < 90) score += 9;
    else if (h < 110) score += 15;
    else if (h < 150) score += 24;
    else if (h < 200) score += 38;
    else score += 46;

    // SBP
    if (s < 80) score += 58;
    else if (s < 100) score += 53;
    else if (s < 120) score += 43;
    else if (s < 140) score += 34;
    else if (s < 160) score += 24;
    else if (s < 200) score += 10;
    else score += 0;

    // Creatinine
    if (cr < 0.4) score += 1;
    else if (cr < 0.8) score += 4;
    else if (cr < 1.2) score += 7;
    else if (cr < 1.6) score += 10;
    else if (cr < 2.0) score += 13;
    else if (cr < 4.0) score += 21;
    else score += 28;

    // Killip
    if (killip === '2') score += 20;
    else if (killip === '3') score += 39;
    else if (killip === '4') score += 59;

    if (cardiacArrest) score += 39;
    if (stDeviation) score += 28;
    if (elevatedEnzymes) score += 14;

    let risk = "Baixo";
    if (score > 140) risk = "Alto";
    else if (score > 108) risk = "Intermediário";

    setResult(`Escore GRACE: ${score} (${risk} Risco)`);
  };

  const calculateTIMI = () => {
    let score = 0;
    if (parseInt(age) >= 65) score += 1;
    if (timiRiskFactors) score += 1;
    if (timiKnownCAD) score += 1;
    if (timiASA) score += 1;
    if (timiAngina) score += 1;
    if (stDeviation) score += 1;
    if (elevatedEnzymes) score += 1;

    let mortality = "4.7%";
    if (score <= 1) mortality = "4.7%";
    else if (score === 2) mortality = "8.3%";
    else if (score === 3) mortality = "13.2%";
    else if (score === 4) mortality = "19.9%";
    else if (score === 5) mortality = "26.2%";
    else score = 40.9; // 6-7

    setResult(`Escore TIMI: ${score}/7`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#00478d] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Calculator size={20} />
            <h3 className="font-bold font-headline">{type}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {type.toLowerCase().includes('imc') && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#727783] uppercase">Peso (kg)</label>
                <input 
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f3f4f5] border-none rounded-lg focus:ring-2 focus:ring-[#00478d]"
                  placeholder="Ex: 70"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#727783] uppercase">Altura (cm)</label>
                <input 
                  type="number" 
                  value={height} 
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f3f4f5] border-none rounded-lg focus:ring-2 focus:ring-[#00478d]"
                  placeholder="Ex: 175"
                />
              </div>
              <button onClick={calculateBMI} className="w-full py-3 bg-[#00478d] text-white rounded-xl font-bold hover:bg-[#005eb8] transition-all">
                Calcular IMC
              </button>
            </>
          )}

          {type.toLowerCase().includes('creatinina') || type.toLowerCase().includes('clcr') || type.toLowerCase().includes('cockcroft') ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#727783] uppercase">Idade</label>
                  <input 
                    type="number" 
                    value={age} 
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-2 bg-[#f3f4f5] border-none rounded-lg focus:ring-2 focus:ring-[#00478d]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#727783] uppercase">Peso (kg)</label>
                  <input 
                    type="number" 
                    value={weight} 
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-4 py-2 bg-[#f3f4f5] border-none rounded-lg focus:ring-2 focus:ring-[#00478d]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#727783] uppercase">Creatinina Sérica (mg/dL)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={creatinine} 
                  onChange={(e) => setCreatinine(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f3f4f5] border-none rounded-lg focus:ring-2 focus:ring-[#00478d]"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setSex('male')}
                  className={cn("flex-1 py-2 rounded-lg font-bold text-sm border transition-all", sex === 'male' ? "bg-[#00478d] text-white border-[#00478d]" : "bg-white text-[#727783] border-[#c2c6d4]")}
                >
                  Masculino
                </button>
                <button 
                  onClick={() => setSex('female')}
                  className={cn("flex-1 py-2 rounded-lg font-bold text-sm border transition-all", sex === 'female' ? "bg-[#00478d] text-white border-[#00478d]" : "bg-white text-[#727783] border-[#c2c6d4]")}
                >
                  Feminino
                </button>
              </div>
              <button onClick={calculateCrCl} className="w-full py-3 bg-[#00478d] text-white rounded-xl font-bold hover:bg-[#005eb8] transition-all">
                Calcular ClCr
              </button>
            </>
          ) : null}

          {type.toLowerCase().includes('pediátrica') || type.toLowerCase().includes('peso') ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#727783] uppercase">Peso do Paciente (kg)</label>
                <input 
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f3f4f5] border-none rounded-lg focus:ring-2 focus:ring-[#00478d]"
                  placeholder="Ex: 12"
                />
              </div>
              <button onClick={calculatePediatricDose} className="w-full py-3 bg-[#00478d] text-white rounded-xl font-bold hover:bg-[#005eb8] transition-all">
                Calcular Dose
              </button>
            </>
          ) : null}

          {type.toLowerCase().includes('grace') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#727783] uppercase">Idade</label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-3 py-2 bg-[#f3f4f5] rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#727783] uppercase">FC (bpm)</label>
                  <input type="number" value={hr} onChange={(e) => setHr(e.target.value)} className="w-full px-3 py-2 bg-[#f3f4f5] rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#727783] uppercase">PAS (mmHg)</label>
                  <input type="number" value={sbp} onChange={(e) => setSbp(e.target.value)} className="w-full px-3 py-2 bg-[#f3f4f5] rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#727783] uppercase">Creatinina</label>
                  <input type="number" step="0.1" value={creatinine} onChange={(e) => setCreatinine(e.target.value)} className="w-full px-3 py-2 bg-[#f3f4f5] rounded-lg text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#727783] uppercase">Classe Killip</label>
                <select value={killip} onChange={(e) => setKillip(e.target.value)} className="w-full px-3 py-2 bg-[#f3f4f5] rounded-lg text-sm">
                  <option value="1">I - Sem sinais de IC</option>
                  <option value="2">II - Estertores, B3</option>
                  <option value="3">III - Edema Agudo de Pulmão</option>
                  <option value="4">IV - Choque Cardiogênico</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={cardiacArrest} onChange={(e) => setCardiacArrest(e.target.checked)} />
                  Parada Cardíaca na Admissão
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={stDeviation} onChange={(e) => setStDeviation(e.target.checked)} />
                  Desvio de Segmento ST
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={elevatedEnzymes} onChange={(e) => setElevatedEnzymes(e.target.checked)} />
                  Enzimas Cardíacas Elevadas
                </label>
              </div>
              <button onClick={calculateGRACE} className="w-full py-3 bg-[#00478d] text-white rounded-xl font-bold">Calcular GRACE</button>
            </div>
          )}

          {type.toLowerCase().includes('timi') && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#727783] uppercase">Idade</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-3 py-2 bg-[#f3f4f5] rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={timiRiskFactors} onChange={(e) => setTimiRiskFactors(e.target.checked)} />
                  ≥3 Fatores de Risco p/ DAC
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={timiKnownCAD} onChange={(e) => setTimiKnownCAD(e.target.checked)} />
                  Estenose Coronária Conhecida ≥50%
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={timiASA} onChange={(e) => setTimiASA(e.target.checked)} />
                  Uso de AAS nos últimos 7 dias
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={timiAngina} onChange={(e) => setTimiAngina(e.target.checked)} />
                  Angina Grave (≥2 episódios em 24h)
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={stDeviation} onChange={(e) => setStDeviation(e.target.checked)} />
                  Desvio de ST ≥0.5mm
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={elevatedEnzymes} onChange={(e) => setElevatedEnzymes(e.target.checked)} />
                  Marcadores de Necrose Elevados
                </label>
              </div>
              <button onClick={calculateTIMI} className="w-full py-3 bg-[#00478d] text-white rounded-xl font-bold">Calcular TIMI</button>
            </div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-[#e7f3ff] rounded-xl border border-[#00478d]/20 text-center"
            >
              <span className="text-2xl font-black text-[#00478d] font-headline">{result}</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Error Boundary ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white rounded-2xl shadow-xl border border-red-100 text-center space-y-4">
          <AlertTriangle size={48} className="mx-auto text-red-500" />
          <h2 className="text-xl font-bold text-gray-900">Algo deu errado</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Ocorreu um erro inesperado. Por favor, tente recarregar a página.
          </p>
          {this.state.error?.message && (
            <pre className="text-[10px] bg-gray-50 p-4 rounded overflow-auto max-h-32 text-left">
              {this.state.error.message}
            </pre>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#00478d] text-white rounded-lg font-bold"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Feedback Components ---

interface FeedbackSectionProps {
  guidance: Guidance;
  user: FirebaseUser | null;
  patientInput: string;
}

const FeedbackSection = ({ guidance, user, patientInput }: FeedbackSectionProps) => {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !user) return;

    setLoading(true);
    try {
      const feedbackData = {
        guidanceId: guidance.id,
        rating,
        comment,
        userId: user.uid,
        timestamp: serverTimestamp(),
        patientContext: {
          input: patientInput,
          guidanceTitle: guidance.protocol.title
        }
      };

      await addDoc(collection(db, 'feedback'), feedbackData);
      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'feedback');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#e7f3ff] p-4 rounded-xl border border-[#00478d]/20 text-center space-y-2"
      >
        <CheckCircle2 size={24} className="mx-auto text-[#00478d]" />
        <p className="text-xs font-bold text-[#00478d]">Obrigado pelo seu feedback!</p>
        <p className="text-[10px] text-[#424752]">Sua avaliação ajuda a treinar o Clinical Conductor.</p>
      </motion.div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-[#c2c6d4]/20 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-[#00478d]">
        <MessageSquare size={18} />
        <h4 className="font-bold text-sm font-headline">Avaliar Sugestão</h4>
      </div>
      
      {!user ? (
        <div className="text-center py-2 space-y-2">
          <p className="text-[10px] text-[#727783]">Faça login para enviar feedback e ajudar a melhorar o sistema.</p>
          <button 
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#f3f4f5] text-[#00478d] rounded-lg text-xs font-bold hover:bg-[#e1e3e4] transition-all"
          >
            <LogIn size={14} />
            Entrar com Google
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-4">
            <button 
              type="button"
              onClick={() => setRating('positive')}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl transition-all border",
                rating === 'positive' ? "bg-[#e7f3ff] border-[#00478d] text-[#00478d]" : "bg-white border-[#c2c6d4]/20 text-[#727783] hover:bg-gray-50"
              )}
            >
              <ThumbsUp size={20} />
              <span className="text-[10px] font-bold">Útil</span>
            </button>
            <button 
              type="button"
              onClick={() => setRating('negative')}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl transition-all border",
                rating === 'negative' ? "bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]" : "bg-white border-[#c2c6d4]/20 text-[#727783] hover:bg-gray-50"
              )}
            >
              <ThumbsDown size={20} />
              <span className="text-[10px] font-bold">Não Útil</span>
            </button>
          </div>

          {rating && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <textarea 
                placeholder="O que poderia ser melhor? (Opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 bg-[#f3f4f5] border-none rounded-lg text-xs focus:ring-2 focus:ring-[#00478d] resize-none h-20"
              />
              <button 
                disabled={loading}
                className="w-full py-2 bg-[#00478d] text-white rounded-lg text-xs font-bold hover:bg-[#005eb8] transition-all disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar Feedback"}
              </button>
            </motion.div>
          )}
        </form>
      )}
    </div>
  );
};

const Sidebar = ({ activeView, setActiveView, isOpen, setIsOpen, user }: { 
  activeView: string, 
  setActiveView: (view: string) => void,
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  user: FirebaseUser | null
}) => {
  const menuItems = [
    { id: 'consultation', icon: Stethoscope, label: 'Consulta' },
    { id: 'patients', icon: Users, label: 'Pacientes' },
    { id: 'library', icon: BookOpen, label: 'Biblioteca' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "h-screen w-64 fixed left-0 top-0 bg-[#f1f3f5] flex flex-col py-6 pl-4 border-r-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="mb-10 px-2 flex justify-between items-center pr-4">
          <div>
            <h1 className="text-lg font-extrabold text-[#00478d] tracking-tight font-headline">Clinical Conductor</h1>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#005eb8] flex items-center justify-center text-white overflow-hidden">
                {user?.photoURL ? (
                  <Image src={user.photoURL} alt="User" width={40} height={40} referrerPolicy="no-referrer" />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div>
                <p className="font-headline text-sm font-bold text-[#00478d] truncate max-w-[120px]">
                  {user?.displayName || "Dr. Tropo"}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#424752] font-bold">
                  {user ? "Médico Verificado" : "Clínica Médica"}
                </p>
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-[#424752]">
            <PlusCircle size={24} className="rotate-45" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 pr-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-l-lg transition-all duration-200 ease-in-out font-headline text-sm font-semibold",
                activeView === item.id 
                  ? "bg-white text-[#00478d] shadow-sm" 
                  : "text-[#424752] hover:text-[#00478d] hover:bg-white/50"
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pr-4 space-y-1 border-t border-[#c2c6d4]/20 pt-4">
          <button 
            onClick={() => {
              setActiveView('consultation');
              setIsOpen(false);
            }}
            className="w-full mb-4 bg-[#00478d] text-white py-3 rounded-xl font-headline font-bold text-sm tracking-wide hover:bg-[#005eb8] transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <PlusCircle size={16} />
            Nova Consulta
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-[#424752] hover:text-[#00478d] font-headline text-sm font-semibold">
            <Settings size={18} />
            <span>Configurações</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-[#424752] hover:text-[#00478d] font-headline text-sm font-semibold">
            <HelpCircle size={18} />
            <span>Ajuda</span>
          </button>
          {user ? (
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-4 py-3 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg font-headline text-sm font-semibold transition-colors"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          ) : (
            <button 
              onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
              className="w-full flex items-center gap-3 px-4 py-3 text-[#00478d] hover:bg-[#e7f3ff] rounded-lg font-headline text-sm font-semibold transition-colors"
            >
              <LogIn size={18} />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

const TopBar = ({ title, onMenuClick }: { title: string, onMenuClick: () => void }) => {
  const today = new Date().toLocaleDateString('pt-BR', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <header className="w-full top-0 sticky z-40 bg-[#f8f9fa] flex justify-between items-center px-4 lg:px-8 py-4 border-b border-[#c2c6d4]/10">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-[#424752] hover:bg-[#e1e3e4] rounded-lg transition-colors"
        >
          <Users size={20} />
        </button>
        <span className="text-[#00478d] font-headline font-extrabold text-base lg:text-lg">Consulta Rápida</span>
      </div>
      <div className="flex items-center gap-3 lg:gap-6">
        <div className="hidden sm:flex items-center gap-4 border-r border-[#c2c6d4]/20 pr-6">
          <button className="text-[#424752] hover:bg-[#e1e3e4] p-2 rounded-full transition-colors">
            <Bell size={20} />
          </button>
          <button className="text-[#424752] hover:bg-[#e1e3e4] p-2 rounded-full transition-colors">
            <User size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[#424752] font-medium text-xs lg:text-sm">
          <Calendar size={16} />
          <span className="hidden xs:inline">{today}</span>
        </div>
      </div>
    </header>
  );
};

export default function ConsultationPage() {
  const [activeView, setActiveView] = useState('consultation');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // Persistence for patients
  useEffect(() => {
    const saved = localStorage.getItem('clinical_conductor_patients');
    if (saved) {
      try {
        setPatients(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load patients from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('clinical_conductor_patients', JSON.stringify(patients));
  }, [patients]);
  const [input, setInput] = useState('');
  const [examsInput, setExamsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [activeCalculator, setActiveCalculator] = useState<string | null>(null);

  // Patient Registration State
  const [newPatient, setNewPatient] = useState({ name: '', age: '', complaint: '' });
  const [procedureInput, setProcedureInput] = useState<{ [key: string]: string }>({});

  const registerPatient = () => {
    if (!newPatient.name || !newPatient.complaint) return;
    const patient: Patient = {
      id: Math.random().toString(36).substr(2, 9),
      ...newPatient,
      procedures: [],
      timestamp: Date.now()
    };
    setPatients([patient, ...patients]);
    setNewPatient({ name: '', age: '', complaint: '' });
  };

  const addProcedure = (patientId: string) => {
    const proc = procedureInput[patientId];
    if (!proc) return;
    setPatients(patients.map(p => 
      p.id === patientId ? { ...p, procedures: [...p.procedures, proc] } : p
    ));
    setProcedureInput({ ...procedureInput, [patientId]: '' });
  };

  const exportShiftData = () => {
    const dataStr = JSON.stringify(patients, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `dados_plantao_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const analyzeCase = async (isComplete = false) => {
    if (!input.trim()) return;
    setLoading(true);
    setShowComplete(false);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const combinedInput = `QUEIXA/HISTÓRIA: ${input}${examsInput ? `\n\nRESULTADOS DE EXAMES: ${examsInput}` : ''}`;
      
      const prompt = isComplete 
        ? `Como um assistente médico sênior, forneça um roteiro de consulta COMPLETO para o seguinte caso: "${combinedInput}". 
           Inclua: 
           1. Anamnese detalhada (o que perguntar).
           2. Exame físico focado (o que procurar).
           3. Hipóteses diagnósticas principais e diferenciais.
           4. Plano de investigação (exames).
           5. Conduta terapêutica imediata e de manutenção.
           Responda em formato JSON seguindo o esquema abaixo, mas adicione o campo "completeConsultation" com o conteúdo em Markdown.`
        : `Analise o seguinte caso clínico e forneça orientações estruturadas em JSON: "${combinedInput}". 
           Se faltarem informações críticas para uma conduta segura, liste-as no campo "questions".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `Você é o "Clinical Conductor", um assistente médico de elite. 
          Sua tarefa é analisar descrições de casos clínicos e fornecer orientações imediatas baseadas em evidências.
          Para casos de dor torácica ou suspeita de SCA, sugira sempre calculadoras de risco como "Escore GRACE" ou "Escore TIMI".
          Responda SEMPRE em formato JSON seguindo este esquema:
          {
            "protocol": {
              "title": "Título do protocolo crítico",
              "description": "Descrição breve da ação imediata",
              "priority": "critical" | "standard",
              "reference": "Referência bibliográfica (ex: AHA/ACC 2021)"
            },
            "medication": {
              "title": "Sugestão de medicação/conduta",
              "description": "Dose e via de administração sugerida",
              "calculatorLabel": "Nome de uma calculadora útil (ex: Calculadora de Dose)"
            },
            "differentials": ["Diagnóstico 1", "Diagnóstico 2", "Diagnóstico 3"],
            "questions": ["Pergunta 1", "Pergunta 2"],
            "completeConsultation": "Conteúdo markdown longo se solicitado"
          }`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              protocol: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["critical", "standard"] },
                  reference: { type: Type.STRING }
                },
                required: ["title", "description", "priority", "reference"]
              },
              medication: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  calculatorLabel: { type: Type.STRING }
                },
                required: ["title", "description", "calculatorLabel"]
              },
              differentials: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              questions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              completeConsultation: { type: Type.STRING }
            },
            required: ["protocol", "medication", "differentials"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      const guidanceWithId: Guidance = {
        ...result,
        id: Math.random().toString(36).substr(2, 9)
      };
      setGuidance(guidanceWithId);
      if (isComplete) setShowComplete(true);
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setInput(prev => prev + "\n\nResposta à pergunta (" + question + "): ");
  };

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-[#f8f9fa]">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          user={user}
        />
      
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        <TopBar 
          title={activeView === 'consultation' ? 'Consulta Rápida' : 'Gestão de Pacientes'} 
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10 w-full">
          {activeView === 'consultation' ? (
            <div className="grid grid-cols-12 gap-8">
              {/* Consultation View Content */}
              <section className="col-span-12 lg:col-span-7 space-y-6 lg:space-y-8">
                <div className="space-y-4">
                  <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#00478d] font-headline">Qual o problema do paciente?</h2>
                  <p className="text-sm lg:text-base text-[#424752] font-sans">Descreva os sintomas, histórico ou observações clínicas para gerar orientações imediatas.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#727783]">História Clínica / Queixa</label>
                    <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="w-full h-32 lg:h-40 p-4 lg:p-6 bg-[#e1e3e4] border-none rounded-xl text-base lg:text-lg font-sans focus:ring-0 focus:border-b-2 focus:border-[#00478d] transition-all duration-300 resize-none placeholder:text-[#727783]/50" 
                      placeholder="Ex: Paciente masculino, 45 anos, apresenta dor torácica aguda há 30 min..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#727783]">Resultados de Exames (Opcional)</label>
                    <textarea 
                      value={examsInput}
                      onChange={(e) => setExamsInput(e.target.value)}
                      className="w-full h-24 lg:h-32 p-4 bg-[#f3f4f5] border-none rounded-xl text-sm font-sans focus:ring-0 focus:border-b-2 focus:border-[#00478d] transition-all duration-300 resize-none placeholder:text-[#727783]/50" 
                      placeholder="Ex: Troponina I: 0.5 ng/mL, ECG: Supra de ST em parede anterior..."
                    />
                  </div>
                  
                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <button 
                      onClick={() => analyzeCase(true)}
                      disabled={loading || !input.trim()}
                      className={cn(
                        "flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-white text-[#00478d] border border-[#00478d] rounded-lg font-bold shadow-sm transition-all active:scale-95 text-sm lg:text-base",
                        loading ? "opacity-70 cursor-not-allowed" : "hover:bg-[#f1f3f5]"
                      )}
                    >
                      <BookOpen size={18} />
                      <span>Consulta Completa</span>
                    </button>
                    <button 
                      onClick={() => analyzeCase(false)}
                      disabled={loading || !input.trim()}
                      className={cn(
                        "flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-[#00478d] text-white rounded-lg font-bold shadow-lg transition-all active:scale-95 text-sm lg:text-base",
                        loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-[#00478d]/20"
                      )}
                    >
                      {loading ? (
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                          <Zap size={18} />
                        </motion.div>
                      ) : (
                        <Zap size={18} />
                      )}
                      <span>{loading ? "Analisando..." : "Análise Rápida"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#727783] py-2">Filtros Rápidos:</span>
                  {['Emergência', 'Pediátrico', 'Geriátrico', 'Crônico'].map((filter) => (
                    <button 
                      key={filter}
                      className="px-4 py-1.5 rounded-full bg-[#d6e3ff] text-[#00468c] text-xs font-bold hover:bg-[#005eb8] hover:text-white transition-colors"
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </section>

              <section className="col-span-12 lg:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold font-headline text-[#191c1d]">Orientação Clínica</h3>
                  <span className="flex items-center gap-1 text-xs font-bold text-[#005412]">
                    <ShieldCheck size={14} />
                    Baseado em Evidências
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {guidance ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4"
                    >
                      {guidance.questions && guidance.questions.length > 0 && (
                        <div className="bg-[#fff4e5] border-l-4 border-[#ff9800] p-4 rounded-r-xl shadow-sm">
                          <div className="flex items-center gap-2 text-[#e65100] font-bold mb-3">
                            <AlertTriangle size={18} />
                            <span className="text-xs uppercase tracking-widest">Informações Faltantes</span>
                          </div>
                          <p className="text-xs text-[#424752] mb-3">O sistema identificou lacunas. Considere avaliar:</p>
                          <div className="space-y-2">
                            {guidance.questions.map((q, i) => (
                              <button 
                                key={i}
                                onClick={() => handleQuestionClick(q)}
                                className="w-full text-left p-2 bg-white/50 hover:bg-white rounded border border-[#ff9800]/20 text-[10px] font-bold text-[#424752] transition-colors flex items-center justify-between group"
                              >
                                <span>{q}</span>
                                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {showComplete && guidance.completeConsultation ? (
                        <div className="bg-white rounded-xl p-6 border border-[#00478d]/20 shadow-lg">
                          <div className="flex items-center justify-between mb-4 border-b border-[#c2c6d4]/10 pb-4">
                            <h4 className="text-lg font-bold font-headline text-[#00478d]">Roteiro de Consulta Completa</h4>
                            <button 
                              onClick={() => setShowComplete(false)}
                              className="text-[10px] font-black uppercase tracking-widest text-[#727783] hover:text-[#00478d]"
                            >
                              Ver Resumo
                            </button>
                          </div>
                          <div className="prose prose-sm max-w-none text-sm text-[#424752] font-sans leading-relaxed">
                            <Markdown>{guidance.completeConsultation}</Markdown>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div 
                            onClick={() => analyzeCase(true)}
                            className={cn(
                              "relative overflow-hidden bg-white rounded-xl p-6 border-l-4 shadow-sm group hover:translate-x-1 transition-transform cursor-pointer active:scale-[0.98]",
                              guidance.protocol.priority === 'critical' ? "border-[#ba1a1a]" : "border-[#00478d]"
                            )}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                guidance.protocol.priority === 'critical' ? "text-[#ba1a1a]" : "text-[#00478d]"
                              )}>
                                {guidance.protocol.priority === 'critical' ? "Protocolo Crítico" : "Protocolo Padrão"}
                              </span>
                              {guidance.protocol.priority === 'critical' && (
                                <AlertTriangle size={20} className="text-[#ba1a1a] fill-[#ba1a1a]/10" />
                              )}
                            </div>
                            <h4 className="text-lg font-bold mb-2 font-headline">{guidance.protocol.title}</h4>
                            <p className="text-sm text-[#424752] leading-relaxed">{guidance.protocol.description}</p>
                            <div className="mt-4 pt-4 border-t border-[#c2c6d4]/10 flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="text-xs text-[#727783] font-medium">Ref: {guidance.protocol.reference}</span>
                                <span className="text-[10px] text-[#00478d] font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Clique para ver protocolo completo →</span>
                              </div>
                              <ChevronRight size={18} className="text-[#00478d]" />
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-6 border-l-4 border-[#005eb8] shadow-sm group hover:translate-x-1 transition-transform">
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#005eb8]">Sugestão de Conduta</span>
                              <Pill size={20} className="text-[#005eb8]" />
                            </div>
                            <h4 className="text-lg font-bold mb-2 font-headline">{guidance.medication.title}</h4>
                            <p className="text-sm text-[#424752] leading-relaxed">{guidance.medication.description}</p>
                            <div className="mt-4 pt-4 border-t border-[#c2c6d4]/10 flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="text-xs text-[#727783] font-medium">Ferramenta Sugerida:</span>
                                <span className="text-sm font-bold text-[#00478d]">{guidance.medication.calculatorLabel}</span>
                              </div>
                              <button 
                                onClick={() => setActiveCalculator(guidance.medication.calculatorLabel)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#e7f3ff] text-[#00478d] rounded-lg text-xs font-bold hover:bg-[#00478d] hover:text-white transition-all group/btn"
                              >
                                <Calculator size={14} className="group-hover/btn:rotate-12 transition-transform" />
                                Abrir Calculadora
                              </button>
                            </div>
                          </div>

                          <div className="bg-[#f3f4f5]/50 border border-[#c2c6d4]/20 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 rounded-full bg-[#a3f69c] flex items-center justify-center">
                                <Lightbulb size={16} className="text-[#005312]" />
                              </div>
                              <h4 className="font-bold text-sm text-[#191c1d]">Diagnósticos Diferenciais</h4>
                            </div>
                            <ul className="space-y-2">
                              {guidance.differentials.map((diff, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-xs text-[#424752]">
                                  <div className="w-1 h-1 rounded-full bg-[#727783]"></div>
                                  {diff}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <FeedbackSection 
                            guidance={guidance} 
                            user={user} 
                            patientInput={input} 
                          />
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-[#c2c6d4]/30 rounded-xl text-[#727783]">
                      <Stethoscope size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-medium">Aguardando análise do caso...</p>
                    </div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          ) : activeView === 'patients' ? (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#00478d] font-headline">Gestão de Pacientes</h2>
                  <p className="text-sm lg:text-base text-[#424752] font-sans">Controle de pacientes atendidos durante o plantão.</p>
                </div>
                <button 
                  onClick={exportShiftData}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#005412] text-white rounded-lg font-bold shadow-md hover:bg-[#1d6e25] transition-all"
                >
                  <Download size={18} />
                  Exportar Plantão
                </button>
              </div>

              <div className="grid grid-cols-12 gap-8">
                {/* Registration Form */}
                <div className="col-span-12 lg:col-span-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c2c6d4]/10 space-y-4">
                    <h3 className="font-headline font-bold text-[#00478d]">Novo Atendimento</h3>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="Nome do Paciente"
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                        className="w-full px-4 py-3 bg-[#f3f4f5] border-none rounded-xl focus:ring-2 focus:ring-[#00478d] transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="Idade"
                        value={newPatient.age}
                        onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
                        className="w-full px-4 py-3 bg-[#f3f4f5] border-none rounded-xl focus:ring-2 focus:ring-[#00478d] transition-all"
                      />
                      <textarea 
                        placeholder="Queixa Principal / Observações"
                        value={newPatient.complaint}
                        onChange={(e) => setNewPatient({...newPatient, complaint: e.target.value})}
                        className="w-full h-32 px-4 py-3 bg-[#f3f4f5] border-none rounded-xl focus:ring-2 focus:ring-[#00478d] transition-all resize-none"
                      />
                      <button 
                        onClick={registerPatient}
                        className="w-full py-3 bg-[#00478d] text-white rounded-xl font-bold hover:bg-[#005eb8] transition-all"
                      >
                        Registrar Paciente
                      </button>
                    </div>
                  </div>
                </div>

                {/* Patient List */}
                <div className="col-span-12 lg:col-span-8 space-y-4">
                  {patients.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-[#c2c6d4]/30 rounded-2xl text-[#727783]">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-medium">Nenhum paciente registrado neste plantão.</p>
                    </div>
                  ) : (
                    patients.map((patient) => (
                      <div key={patient.id} className="bg-white p-6 rounded-2xl shadow-sm border border-[#c2c6d4]/10 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-bold text-[#191c1d]">{patient.name}</h4>
                            <p className="text-xs text-[#727783] font-medium">{patient.age} anos • {new Date(patient.timestamp).toLocaleTimeString()}</p>
                          </div>
                          <button 
                            onClick={() => setPatients(patients.filter(p => p.id !== patient.id))}
                            className="text-[#ba1a1a] hover:bg-[#ffdad6] p-2 rounded-full transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        
                        <div className="bg-[#f3f4f5] p-4 rounded-xl">
                          <p className="text-sm text-[#424752] italic">&quot;{patient.complaint}&quot;</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[#00478d]">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-bold uppercase tracking-widest">Procedimentos Realizados</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {patient.procedures.map((proc, idx) => (
                              <span key={idx} className="px-3 py-1 bg-[#d6e3ff] text-[#00468c] text-[10px] font-bold rounded-full">
                                {proc}
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Adicionar procedimento..."
                              value={procedureInput[patient.id] || ''}
                              onChange={(e) => setProcedureInput({ ...procedureInput, [patient.id]: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && addProcedure(patient.id)}
                              className="flex-1 px-4 py-2 bg-[#f3f4f5] border-none rounded-lg text-xs focus:ring-2 focus:ring-[#00478d]"
                            />
                            <button 
                              onClick={() => addProcedure(patient.id)}
                              className="px-4 py-2 bg-[#00478d] text-white rounded-lg text-xs font-bold"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-[#727783]">
              <BookOpen size={64} className="mb-4 opacity-20" />
              <h2 className="text-2xl font-bold font-headline">Biblioteca</h2>
              <p>Conteúdo da biblioteca em breve.</p>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 border-t border-[#c2c6d4]/10 pt-8 flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex -space-x-2">
                {[1, 2].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[#e1e3e4] overflow-hidden relative">
                    <Image 
                      src={`https://picsum.photos/seed/doc${i}/32/32`} 
                      alt="Doctor" 
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-[#005eb8] flex items-center justify-center text-[10px] text-white font-bold">+3</div>
              </div>
              <p className="text-xs text-[#424752] max-w-xs">Especialistas disponíveis para consultoria em tempo real.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
              <button className="text-xs font-bold text-[#00478d] flex items-center gap-1 hover:underline">
                <History size={14} />
                Ver Histórico
              </button>
              <button className="text-xs font-bold text-[#00478d] flex items-center gap-1 hover:underline">
                <Printer size={14} />
                Imprimir Protocolo
              </button>
            </div>
          </footer>
        </div>
      </main>

      {/* Emergency Overlay Mockup */}
      <AnimatePresence>
        {guidance?.protocol.priority === 'critical' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-[#ba1a1a]/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#ffdad6] flex items-center justify-center">
                <Siren size={24} className="text-[#ba1a1a]" />
              </div>
              <div>
                <p className="text-xs font-black text-[#ba1a1a] uppercase tracking-widest">Alerta de Tempo</p>
                <p className="text-sm font-medium text-[#191c1d]">Ação imediata recomendada.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calculator Modal */}
      <AnimatePresence>
        {activeCalculator && (
          <DosageCalculator 
            type={activeCalculator} 
            onClose={() => setActiveCalculator(null)} 
          />
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
