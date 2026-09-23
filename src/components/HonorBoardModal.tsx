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
  FileSpreadsheet,
  Type,
  Palette,
  Minus,
  Plus,
  ChevronDown,
  Flame,
  Zap,
  Target
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

export interface FontOption {
  id: string;
  name: string;
  family: string;
  category: string;
  desc: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'cairo', name: 'خط كايرو (Cairo)', family: "'Cairo', sans-serif", category: 'عصري وواضح', desc: 'الخط الافتراضي، وضوح فائق وتناسق عالي' },
  { id: 'amiri', name: 'الخط الأميري (Amiri)', family: "'Amiri', serif", category: 'كلاسيكي رسمي', desc: 'خط نسخ تراثي فاخر مخصص للشهادات الرسمية' },
  { id: 'tajawal', name: 'خط تجوال (Tajawal)', family: "'Tajawal', sans-serif", category: 'هندسي أنيق', desc: 'خط رشيق متوازن ومريح جداً للقراءة' },
  { id: 'almarai', name: 'خط المراعي (Almarai)', family: "'Almarai', sans-serif", category: 'حديث وجذاب', desc: 'مستقيم وعالي المقروئية لأسماء الطلاب' },
  { id: 'aref', name: 'خط الرقعة (Aref Ruqaa)', family: "'Aref Ruqaa', serif", category: 'تراثي فني', desc: 'خط رقعة أصيل يحاكي التخطيط بالريشة' },
  { id: 'noto-kufi', name: 'خط كوفي حديث (Noto Kufi)', family: "'Noto Kufi Arabic', sans-serif", category: 'كوفي رسمي', desc: 'طابع كوفي هندسي متقن للشهادات واللوحات' },
  { id: 'ibm-plex', name: 'خط آي بي إم (IBM Plex)', family: "'IBM Plex Sans Arabic', sans-serif", category: 'أكاديمي معتمد', desc: 'رسمي متزن وواضح للتقارير واللوحات' },
  { id: 'changa', name: 'خط تشانجا (Changa)', family: "'Changa', sans-serif", category: 'عريض بارز', desc: 'عريض وقوي للعناوين البارزة والتكريم' },
];

