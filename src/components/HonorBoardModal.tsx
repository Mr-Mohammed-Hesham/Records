import React, { useState, useMemo, useRef } from 'react';
import { 
  Award, 
  Sparkles, 
  Download, 
  Copy, 
  Share2, 
  Check, 
  X, 
  Filter, 
  Calendar, 
  RotateCcw,
  User, 
  BookOpen, 
  Crown, 
  Medal, 
  MessageCircle, 
  Printer, 
  Layers,
  GraduationCap,
  Star,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { Student, Exam, ExamResult, TeacherSettings } from '../types';
import { calculateStudentStats } from '../utils/grading';
import { DEFAULT_SETTINGS } from '../services/firebase';

interface HonorBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  exams: Exam[];
  allResults: ExamResult[];
  settings?: TeacherSettings;
  initialGrade?: string;
  initialExamId?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

interface RankedStudent {
  rank: number;
  student: Student;
  score: number;
  percentage: number;
  totalExams?: number;
  examTitle?: string;
  gradeLabel: string;
}

export const HonorBoardModal: React.FC<HonorBoardModalProps> = ({
  isOpen,
  onClose,
  students = [],
  exams = [],
  allResults = [],
  settings = DEFAULT_SETTINGS,
  initialGrade,
  initialExamId,
  initialStartDate,
  initialEndDate,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);

  // Configuration States
  const [boardType, setBoardType] = useState<'overall' | 'exam'>(initialExamId ? 'exam' : 'overall');
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || (exams[0]?.id || ''));
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade || 'all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(initialStartDate || '');
  const [endDate, setEndDate] = useState<string>(initialEndDate || '');
  const [limitCount, setLimitCount] = useState<number>(5);
  const [minPercentage, setMinPercentage] = useState<number>(85);
  const [boardTheme, setBoardTheme] = useState<'dark-gold' | 'classic-ivory' | 'royal-blue'>('dark-gold');

  // Text & Signature Customization
  const [title, setTitle] = useState<string>('لوحة شرف أوائل الطلبة والمتفوقين');
  const [customSubtitle, setCustomSubtitle] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>(settings.teacherName || 'Mr. Mohamed Hesham');
  const [signatureText, setSignatureText] = useState<string>(() => {
    if (settings.teacherName?.includes('Mohamed') || settings.teacherName?.includes('محمد')) {
      return 'محمد هشام';
    }
    return settings.teacherName || 'محمد هشام';
  });
  const [signatureStyle, setSignatureStyle] = useState<'arabic_calligraphy' | 'cursive_script' | 'official_badge'>('arabic_calligraphy');
  const [teacherRole, setTeacherRole] = useState<string>('معلم المادة');
  const [schoolName, setSchoolName] = useState<string>('');
  const [congratsMessage, setCongratsMessage] = useState<string>(
    'يسرنا تهنئة طلبتنا المتميزين وأولياء أمورهم الكرام على هذا الإنجاز المشرف والتفوق المستحق، متمنين لهم دوام التألق والريادة الأكاديمية.'
  );
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [showDate, setShowDate] = useState<boolean>(true);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Grade list from settings & students
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    settings.grades?.forEach(g => set.add(g));
    students.forEach(s => { if (s.grade) set.add(s.grade); });
    return Array.from(set);
  }, [settings.grades, students]);

  // Date Filtered Results
  const dateFilteredResults = useMemo(() => {
    return allResults.filter(r => {
      const rDate = r.examDate || exams.find(e => e.id === r.examId)?.date || '';
      if (startDate && rDate && rDate < startDate) return false;
      if (endDate && rDate && rDate > endDate) return false;
      return true;
    });
  }, [allResults, exams, startDate, endDate]);

  // Date Filtered Exams
  const filteredExams = useMemo(() => {
    return exams.filter(ex => {
      if (startDate && ex.date && ex.date < startDate) return false;
      if (endDate && ex.date && ex.date > endDate) return false;
      return true;
    });
  }, [exams, startDate, endDate]);

  // Period label for display on the board
  const periodLabel = useMemo(() => {
    if (!startDate && !endDate) return '';
    if (startDate && endDate) {
      return `الفترة: ${startDate} إلى ${endDate}`;
    }
    if (startDate) {
      return `ابتداءً من: ${startDate}`;
    }
    return `حتى تاريخ: ${endDate}`;
  }, [startDate, endDate]);

  // Quick preset helper
  const handleSetDatePreset = (preset: 'all' | 'this_month' | 'last_30' | 'last_7') => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_month') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const firstDay = `${year}-${month}-01`;
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'last_30') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'last_7') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // Selected Exam (if exam mode)
  const currentExam = useMemo(() => {
    if (filteredExams.length > 0) {
      const match = filteredExams.find(e => e.id === selectedExamId);
      if (match) return match;
      return filteredExams[0];
    }
    return exams.find(e => e.id === selectedExamId) || exams[0] || null;
  }, [filteredExams, exams, selectedExamId]);

  // Compute Ranked Students
  const rankedStudents = useMemo<RankedStudent[]>(() => {
    if (boardType === 'overall') {
      // Overall GPA across date-filtered exams
      let list = students.filter(st => {
        if (selectedGrade !== 'all' && st.grade !== selectedGrade) return false;
        if (selectedTrack !== 'all' && st.track && st.track !== selectedTrack) return false;
        return true;
      });

      const withStats = list.map(st => {
        const studentResults = dateFilteredResults.filter(r => r.studentDocId === st.id);
        const stats = calculateStudentStats(studentResults, settings.gradingScale);
        return {
          student: st,
          percentage: stats.averagePercentage,
          score: stats.averageScore,
          totalExams: stats.totalExams,
        };
      });

      // Filter by min percentage and at least 1 exam in the period
      const filtered = withStats.filter(item => item.totalExams > 0 && item.percentage >= minPercentage);

      // Sort by highest percentage, then highest total exams
      filtered.sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return b.totalExams - a.totalExams;
      });

      const sliced = limitCount > 0 ? filtered.slice(0, limitCount) : filtered;

      return sliced.map((item, idx) => ({
        rank: idx + 1,
        student: item.student,
        score: item.score,
        percentage: item.percentage,
        totalExams: item.totalExams,
        gradeLabel: item.percentage >= 95 ? 'امتياز مع مرتبة الشرف' : item.percentage >= 90 ? 'ممتاز مرتفع' : 'متفوق متميز',
      }));
    } else {
      // Specific Exam Top Students
      if (!currentExam) return [];

      const examResults = dateFilteredResults.filter(r => r.examId === currentExam.id);
      const studentMap = new Map<string, Student>();
      students.forEach(s => studentMap.set(s.id, s));

      const validList: { student: Student; result: ExamResult }[] = [];

      examResults.forEach(r => {
        const st = studentMap.get(r.studentDocId);
        if (!st) return;
        if (selectedGrade !== 'all' && st.grade !== selectedGrade) return;
        if (selectedTrack !== 'all' && st.track && st.track !== selectedTrack) return;
        if (r.percentage < minPercentage) return;
        validList.push({ student: st, result: r });
      });

      validList.sort((a, b) => b.result.percentage - a.result.percentage);

      const sliced = limitCount > 0 ? validList.slice(0, limitCount) : validList;

      return sliced.map((item, idx) => ({
        rank: idx + 1,
        student: item.student,
        score: item.result.score,
        percentage: item.result.percentage,
        examTitle: currentExam.title,
        gradeLabel: item.result.percentage >= 95 ? 'الدرجة الكاملة / امتياز' : item.result.percentage >= 90 ? 'ممتاز مرتفع' : 'متفوق متميز',
      }));
    }
  }, [
    boardType,
    students,
    dateFilteredResults,
    selectedGrade,
    selectedTrack,
    minPercentage,
    limitCount,
    settings.gradingScale,
    currentExam,
  ]);

  if (!isOpen) return null;

  // Active Subject display
  const displaySubject = boardType === 'exam' && currentExam 
    ? currentExam.subject 
    : (settings.defaultSubject || 'الرياضيات');

  const displayGrade = selectedGrade === 'all' 
    ? 'جميع الصفوف' 
    : selectedGrade;

  const displayTrack = selectedTrack === 'all' 
    ? '' 
    : `• مسار ${selectedTrack}`;

  const displayDate = new Date().toLocaleDateString('ar-AE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Export handlers
  const handleDownloadImage = async () => {
    if (!boardRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(boardRef.current, {
        cacheBust: false,
        skipFonts: true,
        filter: (node: HTMLElement) => node.tagName !== 'LINK',
        pixelRatio: 2, // Ultra-sharp 2x resolution
        quality: 0.95,
        backgroundColor: boardTheme === 'classic-ivory' ? '#fbf9f4' : boardTheme === 'royal-blue' ? '#091326' : '#070b14',
      });

      const cleanTitle = title.replace(/\s+/g, '_');
      const cleanGrade = selectedGrade === 'all' ? 'عام' : selectedGrade.replace(/\s+/g, '_');
      const filename = `لوحة_شرف_${cleanGrade}_${new Date().toISOString().split('T')[0]}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      showToast('تم تحميل لوحة الشرف بجودة فائقة (Ultra-HD) بنجاح!');
    } catch (err) {
      console.error('Download error:', err);
      showToast('حدث خطأ أثناء إنشاء الصورة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!boardRef.current) return;
    try {
      setIsExporting(true);
      const blob = await toBlob(boardRef.current, {
        cacheBust: false,
        skipFonts: true,
        filter: (node: HTMLElement) => node.tagName !== 'LINK',
        pixelRatio: 2,
        quality: 0.95,
        backgroundColor: boardTheme === 'classic-ivory' ? '#fbf9f4' : boardTheme === 'royal-blue' ? '#091326' : '#070b14',
      });

      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 3000);
        showToast('تم نسخ الصورة للحافظة! يمكنك الآن لصقها مباشرة في واتساب (Ctrl+V)');
      } else {
        // Fallback to download
        handleDownloadImage();
      }
    } catch (err) {
      console.error('Clipboard copy error:', err);
      // Fallback
      handleDownloadImage();
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareWhatsApp = () => {
    // Generate polite parent message
    const subjectText = displaySubject;
    const gradeText = selectedGrade === 'all' ? 'أبنائنا وبناتنا' : `طلبة ${selectedGrade}`;
    const periodMsg = periodLabel ? `\n📅 *${periodLabel}*` : '';
    const topStudentsList = rankedStudents
      .slice(0, 5)
      .map(s => `🏅 المركز ${s.rank}: ${s.student.name} (${s.percentage}%)`)
      .join('\n');

    const msg = `🏆 *${title}* 🏆\n\n` +
      `السلام عليكم ورحمة الله وبركاته،\n` +
      `أولياء أمورنا الأفاضل، يسرنا أن نشارككم لوحة شرف المتفوقين في مادة *${subjectText}* لـ *${gradeText}*${periodMsg} تقديراً لاجتهادهم وتميزهم المشرف:\n\n` +
      `${topStudentsList}\n\n` +
      `نسأل الله لأبنائنا وبناتنا دوام التفوق والنجاح الباهر 🌟\n` +
      `مع تحيات: *${teacherName}* (${teacherRole})`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    
    // Also prompt image download if they want to attach it
    handleDownloadImage();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* Modal Top Header */}
        <div className="shrink-0 p-4 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>تصدير لوحة شرف المتفوقين كصورة</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  Ultra-HD
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                تصميم وبطاقة رسمية معتمدة بتوقيع الأستاذ جاهزة للمشاركة مع أولياء الأمور
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content (Controls + Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Sidebar (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4 text-right">
            
            {/* Source Tab: Overall GPA vs Exam */}
            <div className="bg-slate-800/60 p-1 rounded-2xl border border-slate-700/60 flex">
              <button
                type="button"
                onClick={() => setBoardType('overall')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  boardType === 'overall'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>المعدل التراكمي العام</span>
              </button>
              <button
                type="button"
                onClick={() => setBoardType('exam')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  boardType === 'exam'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>امتحان محدد</span>
              </button>
            </div>

            {/* If Exam chosen, select exam */}
            {boardType === 'exam' && (
              <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  اختر الامتحان المراد تصدير أوائله:
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white focus:ring-2 focus:ring-amber-500/30 text-right cursor-pointer"
                >
                  {filteredExams.length > 0 ? (
                    filteredExams.map(ex => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.grade} - {ex.subject}{ex.date ? ` • ${ex.date}` : ''})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>لا توجد امتحانات في هذه الفترة الزمنية</option>
                  )}
                </select>
              </div>
            )}

            {/* Filter by Date Range (From - To) */}
            <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>الفترة الزمنية للاختبارات (من - إلى)</span>
                </h3>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                    title="إعادة تعيين الفترة"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>إعادة ضبط</span>
                  </button>
                )}
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('all')}
                  className={`px-1.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer text-center ${
                    !startDate && !endDate
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-xs'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  كافة الفترات
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('this_month')}
                  className="px-1.5 py-1 text-[11px] font-bold rounded-lg border bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-amber-300 transition cursor-pointer text-center"
                >
                  هذا الشهر
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('last_30')}
                  className="px-1.5 py-1 text-[11px] font-bold rounded-lg border bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-amber-300 transition cursor-pointer text-center"
                >
                  آخر 30 يوم
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('last_7')}
                  className="px-1.5 py-1 text-[11px] font-bold rounded-lg border bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-amber-300 transition cursor-pointer text-center"
                >
                  آخر 7 أيام
                </button>
              </div>

              {/* Custom Date Pickers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">من تاريخ:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-right focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-right focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Context info tag */}
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                <span>النتائج المشمولة: <strong className="text-amber-400">{dateFilteredResults.length}</strong> درجة</span>
                {periodLabel ? (
                  <span className="text-amber-400 font-mono truncate max-w-[160px]" title={periodLabel}>
                    {periodLabel}
                  </span>
                ) : (
                  <span className="text-slate-500">العام الدراسي كاملاً</span>
                )}
              </div>
            </div>

            {/* Filter by Grade & Track */}
            <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>تصفية الطلاب</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">الصف الدراسي:</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-right cursor-pointer"
                  >
                    <option value="all">جميع الصفوف</option>
                    {availableGrades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">المسار:</label>
                  <select
                    value={selectedTrack}
                    onChange={(e) => setSelectedTrack(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-right cursor-pointer"
                  >
                    <option value="all">الكل</option>
                    <option value="عام">عام</option>
                    <option value="متقدم">متقدم</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">عدد الأوائل:</label>
                  <select
                    value={limitCount}
                    onChange={(e) => setLimitCount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-right cursor-pointer"
                  >
                    <option value={3}>أفضل 3 (منصة التتويج)</option>
                    <option value={5}>أفضل 5 طلاب</option>
                    <option value={10}>أفضل 10 طلاب</option>
                    <option value={15}>أفضل 15 طالباً</option>
                    <option value={0}>جميع المتفوقين</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">الحد الأدنى للنسبة:</label>
                  <select
                    value={minPercentage}
                    onChange={(e) => setMinPercentage(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-right cursor-pointer"
                  >
                    <option value={90}>≥ 90% (امتياز فقط)</option>
                    <option value={85}>≥ 85% (أوائل ومتميزين)</option>
                    <option value={80}>≥ 80% (جيد جداً فما فوق)</option>
                    <option value={70}>≥ 70% (جميع الناجحين بتفوق)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Visual Style Theme */}
            <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="block text-xs font-bold text-amber-400">
                نمط وألوان التصميم:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBoardTheme('dark-gold')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    boardTheme === 'dark-gold'
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  <span className="block text-xs">فخامة ملكية</span>
                  <span className="text-[10px] text-amber-400/80">ذهبي كحلي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBoardTheme('royal-blue')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    boardTheme === 'royal-blue'
                      ? 'border-blue-400 bg-blue-500/10 text-blue-300 font-bold'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  <span className="block text-xs">أزرق ملكي</span>
                  <span className="text-[10px] text-blue-400/80">ياقوتي وفضي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBoardTheme('classic-ivory')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    boardTheme === 'classic-ivory'
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  <span className="block text-xs">عاجي راقي</span>
                  <span className="text-[10px] text-emerald-400/80">طباعة وشهادات</span>
                </button>
              </div>
            </div>

            {/* Customization: Title, Teacher Name, Signature */}
            <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>بيانات المعلم والاعتماد</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">اسم المعلم المطبوع:</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Mr. Mohamed Hesham"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-right focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">نص التوقيع اليدوي:</label>
                  <input
                    type="text"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    placeholder="محمد هشام"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold text-right focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">نمط وشكل التوقيع:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSignatureStyle('arabic_calligraphy')}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                      signatureStyle === 'arabic_calligraphy'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    رقعة يدوي
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureStyle('cursive_script')}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                      signatureStyle === 'cursive_script'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    انسيابي حديث
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureStyle('official_badge')}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                      signatureStyle === 'official_badge'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    شارة اعتماد
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">الصفة / اللقب:</label>
                  <input
                    type="text"
                    value={teacherRole}
                    onChange={(e) => setTeacherRole(e.target.value)}
                    placeholder="معلم المادة"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-right focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">اسم المدرسة (اختياري):</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="مدرستنا العامرة"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-right focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={(e) => setShowSignature(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <span>إظهار توقيع الأستاذ المعتمد</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStamp}
                    onChange={(e) => setShowStamp(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <span>إظهار ختم التميز والاعتماد الذهبي</span>
                </label>
              </div>
            </div>

            {/* Congratulatory note */}
            <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                رسالة التهنئة الموجهة لأولياء الأمور:
              </label>
              <textarea
                rows={2}
                value={congratsMessage}
                onChange={(e) => setCongratsMessage(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 text-right focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Board Live Preview (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col items-center">
            
            <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-400 px-1">
              <span>معاينة البطاقة قبل التصدير (ستُصدّر بجودة Ultra-HD):</span>
              <span className="text-amber-400 font-bold">
                {rankedStudents.length} طلاب متفوقين
              </span>
            </div>

            {/* Scrollable container for preview */}
            <div className="w-full overflow-x-auto bg-slate-950/80 p-2 sm:p-4 rounded-3xl border border-slate-800 flex justify-center shadow-inner">
              
              {/* THE EXPORTABLE BOARD CONTAINER */}
              <div
                ref={boardRef}
                style={{ width: '740px' }}
                className={`p-7 rounded-3xl transition-all select-none text-right ${
                  boardTheme === 'classic-ivory'
                    ? 'bg-[#fbf9f4] text-slate-900 border-4 border-amber-600/40 shadow-xl'
                    : boardTheme === 'royal-blue'
                    ? 'bg-[#091326] text-white border-4 border-blue-500/40 shadow-2xl'
                    : 'bg-[#070b14] text-white border-4 border-amber-500/40 shadow-2xl'
                }`}
              >
                {/* Decorative Inner Border */}
                <div className={`p-6 rounded-2xl border-2 relative overflow-hidden ${
                  boardTheme === 'classic-ivory'
                    ? 'border-amber-700/20 bg-white/70'
                    : boardTheme === 'royal-blue'
                    ? 'border-blue-400/20 bg-blue-950/30'
                    : 'border-amber-400/20 bg-slate-900/60'
                }`}>
                  
                  {/* Subtle Background Radial Glow */}
                  <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Corner Ornaments */}
                  <div className="absolute top-2 right-2 text-amber-500/40 text-xs font-serif">✦</div>
                  <div className="absolute top-2 left-2 text-amber-500/40 text-xs font-serif">✦</div>
                  <div className="absolute bottom-2 right-2 text-amber-500/40 text-xs font-serif">✦</div>
                  <div className="absolute bottom-2 left-2 text-amber-500/40 text-xs font-serif">✦</div>

                  {/* Top Header Section */}
                  <div className="flex items-center justify-between pb-4 border-b border-amber-500/20">
                    <div>
                      {schoolName ? (
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{schoolName}</p>
                      ) : (
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">سجل التميز والإنجاز الأكاديمي</p>
                      )}
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                        مادة {displaySubject}
                      </p>
                    </div>

                    {/* Laurels & Crest */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Crown className="w-7 h-7" />
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-lg inline-block">
                        {displayGrade} {displayTrack}
                      </span>
                      {periodLabel && (
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-mono text-amber-500 dark:text-amber-300 font-semibold">
                          <Calendar className="w-3 h-3 inline shrink-0" />
                          <span>{periodLabel}</span>
                        </div>
                      )}
                      {showDate && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          {displayDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Main Title & Subtitle */}
                  <div className="text-center py-5">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>وسام التميز والتفوق المستمر</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </div>

                    <h1 
                      style={{ fontFamily: "'Cairo', sans-serif" }}
                      className={`text-2xl sm:text-3xl font-black tracking-tight ${
                        boardTheme === 'classic-ivory'
                          ? 'text-slate-900'
                          : 'text-white'
                      }`}
                    >
                      {title}
                    </h1>

                    {/* Subtitle / Exam Title */}
                    <p className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
                      {boardType === 'exam' && currentExam
                        ? `نتائج أوائل: ${currentExam.title} (الدرجة الكاملة: ${currentExam.totalScore})${periodLabel ? ` • ${periodLabel}` : ''}`
                        : customSubtitle || `لوحة الشرف العامة لأوائل الطلبة • ${displaySubject}${periodLabel ? ` (${periodLabel})` : ''}`}
                    </p>

                    {/* Encouraging Note for Parents & Students */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto mt-2 leading-relaxed font-medium">
                      "{congratsMessage}"
                    </p>
                  </div>

                  {/* Top Students Roster / Podium */}
                  <div className="space-y-2.5 my-3">
                    {rankedStudents.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-xs">
                        لا يوجد طلاب في نطاق التفوق المحدد ({minPercentage}% فأعلى). يمكنك تخفيض نسبة التفوق من الإعدادات.
                      </div>
                    ) : (
                      rankedStudents.map((item) => {
                        const isFirst = item.rank === 1;
                        const isSecond = item.rank === 2;
                        const isThird = item.rank === 3;

                        return (
                          <div
                            key={item.student.id}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                              isFirst
                                ? boardTheme === 'classic-ivory'
                                  ? 'bg-amber-500/15 border-amber-400/60 shadow-sm'
                                  : 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-amber-400/50 shadow-md shadow-amber-500/10'
                                : isSecond
                                ? boardTheme === 'classic-ivory'
                                  ? 'bg-slate-100 border-slate-300'
                                  : 'bg-slate-800/60 border-slate-700/60'
                                : isThird
                                ? boardTheme === 'classic-ivory'
                                  ? 'bg-orange-50 border-orange-200'
                                  : 'bg-orange-950/20 border-orange-700/40'
                                : boardTheme === 'classic-ivory'
                                ? 'bg-white/80 border-slate-200'
                                : 'bg-slate-900/50 border-slate-800'
                            }`}
                          >
                            {/* Right: Rank Badge & Student Details */}
                            <div className="flex items-center gap-3">
                              {/* Rank Badge */}
                              <div
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black font-mono text-sm shrink-0 shadow-sm ${
                                  isFirst
                                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 ring-2 ring-amber-400'
                                    : isSecond
                                    ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-900'
                                    : isThird
                                    ? 'bg-gradient-to-tr from-amber-700 to-amber-500 text-white'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : item.rank}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className={`font-extrabold text-sm sm:text-base ${
                                    boardTheme === 'classic-ivory' ? 'text-slate-900' : 'text-white'
                                  }`}>
                                    {item.student.name}
                                  </h3>
                                  {isFirst && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full">
                                      المركز الأول
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{item.student.grade}</span>
                                  {item.student.track && <span>• مسار {item.student.track}</span>}
                                  {item.student.studentId && <span>• كود: {item.student.studentId}</span>}
                                </p>
                              </div>
                            </div>

                            {/* Left: Score & Recognition Pill */}
                            <div className="text-left flex items-center gap-3">
                              <div className="hidden sm:block text-right">
                                <span className={`text-[11px] font-bold block ${
                                  item.percentage >= 95 ? 'text-emerald-500' : 'text-amber-500'
                                }`}>
                                  {item.gradeLabel}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {boardType === 'overall' 
                                    ? `${item.totalExams} اختبارات مقيمة` 
                                    : `الدرجة: ${item.score}/${currentExam?.totalScore || 100}`}
                                </span>
                              </div>

                              <div className="bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-xl text-center min-w-[65px]">
                                <span className="text-base font-black font-mono text-amber-500 block leading-tight">
                                  {item.percentage}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer & Teacher Signature / Stamp Block */}
                  <div className="mt-6 pt-5 border-t border-amber-500/20 grid grid-cols-3 items-center">
                    
                    {/* Right: Official Accreditation Statement */}
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        الاعتماد الرسمي
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        صدرت هذه اللوحة إلكترونياً تقديراً للمثابرة والتفوق الدراسي المشرف.
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>بيانات موثقة ومعتمدة</span>
                      </div>
                    </div>

                    {/* Center: Golden Excellence Seal / Stamp */}
                    <div className="flex justify-center">
                      {showStamp && (
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-500/60 p-1 flex items-center justify-center relative rotate-[-6deg]">
                          <div className="w-full h-full rounded-full border border-amber-500/40 bg-amber-500/10 flex flex-col items-center justify-center text-center p-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mb-0.5" />
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter leading-none">
                              ختم التميز
                            </span>
                            <span className="text-[7px] text-amber-600 dark:text-amber-400 mt-0.5 font-bold">
                              EXCELLENCE
                            </span>
                            <span className="text-[7px] text-slate-400 font-mono">
                              2025/2026
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Left: Teacher Signature */}
                    <div className="flex flex-col items-center justify-center text-center min-w-[150px]">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {teacherRole}
                      </p>
                      <p className={`text-xs sm:text-sm font-extrabold mt-0.5 whitespace-nowrap ${
                        boardTheme === 'classic-ivory' ? 'text-slate-900' : 'text-amber-400'
                      }`}>
                        {teacherName}
                      </p>

                      {showSignature && (
                        <div className="mt-1.5 flex flex-col items-center justify-center w-full">
                          {signatureStyle === 'official_badge' ? (
                            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-1.5 mt-1 shadow-xs">
                              <span className="text-xs font-black text-amber-500 whitespace-nowrap">
                                {signatureText || teacherName}
                              </span>
                              <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-mono font-bold">
                                معتمد ✓
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              {/* Signature text - guaranteed single line */}
                              <div 
                                className="whitespace-nowrap select-none font-bold text-amber-500 dark:text-amber-300 px-3 tracking-wide"
                                style={{ 
                                  fontFamily: signatureStyle === 'cursive_script' 
                                    ? "'Plus Jakarta Sans', cursive, sans-serif" 
                                    : "'Aref Ruqaa', 'Cairo', serif",
                                  fontSize: '22px',
                                  lineHeight: '1.2',
                                  transform: 'rotate(-2.5deg)',
                                  display: 'inline-block',
                                }}
                              >
                                {signatureText || teacherName}
                              </div>

                              {/* Flowing pen stroke swoosh */}
                              <svg 
                                className="w-28 h-3.5 mt-0.5 text-amber-500 dark:text-amber-400 overflow-visible" 
                                viewBox="0 0 110 14" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path 
                                  d="M 5 6 C 35 14, 75 3, 105 8" 
                                  stroke="currentColor" 
                                  strokeWidth="1.8" 
                                  strokeLinecap="round" 
                                />
                                <path 
                                  d="M 22 10 C 50 13, 80 8, 96 10" 
                                  stroke="currentColor" 
                                  strokeWidth="0.8" 
                                  strokeLinecap="round" 
                                  opacity="0.6" 
                                />
                              </svg>

                              <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400 font-mono whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>توقيع رسمي معتمد</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              </div>

            </div>

            {/* Hint below preview */}
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              💡 نصيحة: يمكنك النقر على زر "نسخ الصورة" للصقها فوراً في واتساب ويب أو تليجرام، أو تحميلها كملف صورة عالي الدقة لإرسالها لأولياء الأمور.
            </p>
          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="shrink-0 p-4 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Copy image button */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleCopyImage}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ للحافظة!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>نسخ الصورة (للواتساب)</span>
                </>
              )}
            </button>

            {/* Share to WhatsApp with message */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              <span>مشاركة عبر واتساب</span>
            </button>

            {/* Download Ultra-HD Image */}
            <button
              id="download-honor-board-image-btn"
              type="button"
              disabled={isExporting}
              onClick={handleDownloadImage}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:scale-95 rounded-xl shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'جاري تجهيز الصورة...' : 'تحميل الصورة فائقة الدقة (PNG)'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Floating Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