export const THEME_PRESETS = [
  { id: 'dark-gold', name: 'فخامة ملكية', bg: '#070b14', text: '#ffffff', accent: '#f59e0b', desc: 'كحلي وذهبي' },
  { id: 'royal-blue', name: 'أزرق ملكي', bg: '#091326', text: '#ffffff', accent: '#38bdf8', desc: 'ياقوتي وسماوي' },
  { id: 'classic-ivory', name: 'عاجي راقي', bg: '#fbf9f4', text: '#0f172a', accent: '#b45309', desc: 'ورق شهادات' },
  { id: 'emerald-night', name: 'زمردي فاخر', bg: '#061a14', text: '#ffffff', accent: '#10b981', desc: 'أخضر داكن' },
  { id: 'burgundy-royal', name: 'عنابي إمبراطوري', bg: '#1a080d', text: '#ffffff', accent: '#fbbf24', desc: 'أحمر داكن' },
  { id: 'pure-white', name: 'أبيض ناصع', bg: '#ffffff', text: '#0f172a', accent: '#d97706', desc: 'موفر للحبر' },
];

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
  const [boardType, setBoardType] = useState<'overall' | 'most_active' | 'combined' | 'exam'>(initialExamId ? 'exam' : 'overall');
  const [includeMostActiveSection, setIncludeMostActiveSection] = useState<boolean>(true);
  const [mostActiveLimit, setMostActiveLimit] = useState<number>(3);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || (exams[0]?.id || ''));
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade || 'all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(initialStartDate || '');
  const [endDate, setEndDate] = useState<string>(initialEndDate || '');
  const [limitCount, setLimitCount] = useState<number>(5);
  const [minPercentage, setMinPercentage] = useState<number>(85);
  const [boardTheme, setBoardTheme] = useState<'dark-gold' | 'classic-ivory' | 'royal-blue'>('dark-gold');

  // Typography and Font Customization
  const [fontFamily, setFontFamily] = useState<string>("'Cairo', sans-serif");
  const [fontSizeScale, setFontSizeScale] = useState<number>(100);

  // Background and Text Color Customization
  const [bgColor, setBgColor] = useState<string>('#070b14');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [accentColor, setAccentColor] = useState<string>('#f59e0b');

  // Detect whether background is light or dark for optimal contrast
  const isLightBg = useMemo(() => {
    const hex = bgColor.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 155;
  }, [bgColor]);

  // Apply theme preset
  const handleApplyPreset = (preset: typeof THEME_PRESETS[0]) => {
    setBoardTheme(preset.id as any);
    setBgColor(preset.bg);
    setTextColor(preset.text);
    setAccentColor(preset.accent);
  };

  // Reset colors & typography
  const handleResetAppearance = () => {
    setFontFamily("'Cairo', sans-serif");
    setFontSizeScale(100);
    setBoardTheme('dark-gold');
    setBgColor('#070b14');
    setTextColor('#ffffff');
    setAccentColor('#f59e0b');
  };

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

  // Handle changing board type with dynamic titles and messages
  const handleBoardTypeChange = (newType: 'overall' | 'most_active' | 'combined' | 'exam') => {
    setBoardType(newType);
    if (newType === 'most_active') {
      setTitle('لوحة شرف فرسان الالتزام والمثابرة');
      setCongratsMessage('نبارك لأبطال المثابرة وفرسان الالتزام على حرصهم الدؤوب ومشاركتهم الفعالة في حل وإنجاز كافة الاختبارات والتقييمات المدرسية باجتهاد وتميز.');
    } else if (newType === 'combined') {
      setTitle('لوحة الشرف والتميز الأكاديمي الشاملة');
      setCongratsMessage('نحتفي بصفوة طلبتنا المتميزين: أوائل التفوق العلمي وفرسان الالتزام الأكثر حلاً ومشاركة في الامتحانات، فخورون بجهودكم وتفانيكم المستمر.');
    } else if (newType === 'overall') {
      setTitle('لوحة شرف أوائل الطلبة والمتفوقين');
      setCongratsMessage('يسرنا تهنئة طلبتنا المتميزين وأولياء أمورهم الكرام على هذا الإنجاز المشرف والتفوق المستحق، متمنين لهم دوام التألق والريادة الأكاديمية.');
    } else if (newType === 'exam') {
      if (currentExam) {
        setTitle(`لوحة شرف أوائل: ${currentExam.title}`);
      } else {
        setTitle('لوحة شرف أوائل الامتحان');
      }
    }
  };

  // Compute Ranked Students
  const rankedStudents = useMemo<RankedStudent[]>(() => {
    if (boardType === 'overall' || boardType === 'combined') {
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
    } else if (boardType === 'most_active') {
      // Most active students ranked by total exams solved
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

      const filtered = withStats.filter(item => item.totalExams > 0);

      filtered.sort((a, b) => {
        if (b.totalExams !== a.totalExams) return b.totalExams - a.totalExams;
        return b.percentage - a.percentage;
      });

      const sliced = limitCount > 0 ? filtered.slice(0, limitCount) : filtered;

      return sliced.map((item, idx) => {
        let roleLabel = 'عضو متميز بالمثابرة';
        if (idx === 0) roleLabel = 'بطل الالتزام الأول ⚡';
        else if (idx === 1) roleLabel = 'فارس المثابرة الثاني 🎯';
        else if (idx === 2) roleLabel = 'رائد المتابعة الثالث 🌟';
        else roleLabel = `المركز ${idx + 1} في المثابرة`;

        return {
          rank: idx + 1,
          student: item.student,
          score: item.score,
          percentage: item.percentage,
          totalExams: item.totalExams,
          gradeLabel: roleLabel,
        };
      });
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

  // Compute Most Active Students (Solved the Most Exams in the filtered period)
  const mostActiveStudents = useMemo<RankedStudent[]>(() => {
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

    // Filter students with at least 1 exam
    const filtered = withStats.filter(item => item.totalExams > 0);

    // Sort primarily by highest total exams solved, then by percentage
    filtered.sort((a, b) => {
      if (b.totalExams !== a.totalExams) return b.totalExams - a.totalExams;
      return b.percentage - a.percentage;
    });

    const countToTake = boardType === 'most_active' ? limitCount : mostActiveLimit;
    const sliced = countToTake > 0 ? filtered.slice(0, countToTake) : filtered;

    return sliced.map((item, idx) => {
      let roleLabel = 'عضو متميز بالمثابرة';
      if (idx === 0) roleLabel = 'بطل الالتزام الأول ⚡';
      else if (idx === 1) roleLabel = 'فارس المثابرة الثاني 🎯';
      else if (idx === 2) roleLabel = 'رائد المتابعة الثالث 🌟';
      else roleLabel = `المركز ${idx + 1} في الحل والمثابرة`;

      return {
        rank: idx + 1,
        student: item.student,
        score: item.score,
        percentage: item.percentage,
        totalExams: item.totalExams,
        gradeLabel: roleLabel,
      };
    });
  }, [
    students,
    dateFilteredResults,
    selectedGrade,
    selectedTrack,
    limitCount,
    mostActiveLimit,
    boardType,
    settings.gradingScale,
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
        backgroundColor: bgColor,
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
        backgroundColor: bgColor,
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

  const handlePrintCertificate = () => {
    if (!boardRef.current) return;
    const printContent = boardRef.current.outerHTML;
    const printWindow = window.open('', '_blank', 'width=920,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>${title} - ${displayGrade}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Amiri:ital,wght@0,400;0,700;1,400&family=Aref+Ruqaa:wght@400;700&family=Cairo:wght@400;500;600;700;800;900&family=Changa:wght@500;700;800&family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Noto+Kufi+Arabic:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet" crossorigin="anonymous">
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm;
            }
            body {
              background-color: ${bgColor} !important;
              color: ${textColor} !important;
              font-family: ${fontFamily} !important;
              margin: 0;
              padding: 10px;
              display: flex;
              justify-content: center;
              align-items: center;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-board-wrapper {
              width: 100% !important;
              max-width: 740px !important;
              margin: 0 auto !important;
              font-family: ${fontFamily} !important;
            }
          </style>
        </head>
        <body>
          <div class="print-board-wrapper">
            ${printContent}
          </div>
          <script>
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 250);
              });
            } else {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 450);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShareWhatsApp = () => {
    // Generate polite parent message
    const subjectText = displaySubject;
    const gradeText = selectedGrade === 'all' ? 'أبنائنا وبناتنا' : `طلبة ${selectedGrade}`;
    const periodMsg = periodLabel ? `\n📅 *${periodLabel}*` : '';

    let studentsMsg = '';
    if (boardType === 'most_active') {
      studentsMsg = `⚡ *فرسان الالتزام والأكثر حلاً للامتحانات:*\n` +
        rankedStudents
          .slice(0, 5)
          .map(s => `🏅 المركز ${s.rank}: ${s.student.name} (${s.totalExams} اختبارات منجزة • معدل ${s.percentage}%)`)
          .join('\n');
    } else {
      studentsMsg = `🌟 *أوائل المتفوقين دراسياً:*\n` +
        rankedStudents
          .slice(0, 5)
          .map(s => `🏅 المركز ${s.rank}: ${s.student.name} (${s.percentage}%)`)
          .join('\n');

      if ((boardType === 'combined' || includeMostActiveSection) && mostActiveStudents.length > 0) {
        studentsMsg += `\n\n⚡ *فرسان الالتزام (الأكثر حلاً للامتحانات):*\n` +
          mostActiveStudents
            .slice(0, 3)
            .map(s => `🎯 المركز ${s.rank}: ${s.student.name} (${s.totalExams} اختبارات منجزة)`)
            .join('\n');
      }
    }

    const msg = `🏆 *${title}* 🏆\n\n` +
      `السلام عليكم ورحمة الله وبركاته،\n` +
      `أولياء أمورنا الأفاضل، يسرنا أن نشارككم لوحة الشرف في مادة *${subjectText}* لـ *${gradeText}*${periodMsg} تقديراً لاجتهادهم ومشاركتهم المشرفة:\n\n` +
      `${studentsMsg}\n\n` +
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
            
            {/* Board Type Selection: Overall, Most Active, Combined, or Single Exam */}
            <div className="bg-slate-800/40 p-2.5 rounded-2xl border border-slate-700/60 space-y-2.5">
              <span className="block text-[11px] font-bold text-amber-400">
                نوع لوحة الشرف والتكريم:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleBoardTypeChange('overall')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    boardType === 'overall'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>أوائل المتفوقين</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBoardTypeChange('most_active')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    boardType === 'most_active'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>الأكثر حلاً (المثابرة)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBoardTypeChange('combined')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    boardType === 'combined'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>لوحة شاملة مزدوجة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBoardTypeChange('exam')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    boardType === 'exam'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>امتحان محدد</span>
                </button>
              </div>

              {/* Toggle to include "Most Active Students" in the same certificate if Overall or Combined */}
              {(boardType === 'overall' || boardType === 'combined') && (
                <div className="pt-2 border-t border-slate-700/50 space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeMostActiveSection}
                        onChange={(e) => setIncludeMostActiveSection(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-200">
                        تضمين مراكز أكثر الطلاب حلاً للامتحانات
                      </span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      ⚡ نشاط
                    </span>
                  </div>

                  {includeMostActiveSection && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] text-slate-400">عدد فرسان الالتزام باللوحة:</span>
                      <div className="flex items-center gap-1.5">
                        {[3, 4, 5].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setMostActiveLimit(cnt)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              mostActiveLimit === cnt
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            أفضل {cnt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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

            {/* Visual Style Theme & Color Customization */}
            <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  <span>ألوان الخلفية والنصوص</span>
                </label>
                <button
                  type="button"
                  onClick={handleResetAppearance}
                  className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition cursor-pointer"
                  title="استعادة الألوان والخط الافتراضي"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة ضبط</span>
                </button>
              </div>

              {/* Theme Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 block">أنماط جاهزة سريعة:</span>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_PRESETS.map((p) => {
                    const isSelected = bgColor.toLowerCase() === p.bg.toLowerCase() && textColor.toLowerCase() === p.text.toLowerCase();
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold shadow-xs'
                            : 'border-slate-700 bg-slate-900/90 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full border border-white/20 inline-block shadow-xs" style={{ backgroundColor: p.bg }} />
                          <span className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block" style={{ backgroundColor: p.accent }} />
                        </div>
                        <span className="text-[11px] leading-tight font-bold">{p.name}</span>
                        <span className="text-[9px] text-slate-400">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="pt-2 border-t border-slate-700/50 space-y-2.5">
                <span className="text-[11px] text-slate-400 block font-medium">تعديل الألوان يدوياً:</span>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Background Color */}
                  <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-700/70 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] text-slate-300 font-bold">لون الخلفية</span>
                      <span className="text-[10px] text-slate-400 font-mono">{bgColor}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border-2 border-slate-600 cursor-pointer p-0 bg-transparent"
                        title="اختر لون الخلفية"
                      />
                    </div>
                  </div>

                  {/* Text Color */}
                  <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-700/70 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] text-slate-300 font-bold">لون الكلام</span>
                      <span className="text-[10px] text-slate-400 font-mono">{textColor}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border-2 border-slate-600 cursor-pointer p-0 bg-transparent"
                        title="اختر لون الكلام الأساسي"
                      />
                    </div>
                  </div>
                </div>

                {/* Accent / Details Color & Quick Text Color Swatches */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Accent Color */}
                  <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-700/70 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] text-slate-300 font-bold">لون الزخارف</span>
                      <span className="text-[10px] text-slate-400 font-mono">{accentColor}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border-2 border-slate-600 cursor-pointer p-0 bg-transparent"
                        title="اختر لون التفاصيل والنسب المئوية"
                      />
                    </div>
                  </div>

                  {/* Quick Text Swatches */}
                  <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-700/70 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 mb-1">ألوان كلام سريعة:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: '#ffffff', label: 'أبيض' },
                        { color: '#0f172a', label: 'كحلي داكن' },
                        { color: '#f59e0b', label: 'ذهبي' },
                        { color: '#38bdf8', label: 'سماوي' },
                        { color: '#10b981', label: 'زمردي' },
                      ].map((sw) => (
                        <button
                          key={sw.color}
                          type="button"
                          onClick={() => setTextColor(sw.color)}
                          className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                            textColor.toLowerCase() === sw.color.toLowerCase()
                              ? 'ring-2 ring-amber-400 scale-110 border-white'
                              : 'border-slate-600 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.color }}
                          title={sw.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Typography & Font Size Customization */}
            <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60 space-y-3">
              <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                <span>نوع وحجم الخط للشهادة</span>
              </label>

              {/* Font Family Selection Dropdown */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">نوع الخط العربي (قائمة منتقاة):</span>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    تطبيق فوري
                  </span>
                </div>

                {/* Dropdown Select Box */}
                <div className="relative">
                  <select
                    id="certificate-font-family-select"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-500/50 rounded-xl text-xs font-bold text-slate-100 cursor-pointer transition pr-4 pl-9"
                    style={{ fontFamily: fontFamily }}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option 
                        key={f.id} 
                        value={f.family}
                        className="bg-slate-900 text-white py-1.5"
                      >
                        {f.name} — {f.category}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Quick Selection Shortcuts for popular fonts */}
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-500">أشهر الخطوط للشهادات:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'cairo', name: 'خط كايرو', family: "'Cairo', sans-serif" },
                      { id: 'amiri', name: 'الخط الأميري', family: "'Amiri', serif" },
                      { id: 'tajawal', name: 'خط تجوال', family: "'Tajawal', sans-serif" },
                    ].map((item) => {
                      const isSelected = fontFamily === item.family;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFontFamily(item.family)}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition border cursor-pointer text-center ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                              : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                          style={{ fontFamily: item.family }}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Font Sample Card */}
                {(() => {
                  const currentFont = FONT_OPTIONS.find(f => f.family === fontFamily) || FONT_OPTIONS[0];
                  return (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/70 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-amber-400">الخط المطبق: {currentFont.name}</span>
                        <span className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-medium">{currentFont.category}</span>
                      </div>
                      <p 
                        className="text-xs text-slate-200 truncate pt-0.5"
                        style={{ fontFamily: fontFamily }}
                      >
                        لوحة الشرف والتفوق الأكاديمي • أوائل متميزون
                      </p>
                      <p className="text-[10px] text-slate-400">{currentFont.desc}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Font Size Scaling */}
              <div className="pt-2 border-t border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">حجم الخط الإجمالي:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFontSizeScale(prev => Math.max(80, prev - 5))}
                      className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="تصغير الخط"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-400 min-w-[42px] text-center">
                      {fontSizeScale}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setFontSizeScale(prev => Math.min(135, prev + 5))}
                      className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="تكبير الخط"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min={80}
                  max={135}
                  step={5}
                  value={fontSizeScale}
                  onChange={(e) => setFontSizeScale(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                />

                {/* Quick Size Presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { label: 'مدمج', scale: 90 },
                    { label: 'قياسي', scale: 100 },
                    { label: 'كبير', scale: 115 },
                    { label: 'بارز', scale: 130 },
                  ].map((p) => (
                    <button
                      key={p.scale}
                      type="button"
                      onClick={() => setFontSizeScale(p.scale)}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-medium transition cursor-pointer text-center ${
                        fontSizeScale === p.scale
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {p.label} ({p.scale}%)
                    </button>
                  ))}
                </div>
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
                style={{ 
                  width: '740px',
                  backgroundColor: bgColor,
                  color: textColor,
                  fontFamily: fontFamily
                }}
                className={`p-7 rounded-3xl transition-all select-none text-right shadow-2xl ${
                  isLightBg
                    ? 'border-4 border-amber-600/30'
                    : 'border-4 border-amber-500/40'
                }`}
              >
                {/* Decorative Inner Border */}
                <div 
                  style={{
                    backgroundColor: isLightBg ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.65)',
                    borderColor: `${accentColor}35`,
                  }}
                  className="p-6 rounded-2xl border-2 relative overflow-hidden"
                >
                  
                  {/* Subtle Background Radial Glow */}
                  <div 
                    style={{ backgroundColor: `${accentColor}15` }}
                    className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-40 rounded-full blur-3xl pointer-events-none" 
                  />

                  {/* Corner Ornaments */}
                  <div style={{ color: `${accentColor}60` }} className="absolute top-2 right-2 text-xs font-serif">✦</div>
                  <div style={{ color: `${accentColor}60` }} className="absolute top-2 left-2 text-xs font-serif">✦</div>
                  <div style={{ color: `${accentColor}60` }} className="absolute bottom-2 right-2 text-xs font-serif">✦</div>
                  <div style={{ color: `${accentColor}60` }} className="absolute bottom-2 left-2 text-xs font-serif">✦</div>

                  {/* Top Header Section */}
                  <div 
                    style={{ borderColor: `${accentColor}30` }}
                    className="flex items-center justify-between pb-4 border-b"
                  >
                    <div>
                      {schoolName ? (
                        <p 
                          style={{ 
                            color: accentColor,
                            fontSize: `${Math.round(12 * (fontSizeScale / 100))}px`
                          }} 
                          className="font-bold"
                        >
                          {schoolName}
                        </p>
                      ) : (
                        <p 
                          style={{ 
                            color: isLightBg ? '#64748b' : '#94a3b8',
                            fontSize: `${Math.round(11 * (fontSizeScale / 100))}px`
                          }} 
                          className="font-bold"
                        >
                          سجل التميز والإنجاز الأكاديمي
                        </p>
                      )}
                      <p 
                        style={{ 
                          color: isLightBg ? '#475569' : '#cbd5e1',
                          fontSize: `${Math.round(12 * (fontSizeScale / 100))}px`
                        }} 
                        className="font-bold mt-0.5"
                      >
                        مادة {displaySubject}
                      </p>
                    </div>

                    {/* Laurels & Crest */}
                    <div className="flex flex-col items-center">
                      <div 
                        style={{
                          background: `linear-gradient(135deg, ${accentColor}, #f59e0b)`,
                          boxShadow: `0 8px 20px ${accentColor}35`
                        }}
                        className="w-12 h-12 rounded-2xl text-slate-950 flex items-center justify-center shadow-lg"
                      >
                        <Crown className="w-7 h-7" />
                      </div>
                    </div>

                    <div className="text-left">
                      <span 
                        style={{
                          backgroundColor: `${accentColor}18`,
                          color: isLightBg ? '#b45309' : accentColor,
                          borderColor: `${accentColor}40`,
                          fontSize: `${Math.round(11 * (fontSizeScale / 100))}px`
                        }}
                        className="px-2.5 py-1 font-bold border rounded-lg inline-block"
                      >
                        {displayGrade} {displayTrack}
                      </span>
                      {periodLabel && (
                        <div 
                          style={{
                            color: accentColor,
                            fontSize: `${Math.round(10 * (fontSizeScale / 100))}px`
                          }}
                          className="mt-1 flex items-center justify-end gap-1 font-mono font-semibold"
                        >
                          <Calendar className="w-3 h-3 inline shrink-0" />
                          <span>{periodLabel}</span>
                        </div>
                      )}
                      {showDate && (
                        <p 
                          style={{ 
                            color: isLightBg ? '#64748b' : '#94a3b8',
                            fontSize: `${Math.round(10 * (fontSizeScale / 100))}px`
                          }} 
                          className="mt-0.5 font-mono"
                        >
                          {displayDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Main Title & Subtitle */}
                  <div className="text-center py-5">
                    <div 
                      style={{
                        backgroundColor: `${accentColor}15`,
                        color: accentColor,
                        borderColor: `${accentColor}30`,
                        fontSize: `${Math.round(12 * (fontSizeScale / 100))}px`
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full font-bold border mb-2"
                    >
                      {boardType === 'most_active' ? (
                        <>
                          <Flame className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          <span>وسام فرسان الالتزام والمثابرة</span>
                          <Flame className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        </>
                      ) : boardType === 'combined' ? (
                        <>
                          <Crown className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          <span>وسام الشرف والتميز الأكاديمي الشامل</span>
                          <Flame className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          <span>وسام التميز والتفوق المستمر</span>
                          <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        </>
                      )}
                    </div>

                    <h1 
                      style={{ 
                        fontFamily: fontFamily,
                        color: textColor,
                        fontSize: `${Math.round(27 * (fontSizeScale / 100))}px`
                      }}
                      className="font-black tracking-tight leading-tight"
                    >
                      {title}
                    </h1>

                    {/* Subtitle / Exam Title */}
                    <p 
                      style={{ 
                        fontFamily: fontFamily,
                        color: accentColor,
                        fontSize: `${Math.round(13 * (fontSizeScale / 100))}px`
                      }}
                      className="font-semibold mt-1"
                    >
                      {boardType === 'exam' && currentExam
                        ? `نتائج أوائل: ${currentExam.title} (الدرجة الكاملة: ${currentExam.totalScore})${periodLabel ? ` • ${periodLabel}` : ''}`
                        : boardType === 'most_active'
                        ? customSubtitle || `تكريم الطلاب الأكثر حلاً للاختبارات والمشاركات • مادة ${displaySubject}${periodLabel ? ` (${periodLabel})` : ''}`
                        : boardType === 'combined'
                        ? customSubtitle || `لوحة الشرف الشاملة: أوائل المتفوقين وفرسان الالتزام • ${displaySubject}${periodLabel ? ` (${periodLabel})` : ''}`
                        : customSubtitle || `لوحة الشرف العامة لأوائل الطلبة • ${displaySubject}${periodLabel ? ` (${periodLabel})` : ''}`}
                    </p>

                    {/* Encouraging Note for Parents & Students */}
                    <p 
                      style={{ 
                        fontFamily: fontFamily,
                        color: isLightBg ? '#475569' : '#cbd5e1',
                        fontSize: `${Math.round(12 * (fontSizeScale / 100))}px`
                      }}
                      className="max-w-lg mx-auto mt-2 leading-relaxed font-medium"
                    >
                      "{congratsMessage}"
                    </p>
                  </div>

                  {/* Section Title if Combined Board */}
                  {boardType === 'combined' && (
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-amber-500/20">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <h2 
                        style={{ fontFamily: fontFamily, color: textColor }}
                        className="text-xs font-bold"
                      >
                        القسم الأول: أوائل التفوق والامتياز الدراسي
                      </h2>
                    </div>
                  )}

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
                            style={{
                              backgroundColor: isFirst
                                ? isLightBg ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.12)'
                                : isLightBg ? 'rgba(255, 255, 255, 0.9)' : 'rgba(30, 41, 59, 0.6)',
                              borderColor: isFirst 
                                ? `${accentColor}80` 
                                : isLightBg ? '#e2e8f0' : 'rgba(71, 85, 105, 0.4)'
                            }}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                              isFirst ? 'shadow-md' : 'shadow-xs'
                            }`}
                          >
                            {/* Right: Rank Badge & Student Details */}
                            <div className="flex items-center gap-3">
                              {/* Rank Badge */}
                              <div
                                style={{
                                  background: isFirst
                                    ? `linear-gradient(135deg, ${accentColor}, #fef08a)`
                                    : isSecond
                                    ? 'linear-gradient(135deg, #cbd5e1, #f1f5f9)'
                                    : isThird
                                    ? 'linear-gradient(135deg, #b45309, #d97706)'
                                    : isLightBg ? '#f1f5f9' : '#1e293b',
                                  color: isFirst || isSecond ? '#0f172a' : '#ffffff',
                                  boxShadow: isFirst ? `0 0 12px ${accentColor}50` : undefined,
                                }}
                                className="w-9 h-9 rounded-2xl flex items-center justify-center font-black font-mono text-sm shrink-0 border border-black/10"
                              >
                                {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : item.rank}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 
                                    style={{ 
                                      fontFamily: fontFamily,
                                      color: textColor,
                                      fontSize: `${Math.round(15 * (fontSizeScale / 100))}px`
                                    }}
                                    className="font-extrabold leading-snug"
                                  >
                                    {item.student.name}
                                  </h3>
                                  {isFirst && (
                                    <span 
                                      style={{
                                        backgroundColor: `${accentColor}25`,
                                        color: isLightBg ? '#b45309' : accentColor,
                                        borderColor: `${accentColor}40`,
                                        fontSize: `${Math.round(10 * (fontSizeScale / 100))}px`
                                      }}
                                      className="px-2 py-0.5 font-bold border rounded-full"
                                    >
                                      {boardType === 'most_active' ? 'بطل الالتزام الأول' : 'المركز الأول'}
                                    </span>
                                  )}
                                </div>
                                <p 
                                  style={{ 
                                    color: isLightBg ? '#64748b' : '#94a3b8',
                                    fontSize: `${Math.round(11 * (fontSizeScale / 100))}px`
                                  }}
                                  className="flex items-center gap-1.5 mt-0.5"
                                >
                                  <span>{item.student.grade}</span>
                                  {item.student.track && <span>• مسار {item.student.track}</span>}
                                  {item.student.studentId && <span>• كود: {item.student.studentId}</span>}
                                </p>
                              </div>
                            </div>

                            {/* Left: Score & Recognition Pill */}
                            <div className="text-left flex items-center gap-3">
                              <div className="hidden sm:block text-right">
                                <span 
                                  style={{
                                    color: item.percentage >= 95 ? '#10b981' : accentColor,
                                    fontSize: `${Math.round(11 * (fontSizeScale / 100))}px`
                                  }}
                                  className="font-bold block"
                                >
                                  {item.gradeLabel}
                                </span>
                                <span 
                                  style={{
                                    color: isLightBg ? '#64748b' : '#94a3b8',
                                    fontSize: `${Math.round(10 * (fontSizeScale / 100))}px`
                                  }}
                                  className="block font-medium"
                                >
                                  {boardType === 'most_active'
                                    ? `متوسط الدرجات: ${item.percentage}%`
                                    : boardType === 'overall' || boardType === 'combined'
                                    ? `${item.totalExams} اختبارات مقيمة` 
                                    : `الدرجة: ${item.score}/${currentExam?.totalScore || 100}`}
                                </span>
                              </div>

                              <div 
                                style={{
                                  backgroundColor: `${accentColor}18`,
                                  borderColor: `${accentColor}40`,
                                }}
                                className="border px-3 py-1 rounded-xl text-center min-w-[70px]"
                              >
                                {boardType === 'most_active' ? (
                                  <>
                                    <span 
                                      style={{ 
                                        color: accentColor,
                                        fontSize: `${Math.round(15 * (fontSizeScale / 100))}px`
                                      }}
                                      className="font-black font-mono block leading-tight"
                                    >
                                      {item.totalExams} اختبار
                                    </span>
                                    <span 
                                      style={{ 
                                        color: isLightBg ? '#64748b' : '#94a3b8',
                                        fontSize: `${Math.round(9 * (fontSizeScale / 100))}px`
                                      }}
                                      className="block font-bold mt-0.5"
                                    >
                                      تم حلها
                                    </span>
                                  </>
                                ) : (
                                  <span 
                                    style={{ 
                                      color: accentColor,
                                      fontSize: `${Math.round(16 * (fontSizeScale / 100))}px`
                                    }}
                                    className="font-black font-mono block leading-tight"
                                  >
                                    {item.percentage}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Secondary Section: فرسان الالتزام والمثابرة (الأكثر حلاً للامتحانات) */}
                  {(boardType === 'combined' || (boardType === 'overall' && includeMostActiveSection)) && mostActiveStudents.length > 0 && (
                    <div 
                      style={{
                        borderColor: `${accentColor}40`,
                        backgroundColor: isLightBg ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.04)'
                      }}
                      className="mt-6 pt-5 pb-3 px-3 sm:px-4 rounded-2xl border border-dashed space-y-3"
                    >
                      {/* Section Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-xs"
                          >
                            <Flame className="w-4 h-4" />
                          </div>
                          <div>
                            <h2 
                              style={{ 
                                fontFamily: fontFamily,
                                color: textColor,
                                fontSize: `${Math.round(14 * (fontSizeScale / 100))}px`
                              }}
                              className="font-black leading-tight"
                            >
                              فرسان الالتزام والمثابرة • الأكثر حلاً للامتحانات
                            </h2>
                            <p 
                              style={{ 
                                color: isLightBg ? '#64748b' : '#94a3b8',
                                fontSize: `${Math.round(10 * (fontSizeScale / 100))}px`
                              }}
                            >
                              تقديراً للحرص الدؤوب والمشاركة الفعالة في إنجاز التقييمات والاختبارات
                            </p>
                          </div>
                        </div>
                        <span 
                          style={{ 
                            color: accentColor, 
                            borderColor: `${accentColor}40`,
                            backgroundColor: `${accentColor}15`,
                            fontSize: `${Math.round(10 * (fontSizeScale / 100))}px`
                          }}
                          className="px-2.5 py-0.5 rounded-full font-bold border"
                        >
                          أعلى مشاركة ⚡
                        </span>
                      </div>

                      {/* Active Students Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {mostActiveStudents.map((act) => {
                          const isFirst = act.rank === 1;
                          const isSecond = act.rank === 2;
                          const isThird = act.rank === 3;
                          return (
                            <div
                              key={act.student.id}
                              style={{
                                backgroundColor: isLightBg ? 'rgba(255, 255, 255, 0.85)' : 'rgba(30, 41, 59, 0.7)',
                                borderColor: isFirst ? `${accentColor}70` : isLightBg ? '#e2e8f0' : 'rgba(71, 85, 105, 0.4)'
                              }}
                              className="p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-xs"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  style={{
                                    background: isFirst
                                      ? `linear-gradient(135deg, ${accentColor}, #fef08a)`
                                      : isSecond
                                      ? 'linear-gradient(135deg, #cbd5e1, #f1f5f9)'
                                      : isThird
                                      ? 'linear-gradient(135deg, #b45309, #d97706)'
                                      : isLightBg ? '#f1f5f9' : '#1e293b',
                                    color: isFirst || isSecond ? '#0f172a' : '#ffffff',
                                  }}
                                  className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                                >
                                  {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : act.rank}
                                </div>
                                <div>
                                  <h4 
                                    style={{ 
                                      fontFamily: fontFamily,
                                      color: textColor,
                                      fontSize: `${Math.round(13 * (fontSizeScale / 100))}px`
                                    }}
                                    className="font-bold leading-tight truncate max-w-[130px] sm:max-w-[150px]"
                                  >
                                    {act.student.name}
                                  </h4>
                                  <span 
                                    style={{ 
                                      color: isLightBg ? '#64748b' : '#94a3b8',
                                      fontSize: `${Math.round(10 * (fontSizeScale / 100))}px`
                                    }}
                                    className="block font-medium"
                                  >
                                    {act.gradeLabel}
                                  </span>
                                </div>
                              </div>

                              <div 
                                style={{
                                  backgroundColor: `${accentColor}18`,
                                  borderColor: `${accentColor}40`,
                                }}
                                className="border px-2 py-1 rounded-lg text-center shrink-0 min-w-[55px]"
                              >
                                <span 
                                  style={{ 
                                    color: accentColor,
                                    fontSize: `${Math.round(12 * (fontSizeScale / 100))}px`
                                  }}
                                  className="font-black font-mono block leading-none"
                                >
                                  {act.totalExams} اختبار
                                </span>
                                <span 
                                  style={{ 
                                    color: isLightBg ? '#64748b' : '#94a3b8',
                                    fontSize: `${Math.round(9 * (fontSizeScale / 100))}px`
                                  }}
                                  className="block font-mono mt-0.5"
                                >
                                  {act.percentage}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Footer & Teacher Signature / Stamp Block */}
                  <div 
                    style={{ borderColor: `${accentColor}30` }}
                    className="mt-6 pt-5 border-t grid grid-cols-3 items-center"
                  >
                    
                    {/* Right: Official Accreditation Statement */}
                    <div className="text-right">
                      <p 
                        style={{ 
                          color: isLightBg ? '#334155' : '#cbd5e1',
                          fontSize: `${Math.round(11 * (fontSizeScale / 100))}px`
                        }}
                        className="font-bold"
                      >
                        الاعتماد الرسمي
                      </p>
                      <p 
                        style={{ 
                          color: isLightBg ? '#64748b' : '#94a3b8',
                          fontSize: `${Math.round(10 * (fontSizeScale / 100))}px`
                        }}
                        className="mt-0.5 leading-relaxed"
                      >
                        صدرت هذه اللوحة إلكترونياً تقديراً للمثابرة والتفوق الدراسي المشرف.
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>بيانات موثقة ومعتمدة</span>
                      </div>
                    </div>

                    {/* Center: Golden Excellence Seal / Stamp */}
                    <div className="flex justify-center">
                      {showStamp && (
                        <div 
                          style={{ borderColor: `${accentColor}70` }}
                          className="w-20 h-20 rounded-full border-2 border-dashed p-1 flex items-center justify-center relative rotate-[-6deg]"
                        >
                          <div 
                            style={{ 
                              borderColor: `${accentColor}40`,
                              backgroundColor: `${accentColor}12`
                            }}
                            className="w-full h-full rounded-full border flex flex-col items-center justify-center text-center p-1"
                          >
                            <Star className="w-3.5 h-3.5 mb-0.5" style={{ color: accentColor, fill: accentColor }} />
                            <span 
                              style={{ color: accentColor }}
                              className="text-[8px] font-black uppercase tracking-tighter leading-none"
                            >
                              ختم التميز
                            </span>
                            <span 
                              style={{ color: accentColor }}
                              className="text-[7px] mt-0.5 font-bold opacity-90"
                            >
                              EXCELLENCE
                            </span>
                            <span 
                              style={{ color: isLightBg ? '#64748b' : '#94a3b8' }}
                              className="text-[7px] font-mono"
                            >
                              2025/2026
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Left: Teacher Signature */}
                    <div className="flex flex-col items-center justify-center text-center min-w-[150px]">
                      <p 
                        style={{ 
                          color: isLightBg ? '#64748b' : '#94a3b8',
                          fontSize: `${Math.round(11 * (fontSizeScale / 100))}px`
                        }}
                        className="font-bold"
                      >
                        {teacherRole}
                      </p>
                      <p 
                        style={{ 
                          color: isLightBg ? textColor : accentColor,
                          fontSize: `${Math.round(13 * (fontSizeScale / 100))}px`
                        }}
                        className="font-extrabold mt-0.5 whitespace-nowrap"
                      >
                        {teacherName}
                      </p>

                      {showSignature && (
                        <div className="mt-1.5 flex flex-col items-center justify-center w-full">
                          {signatureStyle === 'official_badge' ? (
                            <div 
                              style={{
                                backgroundColor: `${accentColor}15`,
                                borderColor: `${accentColor}35`
                              }}
                              className="px-3 py-1 border rounded-lg flex items-center gap-1.5 mt-1 shadow-xs"
                            >
                              <span 
                                style={{ color: accentColor }}
                                className="text-xs font-black whitespace-nowrap"
                              >
                                {signatureText || teacherName}
                              </span>
                              <span 
                                style={{
                                  backgroundColor: `${accentColor}25`,
                                  color: accentColor
                                }}
                                className="text-[8px] px-1.5 py-0.5 rounded font-mono font-bold"
                              >
                                معتمد ✓
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              {/* Signature text - guaranteed single line */}
                              <div 
                                className="whitespace-nowrap select-none font-bold px-3 tracking-wide"
                                style={{ 
                                  color: accentColor,
                                  fontFamily: signatureStyle === 'cursive_script' 
                                    ? "'Plus Jakarta Sans', cursive, sans-serif" 
                                    : "'Aref Ruqaa', 'Cairo', serif",
                                  fontSize: `${Math.round(22 * (fontSizeScale / 100))}px`,
                                  lineHeight: '1.2',
                                  transform: 'rotate(-2.5deg)',
                                  display: 'inline-block',
                                }}
                              >
                                {signatureText || teacherName}
                              </div>

                              {/* Flowing pen stroke swoosh */}
                              <svg 
                                className="w-28 h-3.5 mt-0.5 overflow-visible" 
                                style={{ color: accentColor }}
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

                              <div 
                                style={{ color: isLightBg ? '#64748b' : '#94a3b8' }}
                                className="flex items-center gap-1 mt-1 text-[9px] font-mono whitespace-nowrap"
                              >
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
            
            {/* Print Certificate Button */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handlePrintCertificate}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl border border-slate-700 transition cursor-pointer disabled:opacity-50"
              title="طباعة الشهادة أو حفظها بصيغة PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة الشهادة (PDF)</span>
            </button>

            {/* Copy image button */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleCopyImage}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl border border-slate-700 transition cursor-pointer disabled:opacity-50"
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
