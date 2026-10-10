var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app,
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_cors = __toESM(require("cors"), 1);

// src/hesham-exam/data/officialTemplate.ts
var OFFICIAL_HESHAM_EXAM_TEMPLATE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- \u{1F4DD} \u063A\u064A\u0651\u0631 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0648\u0627\u0644\u0648\u0635\u0641 \u0647\u0646\u0627 -->
    <title>\u0642\u0627\u0644\u0628 \u0627\u0645\u062A\u062D\u0627\u0646 \u062A\u0641\u0627\u0639\u0644\u064A | Interactive Exam Template</title>
    <meta name="description" content="\u0627\u0645\u062A\u062D\u0627\u0646 \u062A\u0641\u0627\u0639\u0644\u064A \u0634\u0627\u0645\u0644 - \u0645\u0646\u0635\u0629 \u0645\u0633\u062A\u0631 \u0645\u062D\u0645\u062F \u0647\u0634\u0627\u0645">
    <meta name="author" content="Mr. Mohammed Hesham">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Cairo', sans-serif; }
        body.en-mode { font-family: 'Inter', sans-serif; }
        .correct { background-color: #dcfce7 !important; border-color: #16a34a !important; }
        .incorrect { background-color: #fee2e2 !important; border-color: #dc2626 !important; }
        .timer-warning { color: #dc2626 !important; animation: pulse 1s infinite; }
        @keyframes pulse { 50% { opacity: 0.7; } }
        @media print { .no-print { display: none !important; } }
        .success-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 0.875rem; }
        .grade-excellent { background: #dcfce7; color: #166534; }
        .grade-good { background: #fef3c7; color: #92400e; }
        .grade-pass { background: #dbeafe; color: #1e40af; }
        .grade-fail { background: #fee2e2; color: #991b1b; }
        .lang-switch {
            position: fixed; top: 16px; left: 16px; z-index: 100;
            background: white; padding: 6px; border-radius: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15); display: flex; gap: 4px;
            border: 2px solid #0d9488;
        }
        [dir="ltr"] .lang-switch { left: auto; right: 16px; }
        .lang-btn {
            padding: 6px 14px; border-radius: 20px; cursor: pointer; font-weight: bold;
            transition: all 0.3s; border: none; font-size: 0.875rem;
            background: transparent; color: #6b7280;
        }
        .lang-btn.active { background: #0d9488; color: white; box-shadow: 0 2px 6px rgba(13,148,136,0.4); }
        .lang-btn:hover:not(.active) { background: #f0fdfa; color: #0d9488; }
        .shuffle-badge {
            display: inline-block;
            background: linear-gradient(135deg, #0d9488, #0f766e);
            color: white; padding: 4px 12px; border-radius: 20px;
            font-size: 0.75rem; font-weight: bold; margin-right: 8px;
            animation: pulse 2s infinite;
        }
        .math-display {
            display: inline-block; direction: ltr;
            font-family: 'Times New Roman', 'Cambria Math', serif;
            font-size: 1.2em; font-style: italic;
            padding: 2px 8px; background: #f0fdfa;
            border-radius: 6px; margin: 2px;
            color: #0f766e; font-weight: 600; letter-spacing: 0.5px;
        }
        .save-indicator {
            position: fixed; bottom: 20px; left: 20px; z-index: 200;
            background: #10b981; color: white; padding: 8px 16px;
            border-radius: 20px; font-size: 0.8rem; font-weight: bold;
            opacity: 0; transition: opacity 0.3s; pointer-events: none;
            box-shadow: 0 4px 12px rgba(16,185,129,0.4);
        }
        .save-indicator.show { opacity: 1; }
        .formula-box {
            background: #f8fafc; border: 1.5px solid #0d9488;
            border-radius: 12px; padding: 12px 16px; margin: 4px 0;
            box-shadow: 0 2px 6px rgba(13,148,136,0.06);
            display: flex; flex-direction: column; gap: 6px;
        }
        .formula-box .formula-title {
            font-size: 0.9rem; font-weight: 700; color: #0f766e;
            display: flex; align-items: center; gap: 6px;
        }
        .formula-box .formula-math {
            font-family: 'Cambria Math', 'KaTeX_Math', 'Times New Roman', serif;
            font-size: 1.15rem; direction: ltr; text-align: center;
            color: #0f172a; padding: 6px 12px; background: #ffffff;
            border-radius: 8px; border: 1px dashed #cbd5e1; overflow-x: auto;
        }
        .exam-diagram-container {
            display: flex; justify-content: center; align-items: center;
            margin: 14px 0; width: 100%; overflow-x: auto;
        }
        .exam-diagram {
            max-width: 100%; height: auto; margin: 8px auto; display: block;
            background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px;
            padding: 10px; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
        }
        .exam-table-container {
            width: 100%; overflow-x: auto; margin: 12px 0;
        }
        .exam-table {
            width: 100%; max-width: 520px; margin: 0 auto;
            border-collapse: collapse; font-size: 0.88rem; text-align: center;
            background-color: #ffffff; border-radius: 8px; overflow: hidden;
            border: 1.5px solid #cbd5e1;
        }
        .exam-table th {
            background-color: #f0fdfa; color: #0f766e; font-weight: bold;
            padding: 8px 12px; border: 1px solid #ccfbf1;
        }
        .exam-table td {
            padding: 6px 12px; border: 1px solid #e2e8f0; color: #1e293b;
            font-family: 'Times New Roman', serif;
        }
        .exam-table tr:nth-child(even) { background-color: #f8fafc; }
        .q-meta-badges {
            display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; align-items: center;
        }
        .q-category-pill {
            display: inline-flex; align-items: center; gap: 4px;
            background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;
            font-size: 0.75rem; font-weight: 700; padding: 2px 10px; border-radius: 9999px;
        }
        .q-law-pill {
            display: inline-flex; align-items: center; gap: 4px;
            background: #fef3c7; color: #b45309; border: 1px solid #fde68a;
            font-size: 0.75rem; font-weight: 700; padding: 2px 10px; border-radius: 9999px;
            font-family: 'Times New Roman', 'Cambria Math', serif; direction: ltr;
        }
        .q-type-interactive {
            background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;
        }
        .q-type-graph {
            background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe;
        }
    </style>
</head>
<body class="bg-gradient-to-br from-teal-50 to-emerald-50 text-gray-800 p-4 md:p-8 min-h-screen">

    <div class="lang-switch no-print">
        <button class="lang-btn active" onclick="setLanguage('ar')" id="btn-ar">\u0639\u0631\u0628\u064A</button>
        <button class="lang-btn" onclick="setLanguage('en')" id="btn-en">EN</button>
    </div>

    <div id="saveIndicator" class="save-indicator"> <span data-ar="\u062A\u0645 \u0627\u0644\u062D\u0641\u0638" data-en="Saved">\u062A\u0645 \u0627\u0644\u062D\u0641\u0638</span></div>

    <div id="timer-container" class="max-w-4xl mx-auto mb-4 text-center no-print">
        <div class="bg-white p-4 rounded-2xl shadow-md inline-block border-2 border-teal-100">
            <span class="text-gray-600 ml-2" data-ar="\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A:" data-en="Time Remaining:">\u23F0 \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A:</span>
            <span id="timer" class="text-2xl font-bold text-teal-600 font-mono">60:00</span>
            <span class="shuffle-badge" data-ar="\u{1F3B2} \u0623\u0633\u0626\u0644\u0629 \u0639\u0634\u0648\u0627\u0626\u064A\u0629" data-en="\u{1F3B2} Random Questions">\u{1F3B2} \u0623\u0633\u0626\u0644\u0629 \u0639\u0634\u0648\u0627\u0626\u064A\u0629</span>
        </div>
    </div>

    <div class="max-w-4xl mx-auto mb-6 flex flex-wrap gap-3 justify-center no-print">
        <button onclick="toggleAnswers()" class="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl font-medium transition shadow cursor-pointer" data-ar="\u{1F440} \u0625\u0638\u0647\u0627\u0631 / \u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A" data-en="\u{1F440} Show / Hide Answers">\u{1F440} \u0625\u0638\u0647\u0627\u0631 / \u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A</button>
        <button onclick="window.print()" class="bg-gray-700 hover:bg-gray-900 text-white px-5 py-2 rounded-xl font-medium transition shadow cursor-pointer" data-ar="\u{1F5A8}\uFE0F \u0637\u0628\u0627\u0639\u0629" data-en="\u{1F5A8}\uFE0F Print">\u{1F5A8}\uFE0F \u0637\u0628\u0627\u0639\u0629</button>
        <button onclick="reshuffleExam()" class="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-5 py-2 rounded-xl font-medium transition shadow cursor-pointer" data-ar="\u{1F504} \u0623\u0633\u0626\u0644\u0629 \u062C\u062F\u064A\u062F\u0629" data-en="\u{1F504} New Questions">\u{1F504} \u0623\u0633\u0626\u0644\u0629 \u062C\u062F\u064A\u062F\u0629</button>
        <button onclick="clearProgress()" class="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl font-medium transition shadow cursor-pointer" data-ar="\u{1F5D1}\uFE0F \u0645\u0633\u062D \u0627\u0644\u062A\u0642\u062F\u0645" data-en="\u{1F5D1}\uFE0F Clear Progress">\u{1F5D1}\uFE0F \u0645\u0633\u062D \u0627\u0644\u062A\u0642\u062F\u0645</button>
    </div>

    <!-- \u{1F4DD} \u0639\u0646\u0627\u0648\u064A\u0646 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0648\u0627\u0644\u0648\u0635\u0641 \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0645\u0627\u062F\u062A\u064A \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A -->
    <header class="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-lg mb-8 border-4 border-teal-400">
        <div class="text-center">
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2" data-ar="\u{1F4D0} \u0627\u0645\u062A\u062D\u0627\u0646 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0644\u0645\u062A\u0643\u0627\u0645\u0644" data-en="\u{1F4D0} Interactive Physics & Mathematics Integrated Exam">\u{1F4D0} \u0627\u0645\u062A\u062D\u0627\u0646 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0644\u0645\u062A\u0643\u0627\u0645\u0644</h1>
            <h2 class="text-lg text-teal-600 font-semibold" data-ar="\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0646\u064A \u0639\u0634\u0631 / \u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062B\u0627\u0646\u0648\u064A\u0629 - \u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0631\u064A\u0627\u0636\u064A\u0627\u062A" data-en="Grade 12 / Secondary - Physics & Mathematics">\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0646\u064A \u0639\u0634\u0631 / \u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062B\u0627\u0646\u0648\u064A\u0629 - \u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0631\u064A\u0627\u0636\u064A\u0627\u062A</h2>
            <p class="text-sm text-gray-600 mt-2" data-ar="\u0627\u0645\u062A\u062D\u0627\u0646 \u062A\u0641\u0627\u0639\u0644\u064A \u062A\u0637\u0628\u064A\u0642\u064A: \u0645\u0633\u0627\u0626\u0644 \u062D\u0633\u0627\u0628\u064A\u0629 \u062F\u0642\u064A\u0642\u0629\u060C \u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0648\u0642\u0648\u0627\u0646\u064A\u0646\u060C \u0631\u0633\u0648\u0645 \u0628\u064A\u0627\u0646\u064A\u0629 SVG\u060C \u0648\u062F\u0648\u0627\u0626\u0631 \u0643\u0647\u0631\u0628\u064A\u0629 \u0645\u0639 \u062A\u0635\u062D\u064A\u062D \u0641\u0648\u0631\u064A" data-en="Interactive STEM exam: Quantitative problems, formulas, SVG diagrams, circuits, and instant grading">\u0627\u0645\u062A\u062D\u0627\u0646 \u062A\u0641\u0627\u0639\u0644\u064A \u062A\u0637\u0628\u064A\u0642\u064A: \u0645\u0633\u0627\u0626\u0644 \u062D\u0633\u0627\u0628\u064A\u0629 \u062F\u0642\u064A\u0642\u0629\u060C \u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0648\u0642\u0648\u0627\u0646\u064A\u0646\u060C \u0631\u0633\u0648\u0645 \u0628\u064A\u0627\u0646\u064A\u0629 SVG\u060C \u0648\u062F\u0648\u0627\u0626\u0631 \u0643\u0647\u0631\u0628\u064A\u0629 \u0645\u0639 \u062A\u0635\u062D\u064A\u062D \u0641\u0648\u0631\u064A</p>
            <p class="text-xs text-green-600 mt-2 font-semibold" data-ar="\u{1F4BE} \u064A\u062A\u0645 \u062D\u0641\u0638 \u062A\u0642\u062F\u0645\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B" data-en="\u{1F4BE} Your progress is saved automatically">\u{1F4BE} \u064A\u062A\u0645 \u062D\u0641\u0638 \u062A\u0642\u062F\u0645\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B</p>
        </div>
        <div class="mt-4 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <span><span data-ar="\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E:" data-en="\u{1F4C5} Date:">\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E:</span> <input type="text" id="examDate" class="border-b-2 border-teal-300 bg-transparent w-28 text-center"></span>
            <span><span data-ar="\u{1F60A} \u0627\u0644\u0627\u0633\u0645:" data-en="\u{1F60A} Name:">\u{1F60A} \u0627\u0644\u0627\u0633\u0645:</span> <input type="text" id="studentName" class="border-b-2 border-teal-300 bg-transparent w-32 text-center" placeholder="\u0627\u0643\u062A\u0628 \u0627\u0633\u0645\u0643"></span>
            <span><span data-ar="\u{1F3EB} \u0627\u0644\u0634\u0639\u0628\u0629:" data-en="\u{1F3EB} Class:">\u{1F3EB} \u0627\u0644\u0634\u0639\u0628\u0629:</span> <input type="text" id="studentClass" class="border-b-2 border-teal-300 bg-transparent w-28 text-center" placeholder="\u0627\u0644\u0634\u0639\u0628\u0629"></span>
            <span><span data-ar="\u23F0 \u0627\u0644\u0645\u062F\u0629: 60 \u062F\u0642\u064A\u0642\u0629" data-en="\u23F0 Duration: 60 min">\u23F0 \u0627\u0644\u0645\u062F\u0629: 60 \u062F\u0642\u064A\u0642\u0629</span></span>
            <span><span data-ar="\u{1F4CA} \u0627\u0644\u0645\u062C\u0645\u0648\u0639: 100 \u062F\u0631\u062C\u0629" data-en="\u{1F4CA} Total: 100 pts">\u{1F4CA} \u0627\u0644\u0645\u062C\u0645\u0648\u0639: 100 \u062F\u0631\u062C\u0629</span></span>
        </div>
    </header>

    <!-- \u{1F4DD} \u0635\u064A\u063A \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u0627\u0645\u062A\u062D\u0627\u0646 -->
    <div class="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-md border-2 border-teal-200 no-print" id="notes-formula-box">
        <h3 class="font-bold text-lg mb-3 text-teal-700 text-center" data-ar="\u{1F4D0} \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0635\u064A\u063A \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0629 \u0648\u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0629 \u0627\u0644\u0647\u0627\u0645\u0629" data-en="\u{1F4D0} Key Mathematical & Physical Formulas">\u{1F4D0} \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0635\u064A\u063A \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0629 \u0648\u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0629 \u0627\u0644\u0647\u0627\u0645\u0629</h3>
        <div class="grid md:grid-cols-2 gap-3 text-sm" id="notes-content">
            <div class="formula-box"><strong>\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u062D\u0631\u0643\u0629 \u0648\u0627\u0644\u0642\u062F\u0631\u0629:</strong> $F = m cdot a quad , quad v = v_0 + a t quad , quad P = \frac{V^2}{R}$</div>
            <div class="formula-box"><strong>\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621 \u0648\u0627\u0644\u062A\u0641\u0627\u0636\u0644:</strong> $V = I cdot R quad , quad \frac{d}{dx}(x^n) = n x^{n-1} quad , quad int x^n dx = \frac{x^{n+1}}{n+1}$</div>
        </div>
    </div>

    <main class="max-w-4xl mx-auto space-y-8" id="exam-content"></main>

    <div class="text-center no-print pb-8 mt-8">
        <button onclick="gradeExam()" class="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-lg px-10 py-4 rounded-2xl font-bold shadow-xl transition transform hover:scale-105 cursor-pointer" data-ar="\u{1F3AF} \u0635\u062D\u062D \u0625\u062C\u0627\u0628\u0627\u062A\u064A!" data-en="\u{1F3AF} Grade My Answers!">\u{1F3AF} \u0635\u062D\u062D \u0625\u062C\u0627\u0628\u0627\u062A\u064A!</button>
    </div>

    <div id="results-panel" class="max-w-4xl mx-auto mt-8 bg-white p-8 rounded-2xl shadow-2xl border-4 border-teal-400 hidden no-print">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center" data-ar="\u{1F3C6} \u0646\u062A\u064A\u062C\u062A\u0643 \u064A\u0627 \u0628\u0637\u0644! \u{1F3C6}" data-en="\u{1F3C6} Your Results, Champion! \u{1F3C6}">\u{1F3C6} \u0646\u062A\u064A\u062C\u062A\u0643 \u064A\u0627 \u0628\u0637\u0644! \u{1F3C6}</h2>
        <div class="grid md:grid-cols-3 gap-4 mb-6">
            <div class="bg-teal-50 p-4 rounded-xl text-center"><p data-ar="\u{1F60A} \u0627\u0644\u0627\u0633\u0645" data-en="\u{1F60A} Name">\u{1F60A} \u0627\u0644\u0627\u0633\u0645</p><p id="res-name" class="font-bold text-xl text-teal-700">-</p></div>
            <div class="bg-emerald-50 p-4 rounded-xl text-center"><p data-ar="\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E" data-en="\u{1F4C5} Date">\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E</p><p id="res-date" class="font-bold text-xl text-emerald-700">-</p></div>
            <div class="bg-teal-50 p-4 rounded-xl text-center"><p data-ar="\u{1F31F} \u0627\u0644\u0645\u062C\u0645\u0648\u0639" data-en="\u{1F31F} Score">\u{1F31F} \u0627\u0644\u0645\u062C\u0645\u0648\u0639</p><p id="res-total" class="font-bold text-3xl text-teal-600">0 / 100</p></div>
        </div>
        <div class="text-center mb-6">
            <span id="success-badge" class="success-badge grade-excellent">-</span>
            <p id="success-percent" class="text-4xl font-bold text-teal-600 mt-2">0%</p>
            <p class="text-sm text-gray-500" data-ar="\u0646\u0633\u0628\u0629 \u0627\u0644\u0646\u062C\u0627\u062D" data-en="Success Rate">\u0646\u0633\u0628\u0629 \u0627\u0644\u0646\u062C\u0627\u062D</p>
        </div>
        <div class="bg-gray-50 p-6 rounded-xl mb-6">
            <h3 class="font-bold text-lg mb-4 text-gray-800" data-ar="\u{1F4CA} \u0623\u062F\u0627\u0626\u0643 \u0641\u064A \u0643\u0644 \u0642\u0633\u0645:" data-en="\u{1F4CA} Your Performance:">\u{1F4CA} \u0623\u062F\u0627\u0626\u0643 \u0641\u064A \u0643\u0644 \u0642\u0633\u0645:</h3>
            <div class="space-y-3" id="sections-performance"></div>
        </div>
        <div class="text-center mb-6">
            <button id="sendEmailBtn" onclick="sendResultsToEmail()" class="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-lg px-8 py-3 rounded-2xl font-bold shadow-xl transition transform hover:scale-105 cursor-pointer" data-ar="\u{1F4E7} \u0623\u0631\u0633\u0644 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0644\u0644\u0645\u0639\u0644\u0645" data-en="\u{1F4E7} Send Results to Teacher">\u{1F4E7} \u0623\u0631\u0633\u0644 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0644\u0644\u0645\u0639\u0644\u0645</button>
            <p id="emailStatus" class="text-sm mt-2 text-center font-medium"></p>
        </div>
        <div class="flex gap-3 justify-center">
            <button onclick="window.print()" class="bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold" data-ar="\u{1F5A8}\uFE0F \u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0646\u062A\u064A\u062C\u0629" data-en="\u{1F5A8}\uFE0F Print Results">\u{1F5A8}\uFE0F \u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0646\u062A\u064A\u062C\u0629</button>
        </div>
    </div>

    <footer class="max-w-4xl mx-auto mt-10 mb-8 text-center text-gray-500 text-sm no-print">
        \xA9 <span data-ar="\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646" data-en="Exam Title">\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646</span> | Mr. Mohammed Hesham \u{1F4D0}
    </footer>

<script>
// ==================== \u0625\u0639\u062F\u0627\u062F\u0627\u062A EmailJS ====================
const PUBLIC_KEY = "Rb3Lq8tXaFmc5YHUH";
const SERVICE_ID = "service_w15m64i";
const TEMPLATE_ID = "template_5b0u2tq";
const TARGET_EMAIL = "mohammedhesham872@gmail.com";
emailjs.init(PUBLIC_KEY);

// ==================== \u{1F4BE} \u0646\u0638\u0627\u0645 \u062D\u0641\u0638 \u0627\u0644\u062A\u0642\u062F\u0645 ====================
// \u{1F4DD} \u063A\u064A\u0651\u0631 \u0627\u0633\u0645 \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0644\u064A\u0643\u0648\u0646 \u0641\u0631\u064A\u062F\u0627\u064B \u0644\u0643\u0644 \u0627\u0645\u062A\u062D\u0627\u0646 \u062C\u062F\u064A\u062F
const STORAGE_KEY = 'generic_exam_template_v1'; 

// \u26A0\uFE0F \u0647\u0627\u0645: \u064A\u062C\u0628 \u0623\u0646 \u062A\u062A\u0637\u0627\u0628\u0642 \u0647\u0630\u0647 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0645\u0639 \u0639\u062F\u062F \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u062A\u064A \u062A\u0636\u0639\u0647\u0627 \u0641\u064A originalExamData \u0628\u0627\u0644\u0623\u0633\u0641\u0644
const TOTAL_TIME = 3600; // \u0627\u0644\u0648\u0642\u062A \u0628\u0627\u0644\u062B\u0648\u0627\u0646\u064A (3600 = 60 \u062F\u0642\u064A\u0642\u0629)
const TOTAL_QUESTIONS = 20; // \u0627\u0644\u0639\u062F\u062F \u0627\u0644\u0643\u0644\u064A \u0644\u0644\u0623\u0633\u0626\u0644\u0629
const TOTAL_SECTIONS = 5; // \u0627\u0644\u0639\u062F\u062F \u0627\u0644\u0643\u0644\u064A \u0644\u0644\u0623\u0642\u0633\u0627\u0645
const QUESTIONS_PER_SECTION = 4; // \u0639\u062F\u062F \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0641\u064A \u0643\u0644 \u0642\u0633\u0645 (\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u062F\u0631\u062C\u0627\u062A)

let currentSeed = null;
let answersVisible = false;
let saveIndicatorTimeout = null;

function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
let rng = null;

function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    if (!indicator) return;
    indicator.classList.add('show');
    if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);
    saveIndicatorTimeout = setTimeout(() => indicator.classList.remove('show'), 1500);
}

const _memoryStore = {};
function safeStorageGet(k) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(k);
    } catch(e) {}
    return _memoryStore[k] || null;
}
function safeStorageSet(k, v) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.setItem(k, v); return; }
    } catch(e) {}
    _memoryStore[k] = String(v);
}
function safeStorageRemove(k) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.removeItem(k); return; }
    } catch(e) {}
    delete _memoryStore[k];
}

function saveState(showIndicator = true) {
    try {
        const state = {
            seed: currentSeed, lang: currentLang,
            studentName: document.getElementById('studentName')?.value || '',
            studentClass: document.getElementById('studentClass')?.value || '',
            examDate: document.getElementById('examDate')?.value || '',
            answers: getSelectedAnswers(),
            timeRemaining: timeRemaining,
            answersVisible: answersVisible, savedAt: Date.now()
        };
        safeStorageSet(STORAGE_KEY, JSON.stringify(state));
        if (showIndicator) showSaveIndicator();
    } catch (e) {}
}

function loadState() {
    try {
        const saved = safeStorageGet(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
}

function getSelectedAnswers() {
    const answers = {};
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
        const selected = document.querySelector(\`input[name="q\${i}"]:checked\`);
        if (selected) answers[i] = selected.value;
    }
    return answers;
}

function restoreAnswers(answers) {
    if (!answers) return;
    for (const [idx, val] of Object.entries(answers)) {
        const radio = document.querySelector(\`input[name="q\${idx}"][value="\${val}"]\`);
        if (radio) radio.checked = true;
    }
}

function clearProgress() {
    const confirmMsg = currentLang === 'ar' ? '\u26A0\uFE0F \u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u0645\u0633\u062D \u0643\u0644 \u0627\u0644\u062A\u0642\u062F\u0645\u061F' : '\u26A0\uFE0F Are you sure you want to clear all progress?';
    if (confirm(confirmMsg)) { safeStorageRemove(STORAGE_KEY); location.reload(); }
}

function setupAnswerListeners() {
    const content = document.getElementById('exam-content');
    if (content) {
        content.addEventListener('change', (e) => {
            if (e.target.type === 'radio') saveState();
        });
    }
}

function setupInputListeners() {
    ['studentName', 'studentClass', 'examDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => saveState(false));
            el.addEventListener('blur', () => saveState());
        }
    });
}

// =====================================================================
// \u{1F4DD} \u0628\u0646\u0643 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0644\u0645\u0627\u062F\u062A\u064A \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A (20 \u0645\u0633\u0623\u0644\u0629 \u0639\u0628\u0631 5 \u0623\u0642\u0633\u0627\u0645)
// =====================================================================
const originalExamData = {
    sections: [
        {
            id: 'sec1',
            title: { ar: '\u{1F539} \u0627\u0644\u062C\u0632\u0621 1: \u0627\u0644\u062D\u0631\u0643\u0629 \u0627\u0644\u0645\u064A\u0643\u0627\u0646\u064A\u0643\u064A\u0629 \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u0646\u064A\u0648\u062A\u0646 \u0648\u0627\u0644\u062A\u0633\u0627\u0631\u0639', en: '\u{1F539} Part 1: Mechanics, Kinematics & Newton Laws' },
            questions: [
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill q-type-graph">\u062F\u0627\u0644\u0629 \u0648\u0639\u0644\u0627\u0642\u0629 \u0628\u064A\u0627\u0646\u064A\u0629 \u0648\u062A\u0646\u0627\u0633\u0628</span><span class="q-law-pill">\u{1F4D0} d = Area under v-t graph</span></div>\u064A\u0648\u0636\u062D \u0627\u0644\u0631\u0633\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u064A \u0627\u0644\u0645\u0642\u0627\u0628\u0644 \u0645\u0646\u062D\u0646\u0649 (\u0627\u0644\u0633\u0631\u0639\u0629 - \u0627\u0644\u0632\u0645\u0646) \u0644\u0633\u064A\u0627\u0631\u0629 \u062A\u062A\u062D\u0631\u0643 \u0641\u064A \u062E\u0637 \u0645\u0633\u062A\u0642\u064A\u0645 \u0627\u0646\u0637\u0644\u0627\u0642\u0627\u064B \u0645\u0646 \u0627\u0644\u0633\u0643\u0648\u0646:
<div class="exam-diagram-container">
  <svg viewBox="0 0 360 140" class="exam-diagram" xmlns="http://www.w3.org/2000/svg" style="max-width:360px;">
    <rect width="360" height="140" fill="#f8fafc" rx="8"/>
    <line x1="45" y1="110" x2="330" y2="110" stroke="#334155" stroke-width="2"/>
    <line x1="45" y1="110" x2="45" y2="20" stroke="#334155" stroke-width="2"/>
    <line x1="45" y1="35" x2="300" y2="35" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <line x1="150" y1="110" x2="150" y2="35" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <line x1="300" y1="110" x2="300" y2="35" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <polyline points="45,110 150,35 300,35" fill="none" stroke="#0d9488" stroke-width="3"/>
    <circle cx="45" cy="110" r="3" fill="#0d9488"/>
    <circle cx="150" cy="35" r="3" fill="#0d9488"/>
    <circle cx="300" cy="35" r="3" fill="#0d9488"/>
    <text x="35" y="40" fill="#0f766e" font-size="11" font-weight="bold" text-anchor="end">20</text>
    <text x="35" y="114" fill="#64748b" font-size="11" text-anchor="end">0</text>
    <text x="150" y="126" fill="#0f766e" font-size="11" font-weight="bold" text-anchor="middle">4 s</text>
    <text x="300" y="126" fill="#0f766e" font-size="11" font-weight="bold" text-anchor="middle">10 s</text>
    <text x="45" y="15" fill="#0f766e" font-size="11" font-weight="bold" text-anchor="middle">v (m/s)</text>
    <text x="340" y="114" fill="#0f766e" font-size="11" font-weight="bold">t (s)</text>
  </svg>
</div>
\u0627\u062D\u0633\u0628 \u0627\u0644\u0625\u0632\u0627\u062D\u0629 \u0627\u0644\u0643\u0644\u064A\u0629 (d) \u0627\u0644\u062A\u064A \u0642\u0637\u0639\u062A\u0647\u0627 \u0627\u0644\u0633\u064A\u0627\u0631\u0629 \u062E\u0644\u0627\u0644 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629 \u0645\u0646 t = 0 \u0625\u0644\u0649 t = 10 s:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill q-type-graph">Graph & Kinematics</span><span class="q-law-pill">\u{1F4D0} d = Area under curve</span></div>From the velocity-time graph, calculate the total displacement covered by the car from t = 0 to t = 10 s:\`
                    },
                    options: [
                        { ar: "160 m", en: "160 m" },
                        { ar: "200 m", en: "200 m" },
                        { ar: "120 m", en: "120 m" },
                        { ar: "140 m", en: "140 m" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0627\u0644\u0625\u0632\u0627\u062D\u0629 \u0641\u064A \u0645\u0646\u062D\u0646\u0649 \u0627\u0644\u0633\u0631\u0639\u0629-\u0627\u0644\u0632\u0645\u0646 \u062A\u0633\u0627\u0648\u064A \u0627\u0644\u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0643\u0644\u064A\u0629 \u062A\u062D\u062A \u0627\u0644\u0645\u0646\u062D\u0646\u0649: \u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0645\u062B\u0644\u062B (0 \u0625\u0644\u0649 4 \u062B\u0648\u0627\u0646\u064D) = 0.5 \xD7 4 \xD7 20 = 40 m. \u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0645\u0633\u062A\u0637\u064A\u0644 (4 \u0625\u0644\u0649 10 \u062B\u0648\u0627\u0646\u064D) = (10 - 4) \xD7 20 = 120 m. \u0627\u0644\u0625\u0632\u0627\u062D\u0629 \u0627\u0644\u0643\u0644\u064A\u0629 d = 40 + 120 = 160 m.",
                        en: "Displacement is the area under the v-t curve: Triangle (0 to 4s) = 0.5 \xD7 4 \xD7 20 = 40 m. Rectangle (4 to 10s) = 6 \xD7 20 = 120 m. Total displacement = 40 + 120 = 160 m."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} d = v\u2080t + 0.5at\xB2</span></div>\u062A\u062A\u062D\u0631\u0643 \u0633\u064A\u0627\u0631\u0629 \u0628\u0633\u0631\u0639\u0629 \u0627\u0628\u062A\u062F\u0627\u0626\u064A\u0629 $v_0 = 10\\text{ m/s}$ \u0641\u064A \u062E\u0637 \u0645\u0633\u062A\u0642\u064A\u0645 \u0628\u062A\u0633\u0627\u0631\u0639 \u0645\u0646\u062A\u0638\u0645 $a = 3\\text{ m/s}^2$. \u0645\u0627 \u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u062A\u064A \u062A\u0642\u0637\u0639\u0647\u0627 \u062E\u0644\u0627\u0644 \u0632\u0645\u0646 $t = 4\\text{ s}$\u061F\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} d = v\u2080t + 0.5at\xB2</span></div>A car moves with initial velocity v\u2080 = 10 m/s with constant acceleration a = 3 m/s\xB2. What distance does it cover in t = 4 s?\`
                    },
                    options: [
                        { ar: "64 m", en: "64 m" },
                        { ar: "52 m", en: "52 m" },
                        { ar: "40 m", en: "40 m" },
                        { ar: "24 m", en: "24 m" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0645\u0646 \u0645\u0639\u0627\u062F\u0644\u0629 \u0627\u0644\u062D\u0631\u0643\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629: $d = v_0 t + \\frac{1}{2} a t^2 = 10(4) + 0.5(3)(4^2) = 40 + 0.5(3)(16) = 40 + 24 = 64\\text{ m}$.",
                        en: "From the second kinematic equation: d = v\u2080t + 0.5at\xB2 = 10(4) + 0.5(3)(16) = 40 + 24 = 64 m."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} F = m \xB7 a , v\xB2 = 2ad</span></div>\u062A\u0624\u062B\u0631 \u0642\u0648\u0629 \u0623\u0641\u0642\u064A\u0629 \u062B\u0627\u0628\u062A\u0629 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 $F = 40\\text{ N}$ \u0639\u0644\u0649 \u062C\u0633\u0645 \u0643\u062A\u0644\u062A\u0647 $m = 5\\text{ kg}$ \u0645\u0648\u0636\u0648\u0639 \u0639\u0644\u0649 \u0633\u0637\u062D \u0623\u0641\u0642\u064A \u0623\u0645\u0644\u0633 \u0639\u062F\u064A\u0645 \u0627\u0644\u0627\u062D\u062A\u0643\u0627\u0643. \u0627\u062D\u0633\u0628 \u0633\u0631\u0639\u0629 \u0627\u0644\u062C\u0633\u0645 ($v$) \u0628\u0639\u062F \u0642\u0637\u0639\u0647 \u0645\u0633\u0627\u0641\u0629 $d = 4\\text{ m}$ \u0628\u062F\u0621\u0627\u064B \u0645\u0646 \u0627\u0644\u0633\u0643\u0648\u0646:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} F = m \xB7 a , v\xB2 = 2ad</span></div>A horizontal force F = 40 N acts on a 5 kg mass on a frictionless surface. What is its velocity after moving d = 4 m from rest?\`
                    },
                    options: [
                        { ar: "8 m/s", en: "8 m/s" },
                        { ar: "4 m/s", en: "4 m/s" },
                        { ar: "16 m/s", en: "16 m/s" },
                        { ar: "6.4 m/s", en: "6.4 m/s" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0623\u0648\u0644\u0627\u064B \u0646\u062D\u0633\u0628 \u0627\u0644\u062A\u0633\u0627\u0631\u0639: $a = F / m = 40 / 5 = 8\\text{ m/s}^2$. \u062B\u0627\u0646\u064A\u0627\u064B \u0645\u0646 \u0645\u0639\u0627\u062F\u0644\u0629 \u0627\u0644\u062D\u0631\u0643\u0629: $v^2 = v_0^2 + 2ad = 0 + 2(8)(4) = 64 \\implies v = \\sqrt{64} = 8\\text{ m/s}$.",
                        en: "Acceleration a = F / m = 40 / 5 = 8 m/s\xB2. From kinematics: v\xB2 = 0 + 2(8)(4) = 64 => v = 8 m/s."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} F = \u0394p / \u0394t = m(v\u2082 - v\u2081) / t</span></div>\u062C\u0633\u0645 \u0643\u062A\u0644\u062A\u0647 $m = 8\\text{ kg}$ \u064A\u062A\u062D\u0631\u0643 \u0628\u0633\u0631\u0639\u0629 $v_1 = 5\\text{ m/s}$. \u0623\u062B\u0631\u062A \u0639\u0644\u064A\u0647 \u0642\u0648\u0629 \u0645\u062D\u0635\u0644\u0629 \u0644\u0645\u062F\u0629 $t = 2\\text{ s}$ \u0641\u0623\u0635\u0628\u062D\u062A \u0633\u0631\u0639\u062A\u0647 $v_2 = 15\\text{ m/s}$. \u0627\u062D\u0633\u0628 \u0645\u0642\u062F\u0627\u0631 \u0627\u0644\u0642\u0648\u0629 \u0627\u0644\u0645\u062D\u0635\u0644\u0629 \u0627\u0644\u0645\u0624\u062B\u0631\u0629:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} F = \u0394p / \u0394t</span></div>An 8 kg mass accelerates from 5 m/s to 15 m/s in 2 seconds. What net force was applied?\`
                    },
                    options: [
                        { ar: "40 N", en: "40 N" },
                        { ar: "80 N", en: "80 N" },
                        { ar: "20 N", en: "20 N" },
                        { ar: "10 N", en: "10 N" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0627\u0644\u062A\u0633\u0627\u0631\u0639: $a = \\Delta v / \\Delta t = (15 - 5) / 2 = 5\\text{ m/s}^2$. \u0627\u0644\u0642\u0648\u0629 \u0627\u0644\u0645\u062D\u0635\u0644\u0629: $F = m \\cdot a = 8 \\times 5 = 40\\text{ N}$.",
                        en: "Acceleration a = (15 - 5) / 2 = 5 m/s\xB2. Net force F = m \xB7 a = 8 \xD7 5 = 40 N."
                    }
                }
            ]
        },
        {
            id: 'sec2',
            title: { ar: '\u{1F539} \u0627\u0644\u062C\u0632\u0621 2: \u0627\u0644\u062F\u0648\u0627\u0626\u0631 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0648\u0642\u0627\u0646\u0648\u0646 \u0623\u0648\u0645 \u0648\u062A\u0648\u0635\u064A\u0644 \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0627\u062A', en: '\u{1F539} Part 2: Electric Circuits & Ohm Law' },
            questions: [
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill q-type-interactive">\u062F\u0627\u0626\u0631\u0629 \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u062A\u0641\u0627\u0639\u0644\u064A</span><span class="q-law-pill">\u{1F4D0} I = V / R_eq</span></div>\u0641\u064A \u0627\u0644\u062F\u0627\u0626\u0631\u0629 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0627\u0644\u0645\u0648\u0636\u062D\u0629 \u0628\u0627\u0644\u0631\u0633\u0645 \u0623\u062F\u0646\u0627\u0647\u060C \u0648\u0635\u0644\u062A \u0645\u0642\u0627\u0648\u0645\u062A\u0627\u0646 \u0645\u062A\u0648\u0627\u0632\u064A\u062A\u0627\u0646 ($R_1 = 6\\ \\Omega, R_2 = 3\\ \\Omega$) \u0639\u0644\u0649 \u0627\u0644\u062A\u0648\u0627\u0644\u064A \u0645\u0639 \u0645\u0642\u0627\u0648\u0645\u0629 \u062B\u0627\u0644\u062B\u0629 ($R_3 = 2\\ \\Omega$) \u0648\u0628\u0637\u0627\u0631\u064A\u0629 \u0641\u0631\u0642 \u062C\u0647\u062F\u0647\u0627 $V = 16\\text{ V}$. \u0645\u0627 \u0645\u0642\u062F\u0627\u0631 \u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 \u0627\u0644\u0643\u0644\u064A ($I$) \u0627\u0644\u0645\u0627\u0631 \u0641\u064A \u0627\u0644\u062F\u0627\u0626\u0631\u0629\u061F
<div class="exam-diagram-container">
  <svg viewBox="0 0 380 120" class="exam-diagram" xmlns="http://www.w3.org/2000/svg" style="max-width:380px;">
    <rect width="380" height="120" fill="#f8fafc" rx="8"/>
    <rect x="30" y="20" width="320" height="80" fill="none" stroke="#0f766e" stroke-width="2.5" rx="4"/>
    <line x1="30" y1="45" x2="30" y2="75" stroke="#f8fafc" stroke-width="5"/>
    <line x1="20" y1="52" x2="40" y2="52" stroke="#0f766e" stroke-width="3"/>
    <line x1="25" y1="62" x2="35" y2="62" stroke="#0f766e" stroke-width="1.5"/>
    <text x="50" y="60" fill="#0f766e" font-weight="bold" font-size="12">V = 16V</text>
    <rect x="90" y="12" width="55" height="16" fill="#e2e8f0" stroke="#0f766e" stroke-width="2" rx="3"/>
    <text x="117" y="24" fill="#0f766e" font-weight="bold" font-size="11" text-anchor="middle">R\u2083 = 2\u03A9</text>
    <line x1="180" y1="20" x2="180" y2="6" stroke="#0f766e" stroke-width="2"/>
    <line x1="180" y1="20" x2="180" y2="34" stroke="#0f766e" stroke-width="2"/>
    <rect x="205" y="-1" width="55" height="15" fill="#e2e8f0" stroke="#0f766e" stroke-width="2" rx="3"/>
    <text x="232" y="11" fill="#0f766e" font-weight="bold" font-size="11" text-anchor="middle">R\u2081 = 6\u03A9</text>
    <rect x="205" y="27" width="55" height="15" fill="#e2e8f0" stroke="#0f766e" stroke-width="2" rx="3"/>
    <text x="232" y="39" fill="#0f766e" font-weight="bold" font-size="11" text-anchor="middle">R\u2082 = 3\u03A9</text>
    <line x1="180" y1="6" x2="205" y2="6" stroke="#0f766e" stroke-width="2"/>
    <line x1="180" y1="34" x2="205" y2="34" stroke="#0f766e" stroke-width="2"/>
    <line x1="260" y1="6" x2="285" y2="6" stroke="#0f766e" stroke-width="2"/>
    <line x1="260" y1="34" x2="285" y2="34" stroke="#0f766e" stroke-width="2"/>
    <line x1="285" y1="6" x2="285" y2="34" stroke="#0f766e" stroke-width="2"/>
    <line x1="285" y1="20" x2="350" y2="20" stroke="#0f766e" stroke-width="2"/>
  </svg>
</div>\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill q-type-interactive">Circuit Diagram</span><span class="q-law-pill">\u{1F4D0} I = V / R_eq</span></div>In the circuit shown, two parallel resistors (R\u2081 = 6 \u03A9, R\u2082 = 3 \u03A9) connect in series with R\u2083 = 2 \u03A9 and a 16 V source. What is the total current I?\`
                    },
                    options: [
                        { ar: "4 A", en: "4 A" },
                        { ar: "2.67 A", en: "2.67 A" },
                        { ar: "8 A", en: "8 A" },
                        { ar: "1.6 A", en: "1.6 A" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0645\u0643\u0627\u0641\u0626\u0629 \u0644\u0644\u062A\u0648\u0627\u0632\u064A: $R_p = (6 \\times 3) / (6 + 3) = 18 / 9 = 2\\ \\Omega$. \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0643\u0644\u064A\u0629: $R_{eq} = R_p + R_3 = 2 + 2 = 4\\ \\Omega$. \u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 \u0627\u0644\u0643\u0644\u064A: $I = V / R_{eq} = 16 / 4 = 4\\text{ A}$.",
                        en: "R_parallel = (6 \xD7 3)/(6 + 3) = 2 \u03A9. R_total = 2 + 2 = 4 \u03A9. Current I = 16 / 4 = 4 A."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u062A\u062C\u0631\u0628\u0629 \u0639\u0645\u0644\u064A\u0629 \u0648\u062C\u062F\u0648\u0644 \u0642\u064A\u0627\u0633\u0627\u062A</span><span class="q-law-pill">\u{1F4D0} R = \u0394V / \u0394I</span></div>\u064A\u0648\u0636\u062D \u0627\u0644\u062C\u062F\u0648\u0644 \u0623\u062F\u0646\u0627\u0647 \u0646\u062A\u0627\u0626\u062C \u062A\u062C\u0631\u0628\u0629 \u0639\u0645\u0644\u064A\u0629 \u0644\u0642\u064A\u0627\u0633 \u0641\u0631\u0642 \u0627\u0644\u062C\u0647\u062F ($V$) \u0648\u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 ($I$) \u0627\u0644\u0645\u0627\u0631 \u0641\u064A \u0645\u0648\u0635\u0644 \u0641\u0644\u0632\u064A \u0623\u0648\u0645\u064A:
<div class="exam-table-container">
  <table class="exam-table">
    <thead>
      <tr>
        <th>\u0641\u0631\u0642 \u0627\u0644\u062C\u0647\u062F V (\u0641\u0648\u0644\u062A)</th>
        <td>2.0</td>
        <td>4.0</td>
        <td>6.0</td>
        <td>8.0</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th>\u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 I (\u0623\u0645\u0628\u064A\u0631)</th>
        <td>0.5</td>
        <td>1.0</td>
        <td>1.5</td>
        <td>2.0</td>
      </tr>
    </tbody>
  </table>
</div>
\u0637\u0628\u0642 \u0642\u0627\u0646\u0648\u0646 \u0623\u0648\u0645 \u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 ($R$) \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0635\u0644:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Experimental Data</span><span class="q-law-pill">\u{1F4D0} R = \u0394V / \u0394I</span></div>Based on the experimental measurements table for V and I across an ohmic conductor, calculate the electrical resistance R:\`
                    },
                    options: [
                        { ar: "4.0 \u03A9", en: "4.0 \u03A9" },
                        { ar: "0.25 \u03A9", en: "0.25 \u03A9" },
                        { ar: "8.0 \u03A9", en: "8.0 \u03A9" },
                        { ar: "2.0 \u03A9", en: "2.0 \u03A9" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0648\u0641\u0642\u0627\u064B \u0644\u0642\u0627\u0646\u0648\u0646 \u0623\u0648\u0645: $R = \\Delta V / \\Delta I$. \u0628\u0623\u062E\u0630 \u0623\u064A \u0632\u0648\u062C \u0645\u0646 \u0627\u0644\u0642\u064A\u0645: $R = (8.0 - 2.0) / (2.0 - 0.5) = 6.0 / 1.5 = 4.0\\ \\Omega$.",
                        en: "According to Ohm's law: R = \u0394V / \u0394I = (8.0 - 2.0) / (2.0 - 0.5) = 4.0 \u03A9."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} P = V\xB2 / R \u27F9 R = V\xB2 / P</span></div>\u0645\u0635\u0628\u0627\u062D \u0643\u0647\u0631\u0628\u064A \u0643\u064F\u062A\u0628 \u0639\u0644\u064A\u0647 ($100\\text{ W} , 220\\text{ V}$). \u0645\u0627 \u0647\u064A \u0642\u064A\u0645\u0629 \u0645\u0642\u0627\u0648\u0645\u0629 \u0641\u062A\u064A\u0644\u0629 \u0647\u0630\u0627 \u0627\u0644\u0645\u0635\u0628\u0627\u062D \u0623\u062B\u0646\u0627\u0621 \u062A\u0634\u063A\u064A\u0644\u0647 \u0628\u0627\u0644\u062C\u0647\u062F \u0627\u0644\u0627\u0633\u0645\u064A\u061F\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} R = V\xB2 / P</span></div>An electric lamp is rated (100 W, 220 V). What is the resistance of its filament when operating at rated voltage?\`
                    },
                    options: [
                        { ar: "484 \u03A9", en: "484 \u03A9" },
                        { ar: "220 \u03A9", en: "220 \u03A9" },
                        { ar: "2.2 \u03A9", en: "2.2 \u03A9" },
                        { ar: "48.4 \u03A9", en: "48.4 \u03A9" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0645\u0646 \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0642\u062F\u0631\u0629 \u0627\u0644\u0643\u0647\u0631\u0628\u064A\u0629: $P = V^2 / R \\implies R = V^2 / P = (220)^2 / 100 = 48400 / 100 = 484\\ \\Omega$.",
                        en: "From the power formula: P = V\xB2 / R => R = (220)\xB2 / 100 = 48400 / 100 = 484 \u03A9."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} R = \u03C1 \xB7 (L / A)</span></div>\u0633\u0644\u0643 \u0646\u062D\u0627\u0633\u064A \u0637\u0648\u0644\u0647 $L = 20\\text{ m}$ \u0648\u0645\u0633\u0627\u062D\u0629 \u0645\u0642\u0637\u0639\u0647 \u0627\u0644\u0639\u0631\u0636\u064A $A = 2\\times 10^{-6}\\text{ m}^2$ \u0648\u0645\u0642\u0627\u0648\u0645\u062A\u0647 \u0627\u0644\u0646\u0648\u0639\u064A\u0629 $\\rho = 1.7\\times 10^{-8}\\ \\Omega\\cdot\\text{m}$. \u0627\u062D\u0633\u0628 \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 ($R$) \u0644\u0644\u0633\u0644\u0643:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} R = \u03C1 \xB7 (L / A)</span></div>A copper wire of length 20 m has cross-section 2 \xD7 10\u207B\u2076 m\xB2 and resistivity \u03C1 = 1.7 \xD7 10\u207B\u2078 \u03A9\xB7m. Calculate its resistance: \`
                    },
                    options: [
                        { ar: "0.17 \u03A9", en: "0.17 \u03A9" },
                        { ar: "1.7 \u03A9", en: "1.7 \u03A9" },
                        { ar: "0.017 \u03A9", en: "0.017 \u03A9" },
                        { ar: "17 \u03A9", en: "17 \u03A9" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0646\u0648\u0639\u064A\u0629: $R = \\rho \\cdot (L / A) = (1.7\\times 10^{-8} \\times 20) / (2\\times 10^{-6}) = 34\\times 10^{-8} / 2\\times 10^{-6} = 17\\times 10^{-2} = 0.17\\ \\Omega$.",
                        en: "R = \u03C1(L / A) = (1.7 \xD7 10\u207B\u2078 \xD7 20) / (2 \xD7 10\u207B\u2076) = 0.17 \u03A9."
                    }
                }
            ]
        },
        {
            id: 'sec3',
            title: { ar: '\u{1F539} \u0627\u0644\u062C\u0632\u0621 3: \u0627\u0644\u062A\u0641\u0627\u0636\u0644 \u0648\u0627\u0644\u062A\u0643\u0627\u0645\u0644 \u0648\u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0631\u064A\u0627\u0636\u064A', en: '\u{1F539} Part 3: Calculus & Mathematical Analysis' },
            questions: [
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} f'(x) = d/dx(ax\xB2 + bx + c)</span></div>\u0623\u0648\u062C\u062F \u0645\u064A\u0644 \u0627\u0644\u0645\u0645\u0627\u0633 \u0644\u0645\u0646\u062D\u0646\u0649 \u0627\u0644\u062F\u0627\u0644\u0629 $f(x) = 2x^2 - 5x + 4$ \u0639\u0646\u062F \u0627\u0644\u0646\u0642\u0637\u0629 \u0627\u0644\u062A\u064A \u0625\u062D\u062F\u0627\u062B\u064A\u0647\u0627 \u0627\u0644\u0633\u064A\u0646\u064A $x = 3$:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} f'(x) = d/dx</span></div>Find the slope of the tangent line to f(x) = 2x\xB2 - 5x + 4 at x = 3:\`
                    },
                    options: [
                        { ar: "7", en: "7" },
                        { ar: "11", en: "11" },
                        { ar: "5", en: "5" },
                        { ar: "9", en: "9" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0627\u0644\u0645\u0634\u062A\u0642\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u062A\u0645\u062B\u0644 \u0645\u064A\u0644 \u0627\u0644\u0645\u0645\u0627\u0633: $f'(x) = 4x - 5$. \u0628\u0627\u0644\u062A\u0639\u0648\u064A\u0636 \u0628\u0642\u064A\u0645\u0629 $x = 3$: $f'(3) = 4(3) - 5 = 12 - 5 = 7$.",
                        en: "Slope of the tangent is f'(x) = 4x - 5. At x = 3: f'(3) = 4(3) - 5 = 7."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} \u222B x^n dx = x^(n+1)/(n+1)</span></div>\u0627\u062D\u0633\u0628 \u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0643\u0627\u0645\u0644 \u0627\u0644\u0645\u062D\u062F\u0648\u062F \u0627\u0644\u062A\u0627\u0644\u064A: $\\int_{1}^{4} (3x^2 - 2x)\\ dx$:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} Definite Integration</span></div>Evaluate the definite integral \u222B from 1 to 4 of (3x\xB2 - 2x) dx:\`
                    },
                    options: [
                        { ar: "48", en: "48" },
                        { ar: "63", en: "63" },
                        { ar: "45", en: "45" },
                        { ar: "52", en: "52" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u062F\u0627\u0644\u0629 \u0627\u0644\u062A\u0643\u0627\u0645\u0644 \u0627\u0644\u0623\u0635\u0644\u064A\u0629: $F(x) = [x^3 - x^2]$. \u0628\u0627\u0644\u062A\u0639\u0648\u064A\u0636 \u0628\u062D\u062F\u0648\u062F \u0627\u0644\u062A\u0643\u0627\u0645\u0644: $F(4) - F(1) = (4^3 - 4^2) - (1^3 - 1^2) = (64 - 16) - (1 - 1) = 48 - 0 = 48$.",
                        en: "Antiderivative: [x\xB3 - x\xB2]. From 1 to 4: (64 - 16) - (1 - 1) = 48."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u062F\u0627\u0644\u0629 \u0648\u0639\u0644\u0627\u0642\u0629 \u0628\u064A\u0627\u0646\u064A\u0629 \u0648\u062A\u0646\u0627\u0633\u0628</span><span class="q-law-pill">\u{1F4D0} a(t) = s''(t)</span></div>\u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u062F\u0627\u0644\u0629 \u0627\u0644\u0645\u0648\u0636\u0639 \u0644\u062C\u0633\u0645 \u0645\u062A\u062D\u0631\u0643 \u062A\u064F\u0639\u0637\u0649 \u0628\u0627\u0644\u0639\u0644\u0627\u0642\u0629 $s(t) = 2t^3 - 6t^2 + 10$ \u062D\u064A\u062B $s$ \u0628\u0627\u0644\u0623\u0645\u062A\u0627\u0631 \u0648 $t$ \u0628\u0627\u0644\u062B\u0648\u0627\u0646\u064A\u060C \u0641\u0645\u0627 \u0647\u0648 \u062A\u0633\u0627\u0631\u0639 \u0627\u0644\u062C\u0633\u0645 \u0627\u0644\u0644\u062D\u0638\u064A \u0639\u0646\u062F $t = 2\\text{ s}$\u061F\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Second Derivative</span><span class="q-law-pill">\u{1F4D0} a(t) = s''(t)</span></div>Given position function s(t) = 2t\xB3 - 6t\xB2 + 10, find instantaneous acceleration at t = 2 s:\`
                    },
                    options: [
                        { ar: "12 m/s\xB2", en: "12 m/s\xB2" },
                        { ar: "24 m/s\xB2", en: "24 m/s\xB2" },
                        { ar: "0 m/s\xB2", en: "0 m/s\xB2" },
                        { ar: "6 m/s\xB2", en: "6 m/s\xB2" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0627\u0644\u0633\u0631\u0639\u0629 \u0647\u064A \u0627\u0644\u0645\u0634\u062A\u0642\u0629 \u0627\u0644\u0623\u0648\u0644\u0649: $v(t) = s'(t) = 6t^2 - 12t$. \u0627\u0644\u062A\u0633\u0627\u0631\u0639 \u0647\u0648 \u0627\u0644\u0645\u0634\u062A\u0642\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629: $a(t) = v'(t) = 12t - 12$. \u0639\u0646\u062F $t = 2\\text{ s}$: $a(2) = 12(2) - 12 = 24 - 12 = 12\\text{ m/s}^2$.",
                        en: "Velocity v(t) = 6t\xB2 - 12t. Acceleration a(t) = 12t - 12. At t = 2s: a(2) = 24 - 12 = 12 m/s\xB2."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} log_b(x \xB7 y) = log_b(x) + log_b(y)</span></div>\u062D\u0644 \u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0629 \u0627\u0644\u0644\u0648\u063A\u0627\u0631\u064A\u062A\u0645\u064A\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0641\u064A \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0623\u0639\u062F\u0627\u062F \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 $\\mathbb{R}$: $\\log_2(x) + \\log_2(x - 2) = 3$:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} Logarithmic Equations</span></div>Solve the equation in \u211D: log\u2082(x) + log\u2082(x - 2) = 3:\`
                    },
                    options: [
                        { ar: "x = 4", en: "x = 4" },
                        { ar: "x = -2, x = 4", en: "x = -2, x = 4" },
                        { ar: "x = 8", en: "x = 8" },
                        { ar: "x = 3", en: "x = 3" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "$\\log_2(x(x - 2)) = 3 \\implies x^2 - 2x = 2^3 = 8 \\implies x^2 - 2x - 8 = 0 \\implies (x - 4)(x + 2) = 0$. \u0628\u0645\u0627 \u0623\u0646 \u0645\u062C\u0627\u0644 \u0627\u0644\u0644\u0648\u063A\u0627\u0631\u064A\u062A\u0645 \u064A\u0634\u062A\u0631\u0637 $x > 2$\u060C \u0641\u0625\u0646 \u0627\u0644\u062D\u0644 \u0627\u0644\u0645\u0642\u0628\u0648\u0644 \u0647\u0648 $x = 4$ \u0641\u0642\u0637 \u0648\u064A\u0647\u0645\u0644 \u0627\u0644\u062D\u0644 \u0627\u0644\u0633\u0627\u0644\u0628.",
                        en: "log\u2082(x(x - 2)) = 3 => x\xB2 - 2x = 8 => (x - 4)(x + 2) = 0. Since domain requires x > 2, x = 4 is the only valid solution."
                    }
                }
            ]
        },
        {
            id: 'sec4',
            title: { ar: '\u{1F539} \u0627\u0644\u062C\u0632\u0621 4: \u0627\u0644\u0645\u062A\u062C\u0647\u0627\u062A \u0648\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u062B\u0644\u062B\u0627\u062A \u0648\u0627\u0644\u0647\u0646\u062F\u0633\u0629', en: '\u{1F539} Part 4: Vectors, Trigonometry & Geometry' },
            questions: [
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill q-type-graph">\u0647\u0646\u062F\u0633\u0629 \u0648\u062D\u0633\u0627\u0628 \u0645\u062B\u0644\u062B\u0627\u062A</span><span class="q-law-pill">\u{1F4D0} c = \u221A(a\xB2 + b\xB2) , sin(\u03B8) = b / c</span></div>\u0641\u064A \u0627\u0644\u0645\u062B\u0644\u062B \u0627\u0644\u0642\u0627\u0626\u0645 \u0627\u0644\u0632\u0627\u0648\u064A\u0629 \u0627\u0644\u0645\u0648\u0636\u062D \u0628\u0627\u0644\u0634\u0643\u0644 \u0623\u062F\u0646\u0627\u0647\u060C \u0637\u0648\u0644 \u0627\u0644\u0636\u0644\u0639 \u0627\u0644\u0645\u062C\u0627\u0648\u0631 $a = 6\\text{ cm}$\u060C \u0648\u0637\u0648\u0644 \u0627\u0644\u0636\u0644\u0639 \u0627\u0644\u0645\u0642\u0627\u0628\u0644 $b = 8\\text{ cm}$:
<div class="exam-diagram-container">
  <svg viewBox="0 0 320 140" class="exam-diagram" xmlns="http://www.w3.org/2000/svg" style="max-width:320px;">
    <rect width="320" height="140" fill="#f8fafc" rx="8"/>
    <polygon points="50,115 230,115 50,25" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/>
    <rect x="50" y="102" width="13" height="13" fill="none" stroke="#0284c7" stroke-width="1.5"/>
    <text x="140" y="132" fill="#0369a1" font-weight="bold" font-size="12" text-anchor="middle">a = 6 cm</text>
    <text x="35" y="75" fill="#0369a1" font-weight="bold" font-size="12" text-anchor="end">b = 8 cm</text>
    <text x="155" y="65" fill="#dc2626" font-weight="bold" font-size="13">c = ?</text>
    <text x="195" y="108" fill="#0369a1" font-weight="bold" font-size="12">\u03B8</text>
  </svg>
</div>
\u0627\u062D\u0633\u0628 \u0637\u0648\u0644 \u0627\u0644\u0648\u062A\u0631 ($c$) \u062B\u0645 \u0623\u0648\u062C\u062F \u0642\u064A\u0645\u0629 \u0627\u0644\u062C\u064A\u0628 $\\sin(\\theta)$ \u0644\u0644\u0632\u0627\u0648\u064A\u0629 \u0627\u0644\u0645\u0648\u0636\u062D\u0629:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill q-type-graph">Geometry</span><span class="q-law-pill">\u{1F4D0} Pythagoras & Trig</span></div>In the right triangle shown with adjacent side a = 6 cm and opposite side b = 8 cm, find the hypotenuse c and sin(\u03B8):\`
                    },
                    options: [
                        { ar: "c = 10 cm, sin(\u03B8) = 0.8", en: "c = 10 cm, sin(\u03B8) = 0.8" },
                        { ar: "c = 10 cm, sin(\u03B8) = 0.6", en: "c = 10 cm, sin(\u03B8) = 0.6" },
                        { ar: "c = 14 cm, sin(\u03B8) = 0.8", en: "c = 14 cm, sin(\u03B8) = 0.8" },
                        { ar: "c = 12 cm, sin(\u03B8) = 0.5", en: "c = 12 cm, sin(\u03B8) = 0.5" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0645\u0646 \u0645\u0628\u0631\u0647\u0646\u0629 \u0641\u064A\u062B\u0627\u063A\u0648\u0631\u0633: $c = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10\\text{ cm}$. \u062C\u064A\u0628 \u0627\u0644\u0632\u0627\u0648\u064A\u0629: $\\sin(\\theta) = \\text{\u0627\u0644\u0645\u0642\u0627\u0628\u0644} / \\text{\u0627\u0644\u0648\u062A\u0631} = 8 / 10 = 0.8$.",
                        en: "c = \u221A(6\xB2 + 8\xB2) = 10 cm. sin(\u03B8) = opposite / hypotenuse = 8 / 10 = 0.8."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} A \xB7 B = AxBx + AyBy</span></div>\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0645\u062A\u062C\u0647\u0627\u0646 $\\vec{A} = (3\\hat{i} + 4\\hat{j})$ \u0648 $\\vec{B} = (2\\hat{i} - 1\\hat{j})$\u060C \u0641\u0645\u0627 \u0647\u064A \u0642\u064A\u0645\u0629 \u062D\u0627\u0635\u0644 \u0627\u0644\u0636\u0631\u0628 \u0627\u0644\u0642\u064A\u0627\u0633\u064A (\u0627\u0644\u0639\u062F\u062F\u064A) $\\vec{A} \\cdot \\vec{B}$\u061F\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} Vector Dot Product</span></div>Given vectors A = 3i + 4j and B = 2i - 1j, what is the scalar dot product A \xB7 B?\`
                    },
                    options: [
                        { ar: "2", en: "2" },
                        { ar: "10", en: "10" },
                        { ar: "14", en: "14" },
                        { ar: "-2", en: "-2" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0627\u0644\u0636\u0631\u0628 \u0627\u0644\u0642\u064A\u0627\u0633\u064A: $\\vec{A} \\cdot \\vec{B} = A_x B_x + A_y B_y = (3)(2) + (4)(-1) = 6 - 4 = 2$.",
                        en: "A \xB7 B = AxBx + AyBy = (3)(2) + (4)(-1) = 6 - 4 = 2."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} cos(2\u03B8) = 1 - 2sin\xB2(\u03B8)</span></div>\u0625\u0630\u0627 \u0643\u0627\u0646\u062A $\\sin(\\theta) = 0.6$ \u062D\u064A\u062B $\\theta$ \u0632\u0627\u0648\u064A\u0629 \u062D\u0627\u062F\u0629 \u0641\u064A \u0627\u0644\u0631\u0628\u0639 \u0627\u0644\u0623\u0648\u0644\u060C \u0641\u0645\u0627 \u0647\u064A \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062F\u0642\u064A\u0642\u0629 \u0644\u0640 $\\cos(2\\theta)$\u061F\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} Double Angle Identity</span></div>If sin(\u03B8) = 0.6 in the first quadrant, what is the exact value of cos(2\u03B8)?\`
                    },
                    options: [
                        { ar: "0.28", en: "0.28" },
                        { ar: "0.64", en: "0.64" },
                        { ar: "0.80", en: "0.80" },
                        { ar: "0.36", en: "0.36" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u062A\u0637\u0627\u0628\u0642\u0629 \u0636\u0639\u0641 \u0627\u0644\u0632\u0627\u0648\u064A\u0629: $\\cos(2\\theta) = 1 - 2\\sin^2(\\theta) = 1 - 2(0.6)^2 = 1 - 2(0.36) = 1 - 0.72 = 0.28$.",
                        en: "Using the double-angle identity: cos(2\u03B8) = 1 - 2sin\xB2(\u03B8) = 1 - 2(0.36) = 0.28."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} F = B \xB7 I \xB7 L \xB7 sin(\u03B8)</span></div>\u0633\u0644\u0643 \u0645\u0633\u062A\u0642\u064A\u0645 \u0637\u0648\u0644\u0647 $L = 0.5\\text{ m}$ \u064A\u0645\u0631 \u0628\u0647 \u062A\u064A\u0627\u0631 $I = 4\\text{ A}$ \u0645\u0648\u0636\u0648\u0639 \u0639\u0645\u0648\u062F\u064A\u0627\u064B \u0641\u064A \u0645\u062C\u0627\u0644 \u0645\u063A\u0646\u0627\u0637\u064A\u0633\u064A \u0645\u0646\u062A\u0638\u0645 \u0634\u062F\u062A\u0647 $B = 0.6\\text{ T}$. \u0627\u062D\u0633\u0628 \u0627\u0644\u0642\u0648\u0629 \u0627\u0644\u0645\u063A\u0646\u0627\u0637\u064A\u0633\u064A\u0629 \u0627\u0644\u0645\u0624\u062B\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u0633\u0644\u0643:\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} F = B \xB7 I \xB7 L \xB7 sin(\u03B8)</span></div>A straight wire of length 0.5 m carrying 4 A is placed perpendicular in a 0.6 T magnetic field. Calculate the magnetic force:\`
                    },
                    options: [
                        { ar: "1.2 N", en: "1.2 N" },
                        { ar: "2.4 N", en: "2.4 N" },
                        { ar: "0.6 N", en: "0.6 N" },
                        { ar: "4.8 N", en: "4.8 N" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0642\u0648\u0629 \u0627\u0644\u0645\u063A\u0646\u0627\u0637\u064A\u0633\u064A\u0629: $F = B \\cdot I \\cdot L \\cdot \\sin(90^\\circ) = 0.6 \\times 4 \\times 0.5 \\times 1 = 1.2\\text{ N}$.",
                        en: "Magnetic force: F = B \xB7 I \xB7 L \xB7 sin(90\xB0) = 0.6 \xD7 4 \xD7 0.5 = 1.2 N."
                    }
                }
            ]
        },
        {
            id: 'sec5',
            title: { ar: '\u{1F539} \u0627\u0644\u062C\u0632\u0621 5: \u0627\u0644\u0634\u063A\u0644 \u0648\u0627\u0644\u0637\u0627\u0642\u0629 \u0648\u0627\u0644\u0645\u0648\u062C\u0627\u062A \u0648\u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0627\u0644\u062D\u062F\u064A\u062B\u0629', en: '\u{1F539} Part 5: Energy, Waves & Modern Physics' },
            questions: [
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} W = \u0394KE = -0.5 m v\xB2</span></div>\u0633\u064A\u0627\u0631\u0629 \u0643\u062A\u0644\u062A\u0647\u0627 $m = 1200\\text{ kg}$ \u062A\u0633\u064A\u0631 \u0628\u0633\u0631\u0639\u0629 $v = 20\\text{ m/s}$. \u0636\u063A\u0637 \u0627\u0644\u0633\u0627\u0626\u0642 \u0639\u0644\u0649 \u0627\u0644\u0645\u0643\u0627\u0628\u062D \u062D\u062A\u0649 \u062A\u0648\u0642\u0641\u062A \u062A\u0645\u0627\u0645\u0627\u064B. \u0645\u0627 \u0645\u0642\u062F\u0627\u0631 \u0627\u0644\u0634\u063A\u0644 \u0627\u0644\u0643\u0644\u064A \u0627\u0644\u0645\u0628\u0630\u0648\u0644 \u0628\u0648\u0627\u0633\u0637\u0629 \u0642\u0648\u0629 \u0627\u0644\u0627\u062D\u062A\u0643\u0627\u0643 \u0644\u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u0633\u064A\u0627\u0631\u0629\u061F\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} W = \u0394KE</span></div>A 1200 kg car moving at 20 m/s comes to a complete stop. What is the work done by the braking friction force?\`
                    },
                    options: [
                        { ar: "-240 kJ", en: "-240 kJ" },
                        { ar: "-120 kJ", en: "-120 kJ" },
                        { ar: "-480 kJ", en: "-480 kJ" },
                        { ar: "240 kJ", en: "240 kJ" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0646\u0638\u0631\u064A\u0629 \u0627\u0644\u0634\u063A\u0644 \u0648\u0627\u0644\u0637\u0627\u0642\u0629: $W = \\Delta KE = 0 - \\frac{1}{2} m v^2 = -0.5 \\times 1200 \\times (20)^2 = -600 \\times 400 = -240,000\\text{ J} = -240\\text{ kJ}$.",
                        en: "Work-energy theorem: W = \u0394KE = -0.5 \xD7 1200 \xD7 (20)\xB2 = -240,000 J = -240 kJ."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} v = \u03BB \xB7 f \u27F9 \u03BB = 2d</span></div>\u0645\u0648\u062C\u0629 \u0645\u0633\u062A\u0639\u0631\u0636\u0629 \u062A\u0631\u062F\u062F\u0647\u0627 $f = 50\\text{ Hz}$ \u0648\u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0623\u0641\u0642\u064A\u0629 \u0628\u064A\u0646 \u0642\u0645\u0629 \u0648\u0642\u0627\u0639 \u0645\u062A\u062A\u0627\u0644\u064A\u064A\u0646 \u062A\u0633\u0627\u0648\u064A $0.4\\text{ m}$. \u0645\u0627 \u0647\u064A \u0633\u0631\u0639\u0629 \u0627\u0646\u062A\u0634\u0627\u0631 \u0647\u0630\u0647 \u0627\u0644\u0645\u0648\u062C\u0629\u061F\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} v = \u03BB \xB7 f</span></div>A transverse wave has frequency f = 50 Hz and crest-to-trough horizontal distance is 0.4 m. What is its propagation speed?\`
                    },
                    options: [
                        { ar: "40 m/s", en: "40 m/s" },
                        { ar: "20 m/s", en: "20 m/s" },
                        { ar: "80 m/s", en: "80 m/s" },
                        { ar: "10 m/s", en: "10 m/s" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0628\u064A\u0646 \u0642\u0645\u0629 \u0648\u0642\u0627\u0639 \u0645\u062A\u062A\u0627\u0644\u064A\u064A\u0646 \u062A\u0645\u062B\u0644 \u0646\u0635\u0641 \u0637\u0648\u0644 \u0645\u0648\u062C\u064A ($\\lambda / 2 = 0.4\\text{ m} \\implies \\lambda = 0.8\\text{ m}$). \u0633\u0631\u0639\u0629 \u0627\u0646\u062A\u0634\u0627\u0631 \u0627\u0644\u0645\u0648\u062C\u0629: $v = \\lambda \\cdot f = 0.8 \\times 50 = 40\\text{ m/s}$.",
                        en: "Distance between crest and trough is \u03BB/2 = 0.4 m => \u03BB = 0.8 m. Speed v = \u03BB \xB7 f = 0.8 \xD7 50 = 40 m/s."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} KE_max = E - W\u2080</span></div>\u0633\u0642\u0637 \u0641\u0648\u062A\u0648\u0646 \u0637\u0627\u0642\u062A\u0647 $E = 4.5\\text{ eV}$ \u0639\u0644\u0649 \u0633\u0637\u062D \u0641\u0644\u0632 \u062F\u0627\u0644\u0629 \u0627\u0644\u0634\u063A\u0644 \u0644\u0647 $W_0 = 2.5\\text{ eV}$. \u0645\u0627 \u0647\u064A \u0623\u0642\u0635\u0649 \u0637\u0627\u0642\u0629 \u062D\u0631\u0643\u0629 ($KE_{max}$) \u0644\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646 \u0627\u0644\u0643\u0647\u0631\u0648\u0636\u0648\u0626\u064A \u0627\u0644\u0645\u0646\u0628\u0639\u062B\u061F\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} Photoelectric Effect</span></div>A photon with energy E = 4.5 eV strikes a metal surface with work function W\u2080 = 2.5 eV. What is the maximum kinetic energy KE_max?\`
                    },
                    options: [
                        { ar: "2.0 eV", en: "2.0 eV" },
                        { ar: "7.0 eV", en: "7.0 eV" },
                        { ar: "1.8 eV", en: "1.8 eV" },
                        { ar: "0 eV (\u0644\u0627 \u064A\u0646\u0628\u0639\u062B)", en: "0 eV (No emission)" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0645\u0639\u0627\u062F\u0644\u0629 \u0623\u064A\u0646\u0634\u062A\u0627\u064A\u0646 \u0644\u0644\u0638\u0627\u0647\u0631\u0629 \u0627\u0644\u0643\u0647\u0631\u0648\u0636\u0648\u0626\u064A\u0629: $KE_{max} = E - W_0 = 4.5\\text{ eV} - 2.5\\text{ eV} = 2.0\\text{ eV}$. \u0628\u0645\u0627 \u0623\u0646 \u0637\u0627\u0642\u0629 \u0627\u0644\u0641\u0648\u062A\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u062F\u0627\u0644\u0629 \u0627\u0644\u0634\u063A\u0644 \u062A\u0646\u0628\u0639\u062B \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u0627\u062A \u0641\u0648\u0631\u0627\u064B.",
                        en: "Einstein's photoelectric equation: KE_max = E - W\u2080 = 4.5 - 2.5 = 2.0 eV."
                    }
                },
                {
                    q: {
                        ar: \`<div class="q-meta-badges"><span class="q-category-pill">\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646</span><span class="q-law-pill">\u{1F4D0} C_eq = (C1\xB7C2)/(C1+C2) , Q = C_eq \xB7 V</span></div>\u0645\u0643\u062B\u0641\u0627\u0646 \u0633\u0639\u0629 \u0627\u0644\u0623\u0648\u0644 $C_1 = 6\\ \\mu\\text{F}$ \u0648\u0633\u0639\u0629 \u0627\u0644\u062B\u0627\u0646\u064A $C_2 = 3\\ \\mu\\text{F}$ \u0645\u062A\u0635\u0644\u0627\u0646 \u0639\u0644\u0649 \u0627\u0644\u062A\u0648\u0627\u0644\u064A \u0645\u0639 \u0645\u0635\u062F\u0631 \u062C\u0647\u062F $V = 18\\text{ V}$. \u0645\u0627 \u0645\u0642\u062F\u0627\u0631 \u0627\u0644\u0634\u062D\u0646\u0629 \u0627\u0644\u0643\u0644\u064A\u0629 ($Q$) \u0627\u0644\u0645\u062A\u0631\u0627\u0643\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629\u061F\`,
                        en: \`<div class="q-meta-badges"><span class="q-category-pill">Applied Problem</span><span class="q-law-pill">\u{1F4D0} Capacitors in Series</span></div>Two capacitors C\u2081 = 6 \u03BCF and C\u2082 = 3 \u03BCF are connected in series with an 18 V source. Find total accumulated charge Q:\`
                    },
                    options: [
                        { ar: "36 \u03BCC", en: "36 \u03BCC" },
                        { ar: "162 \u03BCC", en: "162 \u03BCC" },
                        { ar: "54 \u03BCC", en: "54 \u03BCC" },
                        { ar: "18 \u03BCC", en: "18 \u03BCC" }
                    ],
                    correct: 0,
                    answer: {
                        ar: "\u0627\u0644\u0633\u0639\u0629 \u0627\u0644\u0645\u0643\u0627\u0641\u0626\u0629 \u0644\u0644\u062A\u0648\u0627\u0644\u064A: $C_{eq} = (6 \\times 3) / (6 + 3) = 18 / 9 = 2\\ \\mu\\text{F}$. \u0627\u0644\u0634\u062D\u0646\u0629 \u0627\u0644\u0643\u0644\u064A\u0629: $Q = C_{eq} \\cdot V = 2\\ \\mu\\text{F} \\times 18\\text{ V} = 36\\ \\mu\\text{C}$.",
                        en: "C_eq = (6 \xD7 3) / (6 + 3) = 2 \u03BCF. Total charge Q = C_eq \xB7 V = 2 \u03BCF \xD7 18 V = 36 \u03BCC."
                    }
                }
            ]
        }
    ]
};
// =====================================================================

function shuffleArray(array) {
    const arr = [...array];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

let examData;
let correctAnswersMap = {};
let currentLang = 'ar';
let timeRemaining = TOTAL_TIME;
let timerInterval;

function prepareShuffledExam() {
    rng = mulberry32(currentSeed);
    examData = JSON.parse(JSON.stringify(originalExamData));
    correctAnswersMap = {};
    let globalIdx = 0;
    examData.sections.forEach((section) => {
        section.questions = shuffleArray(section.questions);
        section.questions.forEach((q) => {
            const optionsWithCorrect = q.options.map((opt, idx) => ({ option: opt, isCorrect: idx === q.correct }));
            const shuffledOptions = shuffleArray(optionsWithCorrect);
            q.options = shuffledOptions.map(o => o.option);
            q.correct = shuffledOptions.findIndex(o => o.isCorrect);
            correctAnswersMap[globalIdx] = String.fromCharCode(97 + q.correct);
            globalIdx++;
        });
    });
}

function reshuffleExam() {
    const msg = currentLang === 'ar' ? '\u{1F504} \u0633\u064A\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0623\u0633\u0626\u0644\u0629 \u062C\u062F\u064A\u062F\u0629 \u0648\u0645\u0633\u062D \u0625\u062C\u0627\u0628\u0627\u062A\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u0629. \u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F\u061F' : '\u{1F504} New questions will be generated and current answers cleared. Are you sure?';
    if (confirm(msg)) {
        currentSeed = Date.now(); timeRemaining = TOTAL_TIME; answersVisible = false;
        prepareShuffledExam(); renderExam(); saveState();
        alert(currentLang === 'ar' ? '\u{1F3B2} \u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0623\u0633\u0626\u0644\u0629! \u062D\u0638\u0627\u064B \u0645\u0648\u0641\u0642\u0627\u064B! \u{1F340}' : '\u{1F3B2} Questions changed! Good luck! \u{1F340}');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function setLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const btnAr = document.getElementById('btn-ar');
    const btnEn = document.getElementById('btn-en');
    if (btnAr) btnAr.classList.toggle('active', lang === 'ar');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');
    document.body.classList.toggle('en-mode', lang === 'en');
    document.querySelectorAll('[data-ar][data-en]').forEach(el => {
        el.innerHTML = lang === 'ar' ? el.getAttribute('data-ar') : el.getAttribute('data-en');
    });
    renderExam(); saveState(false);
}

function renderExam() {
    const container = document.getElementById('exam-content');
    if (!container) return;
    const labels = { ar: { option: ['\u0623', '\u0628', '\u062C', '\u062F'], answer: '\u2705 \u0627\u0644\u0625\u062C\u0627\u0628\u0629:' }, en: { option: ['A', 'B', 'C', 'D'], answer: '\u2705 Answer:' } };
    const lbl = labels[currentLang]; const isRTL = currentLang === 'ar';
    let html = ''; let globalIdx = 0;
    examData.sections.forEach((section) => {
        html += \`<section class="bg-white p-6 rounded-2xl shadow-lg border-2 border-teal-100">
            <h2 class="text-xl font-bold mb-4 text-teal-700">\${section.title[currentLang]}</h2>
            <ol class="space-y-4 text-sm">\`;
        section.questions.forEach((q) => {
            const bs = isRTL ? 'border-r-4 pr-4' : 'border-l-4 pl-4';
            html += \`<li class="\${bs} border-teal-400 py-2" id="q-\${globalIdx}">
                <strong>\${globalIdx + 1}.</strong> \${q.q[currentLang]}<br>\`;
            q.options.forEach((opt, oIdx) => {
                const rs = isRTL ? 'mr-4 ml-2' : 'ml-4 mr-2';
                html += \`<label class="cursor-pointer block mt-1 \${isRTL ? 'mr-4' : 'ml-4'} hover:bg-teal-50 rounded-lg p-1 transition">
                    <input type="radio" name="q\${globalIdx}" value="\${String.fromCharCode(97 + oIdx)}" class="\${rs}">
                    \${lbl.option[oIdx]}) \${opt[currentLang]}</label>\`;
            });
            html += \`<div class="answer-box text-green-700 mt-2 font-medium \${answersVisible ? '' : 'hidden'} bg-green-50 rounded-lg p-2">
                \${lbl.answer} \${lbl.option[q.correct]}) \${q.options[q.correct][currentLang]} \u2014 \${q.answer[currentLang]}</div></li>\`;
            globalIdx++;
        });
        html += \`</ol></section>\`;
    });
    container.innerHTML = html;
    triggerMathRendering();
}

function triggerMathRendering() {
    if (typeof renderMathInElement === 'function') {
        try {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false},
                    {left: "\\[", right: "\\]", display: true},
                    {left: "\\(", right: "\\)", display: false}
                ],
                throwOnError: false
            });
        } catch(e) {}
    }
}

function startTimer() {
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeRemaining--; updateTimerDisplay();
        if (timeRemaining % 60 === 0) saveState(false);
        const timerEl = document.getElementById('timer');
        if (timerEl && timeRemaining <= 600) timerEl.classList.add('timer-warning');
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert(currentLang === 'ar' ? "\u23F0 \u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0648\u0642\u062A!" : "\u23F0 Time's up!");
            gradeExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeRemaining / 60); const s = timeRemaining % 60;
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = \`\${m.toString().padStart(2,'0')}:\${s.toString().padStart(2,'0')}\`;
}

function toggleAnswers() {
    answersVisible = !answersVisible;
    document.querySelectorAll('.answer-box').forEach(el => el.classList.toggle('hidden', !answersVisible));
    saveState(false);
}

function gradeExam() {
    let correctCount = 0;
    const sectionScores = new Array(TOTAL_SECTIONS).fill(0);
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
        const sel = document.querySelector(\`input[name="q\${i}"]:checked\`);
        const li = document.getElementById(\`q-\${i}\`);
        if (li) {
            const isCorrect = sel && sel.value === correctAnswersMap[i];
            if (isCorrect) { 
                correctCount++; 
                li.classList.add('correct'); 
                li.classList.remove('incorrect'); 
                const secIdx = Math.min(TOTAL_SECTIONS - 1, Math.floor(i / Math.max(1, QUESTIONS_PER_SECTION)));
                if (sectionScores[secIdx] !== undefined) sectionScores[secIdx]++; 
            }
            else { li.classList.add('incorrect'); li.classList.remove('correct'); }
        }
    }
    const score = TOTAL_QUESTIONS > 0 ? Math.round((correctCount / TOTAL_QUESTIONS) * 100) : 0;
    const resTotal = document.getElementById('res-total');
    if (resTotal) resTotal.textContent = \`\${score} / 100\`;
    const resName = document.getElementById('res-name');
    if (resName) resName.textContent = document.getElementById('studentName')?.value || (currentLang === 'ar' ? '\u0628\u0637\u0644' : 'Champion');
    const resDate = document.getElementById('res-date');
    if (resDate) resDate.textContent = new Date().toLocaleDateString(currentLang === 'ar' ? 'ar-AE' : 'en-US');
    const pc = document.getElementById('sections-performance');
    if (pc) {
        pc.innerHTML = '';
        examData.sections.forEach((s, idx) => {
            const secQCount = originalExamData.sections[idx]?.questions.length || QUESTIONS_PER_SECTION;
            pc.innerHTML += \`<div class="flex justify-between items-center"><span class="text-gray-700">\${s.title[currentLang]}</span><span class="font-bold text-teal-700">\${sectionScores[idx] || 0}/\${secQCount}</span></div>\`;
        });
    }
    const badge = document.getElementById('success-badge');
    const successPercent = document.getElementById('success-percent');
    if (successPercent) successPercent.textContent = \`\${score}%\`;
    if (badge) {
        if (currentLang === 'ar') {
            if (score >= 90) { badge.textContent = '\u{1F31F} \u0645\u0645\u062A\u0627\u0632 \u062C\u062F\u0627\u064B!'; badge.className = 'success-badge grade-excellent'; }
            else if (score >= 75) { badge.textContent = '\u{1F44F} \u0645\u0645\u062A\u0627\u0632!'; badge.className = 'success-badge grade-good'; }
            else if (score >= 50) { badge.textContent = '\u{1F44D} \u062C\u064A\u062F'; badge.className = 'success-badge grade-pass'; }
            else { badge.textContent = '\u{1F4AA} \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649'; badge.className = 'success-badge grade-fail'; }
        } else {
            if (score >= 90) { badge.textContent = '\u{1F31F} Outstanding!'; badge.className = 'success-badge grade-excellent'; }
            else if (score >= 75) { badge.textContent = '\u{1F44F} Excellent!'; badge.className = 'success-badge grade-good'; }
            else if (score >= 50) { badge.textContent = '\u{1F44D} Good'; badge.className = 'success-badge grade-pass'; }
            else { badge.textContent = '\u{1F4AA} Try Again'; badge.className = 'success-badge grade-fail'; }
        }
    }
    const resultsPanel = document.getElementById('results-panel');
    if (resultsPanel) {
        resultsPanel.classList.remove('hidden');
        resultsPanel.scrollIntoView({ behavior: 'smooth' });
    }
    if (timerInterval) clearInterval(timerInterval);
}

function sendResultsToEmail() {
    const btn = document.getElementById('sendEmailBtn');
    const status = document.getElementById('emailStatus');
    if (!btn || !status) return;
    btn.disabled = true;
    btn.textContent = currentLang === 'ar' ? '\u23F3 \u062C\u0627\u0631\u064A \u0627\u0644\u0625\u0631\u0633\u0627\u0644...' : '\u23F3 Sending...';
    const name = document.getElementById('studentName')?.value || 'N/A';
    const studentClass = document.getElementById('studentClass')?.value || 'N/A';
    const date = document.getElementById('examDate')?.value || new Date().toLocaleDateString();
    const score = document.getElementById('res-total')?.textContent || '0 / 100';
    const successRate = document.getElementById('success-percent')?.textContent || '0%';
    const badge = document.getElementById('success-badge')?.textContent || '-';
    let questionsHTML = ''; let globalIdx = 0;
    examData.sections.forEach((section, sectionIdx) => {
        questionsHTML += \`<tr style="background:linear-gradient(135deg,#0d9488,#0f766e);color:white;"><td colspan="5" style="padding:12px;font-weight:bold;">\u{1F4CC} \${currentLang==='ar'?'\u0627\u0644\u0642\u0633\u0645':'Section'} \${sectionIdx+1}: \${section.title[currentLang]}</td></tr>\`;
        section.questions.forEach((q) => {
            const sel = document.querySelector(\`input[name="q\${globalIdx}"]:checked\`);
            const sv = sel ? sel.value : null; const cv = correctAnswersMap[globalIdx]; const ic = sv === cv;
            let sat = currentLang==='ar'?'\u274C \u0644\u0645 \u064A\u062C\u0628':'\u274C No answer'; let sac = '#dc2626';
            if (sv) { const si = sv.charCodeAt(0)-97; sat = q.options[si] ? q.options[si][currentLang] : 'N/A'; sac = ic?'#059669':'#dc2626'; }
            const cat = q.options[q.correct] ? q.options[q.correct][currentLang] : 'N/A';
            const rb = ic?'#f0fdf4':'#fef2f2'; const bl = ic?'4px solid #10b981':'4px solid #ef4444';
            questionsHTML += \`<tr style="background:\${rb};border-right:\${bl};"><td style="padding:10px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;">\${globalIdx+1}</td><td style="padding:10px;border:1px solid #e5e7eb;"><strong style="color:#0f766e;">\${currentLang==='ar'?'\u2753 \u0627\u0644\u0633\u0624\u0627\u0644:':'\u2753 Question:'}</strong><br><span style="font-size:13px;">\${q.q[currentLang]}</span></td><td style="padding:10px;border:1px solid #e5e7eb;"><strong style="color:\${sac};">\${currentLang==='ar'?'\u270D\uFE0F \u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0637\u0627\u0644\u0628:':'\u270D\uFE0F Student:'}</strong><br><span style="color:\${sac};font-size:13px;">\${sat}</span></td><td style="padding:10px;border:1px solid #e5e7eb;"><strong style="color:#059669;">\${currentLang==='ar'?'\u2705 \u0627\u0644\u0635\u062D\u064A\u062D\u0629:':'\u2705 Correct:'}</strong><br><span style="color:#059669;font-size:13px;">\${cat}</span></td><td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">\${ic?'<span style="font-size:24px;">\u2705</span>':'<span style="font-size:24px;">\u274C</span>'}</td></tr>\`;
            globalIdx++;
        });
    });
    const answersHTML = \`<div style="font-family:'Segoe UI',Tahoma,Arial;direction:\${currentLang==='ar'?'rtl':'ltr'};"><div style="background:linear-gradient(135deg,#0d9488,#0f766e);color:white;padding:20px;border-radius:10px 10px 0 0;text-align:center;"><h2 style="margin:0;">\${currentLang==='ar'?'\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646':'Exam Result'}</h2><p style="margin:5px 0 0;opacity:0.9;">\${currentLang==='ar'?'\u062A\u0642\u0631\u064A\u0631 \u062A\u0641\u0635\u064A\u0644\u064A':'Detailed Report'}</p></div><div style="background:#f0fdfa;padding:15px;"><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px;font-weight:bold;color:#0f766e;">\${currentLang==='ar'?'\u{1F60A} \u0627\u0644\u0627\u0633\u0645:':'\u{1F60A} Name:'}</td><td style="padding:8px;">\${name}</td><td style="padding:8px;font-weight:bold;color:#0f766e;">\${currentLang==='ar'?'\u{1F3EB} \u0627\u0644\u0634\u0639\u0628\u0629:':'\u{1F3EB} Class:'}</td><td style="padding:8px;">\${studentClass}</td></tr><tr><td style="padding:8px;font-weight:bold;color:#0f766e;">\${currentLang==='ar'?'\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E:':'\u{1F4C5} Date:'}</td><td style="padding:8px;">\${date}</td><td style="padding:8px;font-weight:bold;color:#0f766e;">\${currentLang==='ar'?'\u{1F3C6} \u0627\u0644\u062A\u0642\u062F\u064A\u0631:':'\u{1F3C6} Grade:'}</td><td style="padding:8px;">\${badge}</td></tr></table></div><div style="background:white;padding:20px;text-align:center;"><div style="display:inline-block;margin:0 15px;"><div style="font-size:32px;font-weight:bold;color:#0d9488;">\${score}</div><div style="color:#6b7280;font-size:13px;">\${currentLang==='ar'?'\u0627\u0644\u062F\u0631\u062C\u0629':'Score'}</div></div><div style="display:inline-block;margin:0 15px;"><div style="font-size:32px;font-weight:bold;color:#059669;">\${successRate}%</div><div style="color:#6b7280;font-size:13px;">\${currentLang==='ar'?'\u0627\u0644\u0646\u0633\u0628\u0629':'Rate'}</div></div></div><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#0d9488;color:white;"><th style="padding:10px;border:1px solid #0f766e;">#</th><th style="padding:10px;border:1px solid #0f766e;">\${currentLang==='ar'?'\u0627\u0644\u0633\u0624\u0627\u0644':'Question'}</th><th style="padding:10px;border:1px solid #0f766e;">\${currentLang==='ar'?'\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0637\u0627\u0644\u0628':'Student'}</th><th style="padding:10px;border:1px solid #0f766e;">\${currentLang==='ar'?'\u0627\u0644\u0635\u062D\u064A\u062D\u0629':'Correct'}</th><th style="padding:10px;border:1px solid #0f766e;">\${currentLang==='ar'?'\u0627\u0644\u0646\u062A\u064A\u062C\u0629':'Result'}</th></tr></thead><tbody>\${questionsHTML}</tbody></table><div style="background:linear-gradient(135deg,#f0fdfa,#ccfbf1);padding:15px;border-radius:0 0 10px 10px;"><p style="margin:0;color:#0f766e;text-align:center;">\u{1F4D0} <strong>\${currentLang==='ar'?'\u0623\u062D\u0633\u0646\u062A \u064A\u0627 \u0628\u0637\u0644!':'Great job!'}</strong> \u{1F4D0}</p><p style="margin:5px 0 0;color:#0f766e;text-align:center;font-size:12px;">\${currentLang==='ar'?'\u062A\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B | Mr. Mohammed Hesham':'Auto-sent | Mr. Mohammed Hesham'}</p></div></div>\`;
    emailjs.send(SERVICE_ID, TEMPLATE_ID, { to_email: TARGET_EMAIL, student_name: name, student_class: studentClass, exam_date: date, total_score: score, success_rate: successRate, grade: badge, answers_table: answersHTML }).then(() => {
        status.textContent = currentLang==='ar'?'\u2705 \u062A\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0628\u0646\u062C\u0627\u062D!':'\u2705 Sent successfully!'; status.style.color = '#059669'; btn.textContent = currentLang==='ar'?'\u2713 \u062A\u0645':'\u2713 Sent';
    }).catch(err => {
        status.textContent = currentLang==='ar'?'\u274C \u062D\u062F\u062B \u062E\u0637\u0623':'\u274C Error'; status.style.color = '#dc2626'; btn.disabled = false; btn.textContent = currentLang==='ar'?'\u{1F4E7} \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649':'\u{1F4E7} Try Again'; console.error(err);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const saved = loadState();
    if (saved && saved.seed) {
        currentSeed = saved.seed; currentLang = saved.lang || 'ar';
        timeRemaining = saved.timeRemaining !== undefined ? saved.timeRemaining : TOTAL_TIME;
        answersVisible = saved.answersVisible || false;
        document.documentElement.lang = currentLang;
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
        const btnAr = document.getElementById('btn-ar');
        const btnEn = document.getElementById('btn-en');
        if (btnAr) btnAr.classList.toggle('active', currentLang === 'ar');
        if (btnEn) btnEn.classList.toggle('active', currentLang === 'en');
        document.body.classList.toggle('en-mode', currentLang === 'en');
        document.querySelectorAll('[data-ar][data-en]').forEach(el => { el.innerHTML = currentLang === 'ar' ? el.getAttribute('data-ar') : el.getAttribute('data-en'); });
    } else { currentSeed = Date.now(); }
    prepareShuffledExam(); renderExam();
    if (saved) {
        if (saved.studentName) { const el = document.getElementById('studentName'); if (el) el.value = saved.studentName; }
        if (saved.studentClass) { const el = document.getElementById('studentClass'); if (el) el.value = saved.studentClass; }
        if (saved.examDate) { const el = document.getElementById('examDate'); if (el) el.value = saved.examDate; }
        if (saved.answers) restoreAnswers(saved.answers);
    }
    setupAnswerListeners(); setupInputListeners(); startTimer();
    setTimeout(triggerMathRendering, 250);
});
window.addEventListener('beforeunload', () => saveState(false));
</script>
</body>
</html>`;

// src/hesham-exam/data/templates.ts
var CODE_TEMPLATES = [
  {
    id: "official-hesham-interactive-exam",
    title: "\u0642\u0627\u0644\u0628 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0644\u0631\u0633\u0645\u064A - \u0645\u0633\u062A\u0631 \u0645\u062D\u0645\u062F \u0647\u0634\u0627\u0645 (Bilingual + EmailJS + Shuffle + Math)",
    titleEn: "Official Mohammed Hesham Interactive Exam Template (Bilingual + EmailJS + Shuffle + Math)",
    category: "Web & Browser",
    language: "html",
    extension: "html",
    description: "\u0627\u0644\u0642\u0627\u0644\u0628 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0644\u0631\u0633\u0645\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0645\u0633\u062A\u0631 \u0645\u062D\u0645\u062F \u0647\u0634\u0627\u0645: \u064A\u062F\u0639\u0645 \u062B\u0646\u0627\u0626\u064A\u0629 \u0627\u0644\u0644\u063A\u0629 (\u0639\u0631\u0628\u064A | EN)\u060C \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0644\u0644\u0645\u0639\u0644\u0645 \u0639\u0628\u0631 EmailJS\u060C \u0645\u0624\u0642\u062A \u062A\u0646\u0627\u0632\u0644\u064A\u060C \u0623\u0633\u0626\u0644\u0629 \u0639\u0634\u0648\u0627\u0626\u064A\u0629\u060C \u062D\u0641\u0638 \u0627\u0644\u062A\u0642\u062F\u0645 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B\u060C \u0635\u064A\u063A \u0648\u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0631\u064A\u0627\u0636\u064A\u0629\u060C \u0648\u062A\u0642\u0627\u0631\u064A\u0631 \u062F\u0631\u062C\u0627\u062A \u062A\u0641\u0635\u064A\u0644\u064A\u0629 \u0644\u0643\u0644 \u0642\u0633\u0645.",
    code: OFFICIAL_HESHAM_EXAM_TEMPLATE
  },
  {
    id: "qutoof-physics-teal",
    title: "\u0642\u0627\u0644\u0628 \u0642\u0637\u0648\u0641 \u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0629 - \u0645\u0633\u062A\u0631 \u0645\u062D\u0645\u062F \u0647\u0634\u0627\u0645 (Teal STEM Quiz + \u062B\u0646\u0627\u0626\u064A\u0629 \u0627\u0644\u0644\u063A\u0629 \u0648\u0625\u0631\u0633\u0627\u0644 \u0644\u0644\u0645\u0639\u0644\u0645)",
    titleEn: "Qutoof Physics Interactive Exam (Bilingual + Send to Teacher)",
    category: "Web & Browser",
    language: "html",
    extension: "html",
    description: "\u0627\u0644\u0642\u0627\u0644\u0628 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0644\u0643\u0627\u0645\u0644 \u0627\u0644\u0645\u0637\u0627\u0628\u0642 \u0644\u0642\u0637\u0648\u0641 \u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0629: \u064A\u062F\u0639\u0645 \u062B\u0646\u0627\u0626\u064A\u0629 \u0627\u0644\u0644\u063A\u0629 (\u0639\u0631\u0628\u064A | EN)\u060C \u0645\u0624\u0642\u062A \u064A\u062F\u0648\u064A\u060C \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0644\u0644\u0645\u0639\u0644\u0645 (\u0648\u0627\u062A\u0633\u0627\u0628 / \u0628\u0631\u064A\u062F / \u062E\u0627\u062F\u0645)\u060C \u0625\u0638\u0647\u0627\u0631/\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A\u060C \u0637\u0628\u0627\u0639\u0629\u060C \u0648\u0623\u0633\u0626\u0644\u0629 \u0639\u0634\u0648\u0627\u0626\u064A\u0629.",
    code: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621: \u0627\u0644\u0628\u0627\u062F\u0626\u0627\u062A \u0648\u0627\u0644\u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 - \u0642\u0637\u0648\u0641 \u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0629</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Cairo', sans-serif;
      background-color: #e3faf7;
      color: #134e4a;
    }
    .teal-border-card {
      border: 3px solid #06b6d4;
      border-radius: 1.5rem;
      box-shadow: 0 10px 25px -5px rgba(6, 182, 212, 0.2);
    }
    .custom-input {
      border-bottom: 2px solid #06b6d4;
      background: transparent;
      outline: none;
      padding: 2px 8px;
    }
    .custom-input:focus {
      border-bottom-color: #0891b2;
    }
  </style>
</head>
<body class="min-h-screen py-6 px-4">
  <div class="max-w-4xl mx-auto">

    <!-- Top Navigation Bar matching the image -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      
      <!-- Bilingual Language Switcher (\u0639\u0631\u0628\u064A | EN) -->
      <div>
        <button id="lang-btn" onclick="toggleLanguage()" class="px-4 py-1.5 rounded-full bg-teal-800 text-white text-xs font-bold shadow-md hover:bg-teal-900 transition flex items-center gap-1.5 cursor-pointer">
          <span>\u{1F310}</span>
          <span id="lang-btn-label">English</span>
        </button>
      </div>

      <!-- Timer Pill (Manual Configurable Countdown) -->
      <div class="bg-white/90 backdrop-blur border border-teal-200 px-4 py-1.5 rounded-2xl shadow-sm flex items-center gap-3 text-xs font-bold text-teal-900">
        <span class="flex items-center gap-1 text-slate-700">
          <span id="lbl-timer">\u23F0 \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A:</span>
          <span id="timer" class="font-mono text-teal-600 text-sm">30:00</span>
        </span>
        <span class="px-2.5 py-0.5 rounded-full bg-teal-500 text-white text-[11px] flex items-center gap-1 font-semibold" id="badge-random">
          \u{1F3B2} \u0623\u0633\u0626\u0644\u0629 \u0639\u0634\u0648\u0627\u0626\u064A\u0629
        </span>
      </div>

      <!-- Action Buttons Bar -->
      <div class="flex flex-wrap items-center gap-2">
        <button onclick="toggleAnswers()" class="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer">
          <span>\u{1F440}</span>
          <span id="toggle-answers-text">\u0625\u0638\u0647\u0627\u0631/\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A</span>
        </button>
        <button onclick="window.print()" class="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer">
          <span>\u{1F5A8}\uFE0F</span>
          <span id="btn-print-text">\u0637\u0628\u0627\u0639\u0629</span>
        </button>
        <button onclick="reshuffleQuestions()" class="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer">
          <span>\u{1F504}</span>
          <span id="btn-new-q-text">\u0623\u0633\u0626\u0644\u0629 \u062C\u062F\u064A\u062F\u0629</span>
        </button>
        <button onclick="resetExam()" class="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer">
          <span>\u{1F5D1}\uFE0F</span>
          <span id="btn-reset-text">\u0645\u0633\u062D \u0627\u0644\u062A\u0642\u062F\u0645</span>
        </button>
      </div>

    </div>

    <!-- Main Header Card -->
    <div class="bg-white teal-border-card p-6 md:p-8 mb-8 text-center">
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="text-amber-500 text-2xl font-black">\u26A1</span>
        <h1 id="exam-title-display" class="text-2xl md:text-3xl font-black text-slate-800">
          \u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621: \u0627\u0644\u0628\u0627\u062F\u0626\u0627\u062A \u0648\u0627\u0644\u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629
        </h1>
      </div>
      
      <p id="exam-subtitle-display" class="text-cyan-600 font-bold text-sm md:text-base mb-1">
        \u0642\u0637\u0648\u0641 \u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0629 - \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0648\u062D\u062F\u0627\u062A \u0648\u0627\u0644\u0628\u0627\u062F\u0626\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645\u064A\u0629
      </p>
      
      <p id="exam-description-display" class="text-xs text-slate-500 mb-3">
        \u0627\u062E\u062A\u0628\u0627\u0631 \u0644\u0642\u064A\u0627\u0633 \u0641\u0647\u0645 \u0627\u0644\u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0648\u0627\u0644\u0628\u0627\u062F\u0626\u0627\u062A \u0627\u0644\u0639\u0634\u0631\u064A\u0629 \u0648\u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0628\u064A\u0646\u0647\u0627 \u0648\u062A\u0637\u0628\u064A\u0642\u0627\u062A\u0647\u0627
      </p>

      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold mb-6 border border-teal-100">
        <span>\u{1F4BE}</span>
        <span id="save-progress-hint">\u064A\u062A\u0645 \u062D\u0641\u0638 \u062A\u0642\u062F\u0645\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B - <span id="q-count-badge">5 \u0623\u0633\u0626\u0644\u0629</span></span>
      </div>

      <!-- Student Fields Grid (\u0627\u0644\u0627\u0633\u0645\u060C \u0627\u0644\u0634\u0639\u0628\u0629\u060C \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u060C \u0627\u0644\u0645\u062F\u0629\u060C \u0627\u0644\u0645\u062C\u0645\u0648\u0639) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-semibold text-slate-700 pt-4 border-t border-teal-100">
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-date">\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E:</span>
          <span id="exam-date" class="text-teal-700 font-mono">2026/09/16</span>
        </div>
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-name">\u{1F60A} \u0627\u0644\u0627\u0633\u0645:</span>
          <input type="text" id="student-name" placeholder="\u0627\u0643\u062A\u0628 \u0627\u0633\u0645\u0643" class="custom-input text-teal-900 w-28 text-center text-xs font-bold">
        </div>
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-group">\u{1F3EB} \u0627\u0644\u0634\u0639\u0628\u0629:</span>
          <input type="text" id="student-group" placeholder="\u0627\u0644\u0634\u0639\u0628\u0629" class="custom-input text-teal-900 w-20 text-center text-xs font-bold">
        </div>
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-duration">\u23F0 \u0627\u0644\u0645\u062F\u0629:</span>
          <span id="duration-val" class="text-teal-700">30 \u062F\u0642\u064A\u0642\u0629</span>
        </div>
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-total-marks">\u{1F4CA} \u0627\u0644\u0645\u062C\u0645\u0648\u0639:</span>
          <span class="text-teal-700 font-bold" id="total-marks-val">100 \u062F\u0631\u062C\u0629</span>
        </div>
      </div>

    </div>

    <!-- Questions Container (Pre-rendered for instant visibility) -->
    <div id="questions-list" class="space-y-6 mb-8">
      <!-- Question Card 1 -->
      <div class="bg-white teal-border-card p-5 md:p-6 transition shadow-sm" id="question-card-0">
        <div class="flex items-start justify-between gap-3 mb-3">
          <h3 class="font-bold text-slate-800 text-sm md:text-base leading-relaxed">
            <span class="text-teal-600 font-extrabold ml-1">(1)</span>
            <span id="q-text-0">\u0641\u064A \u062F\u0627\u0626\u0631\u0629 \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0645\u0648\u0635\u0644 \u0628\u0647\u0627 \u0645\u0642\u0627\u0648\u0645\u062A\u0627\u0646 \u0645\u062A\u0648\u0627\u0632\u064A\u062A\u0627\u0646 (R\u2081 = 6 \u03A9, R\u2082 = 3 \u03A9) \u0639\u0644\u0649 \u0627\u0644\u062A\u0648\u0627\u0644\u064A \u0645\u0639 R\u2083 = 2 \u03A9 \u0648\u0628\u0637\u0627\u0631\u064A\u0629 V = 16 V\u060C \u0645\u0627 \u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 \u0627\u0644\u0643\u0644\u064A (I) \u0627\u0644\u0645\u0627\u0631 \u0641\u064A \u0627\u0644\u062F\u0627\u0626\u0631\u0629\u061F</span>
          </h3>
          <span class="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[11px] font-bold shrink-0 border border-teal-200">20 \u062F\u0631\u062C\u0629</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3" id="q-options-0">
          <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
            <input type="radio" name="q_0" value="0" onchange="selectAnswer(0, 0)" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
            <span class="font-medium text-slate-800">4 A</span>
          </label>
          <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
            <input type="radio" name="q_0" value="1" onchange="selectAnswer(0, 1)" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
            <span class="font-medium text-slate-800">2.67 A</span>
          </label>
          <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
            <input type="radio" name="q_0" value="2" onchange="selectAnswer(0, 2)" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
            <span class="font-medium text-slate-800">8 A</span>
          </label>
          <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
            <input type="radio" name="q_0" value="3" onchange="selectAnswer(0, 3)" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
            <span class="font-medium text-slate-800">1.6 A</span>
          </label>
        </div>
        <div id="explanation-0" class="hidden p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium">
          \u{1F4A1} <strong>\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629:</strong> 4 A<br>
          <span class="text-slate-600 mt-1 block">\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u062A\u0648\u0627\u0632\u064A R_p = (6 \xD7 3)/(6 + 3) = 2 \u03A9. \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0643\u0644\u064A\u0629 R_eq = 2 + 2 = 4 \u03A9. \u0627\u0644\u062A\u064A\u0627\u0631 I = V / R_eq = 16 / 4 = 4 A.</span>
        </div>
      </div>

      <!-- Question Card 2 -->
      <div class="bg-white teal-border-card p-5 md:p-6 transition shadow-sm" id="question-card-1">
        <div class="flex items-start justify-between gap-3 mb-3">
          <h3 class="font-bold text-slate-800 text-sm md:text-base leading-relaxed">
            <span class="text-teal-600 font-extrabold ml-1">(2)</span>
            <span id="q-text-1">\u062A\u062D\u0631\u0643 \u062C\u0633\u0645 \u0645\u0646 \u0627\u0644\u0633\u0643\u0648\u0646 \u0628\u0639\u062C\u0644\u0629 \u0645\u0646\u062A\u0638\u0645\u0629 a = 4 m/s\xB2 \u0644\u0645\u062F\u0629 5 \u062B\u0648\u0627\u0646\u064D\u060C \u0627\u062D\u0633\u0628 \u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0645\u0642\u0637\u0648\u0639\u0629 (d):</span>
          </h3>
          <span class="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[11px] font-bold shrink-0 border border-teal-200">20 \u062F\u0631\u062C\u0629</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3" id="q-options-1">
          <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
            <input type="radio" name="q_1" value="0" onchange="selectAnswer(1, 0)" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
            <span class="font-medium text-slate-800">50 m</span>
          </label>
          <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
            <input type="radio" name="q_1" value="1" onchange="selectAnswer(1, 1)" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
            <span class="font-medium text-slate-800">20 m</span>
          </label>
          <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
            <input type="radio" name="q_1" value="2" onchange="selectAnswer(1, 2)" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
            <span class="font-medium text-slate-800">100 m</span>
          </label>
          <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
            <input type="radio" name="q_1" value="3" onchange="selectAnswer(1, 3)" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
            <span class="font-medium text-slate-800">40 m</span>
          </label>
        </div>
        <div id="explanation-1" class="hidden p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium">
          \u{1F4A1} <strong>\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629:</strong> 50 m<br>
          <span class="text-slate-600 mt-1 block">\u0645\u0646 \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u062D\u0631\u0643\u0629: d = v\u2080t + 0.5 a t\xB2 = 0 + 0.5(4)(5\xB2) = 2 \xD7 25 = 50 m.</span>
        </div>
      </div>
    </div>

    <!-- Submit / Correct Button & Send to Teacher Section -->
    <div class="text-center mb-8 space-y-4">
      <button 
        id="submit-btn" 
        onclick="submitAndGrade()" 
        class="px-10 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-black text-base shadow-xl shadow-teal-600/30 transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
      >
        <span>\u{1F3AF}</span>
        <span id="submit-btn-text">\u0635\u062D\u062D \u0625\u062C\u0627\u0628\u0627\u062A\u064A!</span>
      </button>
      
      <!-- Results Banner with Send to Teacher actions -->
      <div id="result-banner" class="hidden mt-6 p-6 rounded-2xl bg-white teal-border-card text-center transition-all space-y-4">
        <h3 class="text-xl font-bold text-slate-800 mb-1" id="result-title">\u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629</h3>
        <p class="text-4xl font-black text-teal-600 my-2" id="score-text">0 / 100</p>
        <p class="text-xs text-slate-500" id="feedback-text">\u0623\u062D\u0633\u0646\u062A! \u0631\u0627\u062C\u0639 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0648\u0636\u062D\u0629 \u0641\u064A \u0627\u0644\u0623\u0633\u0626\u0644\u0629.</p>
        
        <!-- SEND TO TEACHER FEATURE (\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0644\u0644\u0645\u0639\u0644\u0645) -->
        <div class="pt-4 border-t border-teal-100 flex flex-wrap items-center justify-center gap-3">
          <span class="text-xs font-bold text-teal-900 w-full mb-1" id="send-teacher-title">\u{1F4E4} \u0625\u0631\u0633\u0627\u0644 \u0648\u0631\u0642\u0629 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0648\u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0639\u0644\u0645:</span>
          
          <button 
            onclick="sendResultToTeacherWhatsApp()" 
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <span>\u{1F4AC}</span>
            <span id="btn-wa-text">\u0625\u0631\u0633\u0627\u0644 \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628 (WhatsApp)</span>
          </button>
          
          <button 
            onclick="sendResultViaEmail()" 
            class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <span>\u2709\uFE0F</span>
            <span id="btn-email-text">\u0625\u0631\u0633\u0627\u0644 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A</span>
          </button>

          <button 
            onclick="copyResultSummary()" 
            class="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <span>\u{1F4CB}</span>
            <span id="btn-copy-summary">\u0646\u0633\u062E \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062F\u0631\u062C\u0629</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer Rights matching image -->
    <div class="text-center text-xs text-slate-500 pb-10">
      <p id="footer-text">\xA9 \u0642\u0637\u0648\u0641 \u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0629 - \u0627\u0644\u0628\u0627\u062F\u0626\u0627\u062A \u0648\u0627\u0644\u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 | Mr. Mohammed Hesham</p>
    </div>

  </div>

  <script>
    // Configuration & Meta
    let currentLang = 'ar'; // 'ar' | 'en'
    let durationMinutes = 30;
    let timerSeconds = durationMinutes * 60;
    let teacherPhoneNumber = "+201000000000"; // \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u0639\u0644\u0645 \u0644\u0648\u0627\u062A\u0633\u0627\u0628
    let teacherEmail = "teacher@school.edu";

    // Questions Bank (\u064A\u062F\u0639\u0645 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062B\u0646\u0627\u0626\u064A: \u0639\u0631\u0628\u064A \u0648\u0625\u0646\u062C\u0644\u064A\u0632\u064A)
    const questions = [
      {
        id: 1,
        questionAr: "\u0641\u064A \u062F\u0627\u0626\u0631\u0629 \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0645\u0648\u0635\u0644 \u0628\u0647\u0627 \u0645\u0642\u0627\u0648\u0645\u062A\u0627\u0646 \u0645\u062A\u0648\u0627\u0632\u064A\u062A\u0627\u0646 (R\u2081 = 6 \u03A9, R\u2082 = 3 \u03A9) \u0639\u0644\u0649 \u0627\u0644\u062A\u0648\u0627\u0644\u064A \u0645\u0639 R\u2083 = 2 \u03A9 \u0648\u0628\u0637\u0627\u0631\u064A\u0629 V = 16 V\u060C \u0645\u0627 \u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 \u0627\u0644\u0643\u0644\u064A (I) \u0627\u0644\u0645\u0627\u0631 \u0641\u064A \u0627\u0644\u062F\u0627\u0626\u0631\u0629\u061F",
        questionEn: "In a circuit with two parallel resistors (R\u2081 = 6 \u03A9, R\u2082 = 3 \u03A9) in series with R\u2083 = 2 \u03A9 and a 16 V source, what is the total current (I)?",
        optionsAr: ["4 A", "2.67 A", "8 A", "1.6 A"],
        optionsEn: ["4 A", "2.67 A", "8 A", "1.6 A"],
        correctAnswer: 0,
        explanationAr: "\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u062A\u0648\u0627\u0632\u064A: R_p = (6 \xD7 3)/(6 + 3) = 2 \u03A9. \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0643\u0644\u064A\u0629: R_eq = 2 + 2 = 4 \u03A9. \u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 \u0627\u0644\u0643\u0644\u064A: I = V / R_eq = 16 / 4 = 4 A.",
        explanationEn: "Parallel equivalent: R_p = 2 \u03A9. Total R_eq = 4 \u03A9. Total current I = V / R_eq = 16 / 4 = 4 A."
      },
      {
        id: 2,
        questionAr: "\u062A\u062D\u0631\u0643 \u062C\u0633\u0645 \u0645\u0646 \u0627\u0644\u0633\u0643\u0648\u0646 \u0628\u0639\u062C\u0644\u0629 \u0645\u0646\u062A\u0638\u0645\u0629 a = 4 m/s\xB2 \u0644\u0645\u062F\u0629 5 \u062B\u0648\u0627\u0646\u064D\u060C \u0627\u062D\u0633\u0628 \u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0645\u0642\u0637\u0648\u0639\u0629 (d):",
        questionEn: "A body starts from rest with uniform acceleration a = 4 m/s\xB2 for 5 seconds. Calculate displacement (d):",
        optionsAr: ["50 m", "20 m", "100 m", "40 m"],
        optionsEn: ["50 m", "20 m", "100 m", "40 m"],
        correctAnswer: 0,
        explanationAr: "\u0645\u0646 \u0645\u0639\u0627\u062F\u0644\u0629 \u0627\u0644\u062D\u0631\u0643\u0629: d = v\u2080t + 0.5 a t\xB2 = 0 + 0.5(4)(25) = 50 m.",
        explanationEn: "From kinematics: d = v\u2080t + 0.5 a t\xB2 = 0 + 0.5(4)(25) = 50 m."
      },
      {
        id: 3,
        questionAr: "\u0623\u0648\u062C\u062F \u0645\u064A\u0644 \u0627\u0644\u0645\u0645\u0627\u0633 \u0644\u0645\u0646\u062D\u0646\u0649 \u0627\u0644\u062F\u0627\u0644\u0629 \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0629 f(x) = 2x\xB2 - 5x + 4 \u0639\u0646\u062F \u0627\u0644\u0646\u0642\u0637\u0629 x = 3:",
        questionEn: "Find the slope of the tangent line to the curve f(x) = 2x\xB2 - 5x + 4 at x = 3:",
        optionsAr: ["7", "11", "5", "9"],
        optionsEn: ["7", "11", "5", "9"],
        correctAnswer: 0,
        explanationAr: "\u0627\u0644\u0645\u0634\u062A\u0642\u0629 \u062A\u0645\u062B\u0644 \u0645\u064A\u0644 \u0627\u0644\u0645\u0645\u0627\u0633: f'(x) = 4x - 5. \u0628\u0627\u0644\u062A\u0639\u0648\u064A\u0636 \u0628\u0640 x = 3: f'(3) = 4(3) - 5 = 12 - 5 = 7.",
        explanationEn: "Derivative gives slope: f'(x) = 4x - 5. At x = 3: f'(3) = 7."
      },
      {
        id: 4,
        questionAr: "\u062A\u0624\u062B\u0631 \u0642\u0648\u0629 \u0623\u0641\u0642\u064A\u0629 \u062B\u0627\u0628\u062A\u0629 F = 40 N \u0639\u0644\u0649 \u062C\u0633\u0645 \u0643\u062A\u0644\u062A\u0647 m = 5 kg \u0645\u0648\u0636\u0648\u0639 \u0639\u0644\u0649 \u0633\u0637\u062D \u0623\u0645\u0644\u0633. \u0627\u062D\u0633\u0628 \u0633\u0631\u0639\u0629 \u0627\u0644\u062C\u0633\u0645 (v) \u0628\u0639\u062F \u0642\u0637\u0639 \u0645\u0633\u0627\u0641\u0629 d = 4 m \u0645\u0646 \u0627\u0644\u0633\u0643\u0648\u0646:",
        questionEn: "A constant force F = 40 N acts on a 5 kg mass from rest on a frictionless surface. What is its velocity after d = 4 m?",
        optionsAr: ["8 m/s", "4 m/s", "16 m/s", "6.4 m/s"],
        optionsEn: ["8 m/s", "4 m/s", "16 m/s", "6.4 m/s"],
        correctAnswer: 0,
        explanationAr: "\u0627\u0644\u062A\u0633\u0627\u0631\u0639 a = F / m = 40 / 5 = 8 m/s\xB2. \u0627\u0644\u0633\u0631\u0639\u0629: v\xB2 = 2ad = 2(8)(4) = 64 => v = \u221A64 = 8 m/s.",
        explanationEn: "Acceleration a = 40 / 5 = 8 m/s\xB2. v\xB2 = 2ad = 64 => v = 8 m/s."
      },
      {
        id: 5,
        questionAr: "\u0627\u062D\u0633\u0628 \u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0643\u0627\u0645\u0644 \u0627\u0644\u0645\u062D\u062F\u0648\u062F \u0627\u0644\u062A\u0627\u0644\u064A: \u222B \u0645\u0646 1 \u0625\u0644\u0649 4 \u0644\u0644\u062F\u0627\u0644\u0629 (3x\xB2 - 2x) dx:",
        questionEn: "Evaluate the definite integral \u222B from 1 to 4 of (3x\xB2 - 2x) dx:",
        optionsAr: ["48", "63", "45", "52"],
        optionsEn: ["48", "63", "45", "52"],
        correctAnswer: 0,
        explanationAr: "\u062F\u0627\u0644\u0629 \u0627\u0644\u062A\u0643\u0627\u0645\u0644 \u0627\u0644\u0623\u0635\u0644\u064A\u0629 [x\xB3 - x\xB2]. \u0628\u0627\u0644\u062A\u0639\u0648\u064A\u0636: (4\xB3 - 4\xB2) - (1\xB3 - 1\xB2) = (64 - 16) - 0 = 48.",
        explanationEn: "Antiderivative: [x\xB3 - x\xB2]. (64 - 16) - 0 = 48."
      }
    ];

    let userAnswers = {};
    let showAnswersState = false;

    // Render questions according to current language
    function renderQuestions() {
      const container = document.getElementById('questions-list');
      if (!container) return;
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return;
      }
      
      container.innerHTML = '';
      
      const qCountText = currentLang === 'ar' ? (questions.length + ' \u0623\u0633\u0626\u0644\u0629') : (questions.length + ' Questions');
      const badge = document.getElementById('q-count-badge');
      if (badge) badge.textContent = qCountText;

      questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'bg-white teal-border-card p-5 md:p-6 transition shadow-sm';
        card.id = 'question-card-' + idx;

        const qText = currentLang === 'ar' ? (q.questionAr || q.question || '') : (q.questionEn || q.question || '');
        const optionsList = (currentLang === 'ar' ? (q.optionsAr || q.options) : (q.optionsEn || q.options)) || [];
        const explText = (currentLang === 'ar' ? (q.explanationAr || q.explanation) : (q.explanationEn || q.explanation)) || '';
        const correctIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
        const correctText = optionsList[correctIndex] || optionsList[0] || '';

        const optionsHtml = optionsList.map((opt, optIdx) => {
          const checked = userAnswers[idx] === optIdx ? 'checked' : '';
          return \`
            <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
              <input type="radio" name="q_\${idx}" value="\${optIdx}" \${checked} onchange="selectAnswer(\${idx}, \${optIdx})" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
              <span class="font-medium text-slate-800">\${opt}</span>
            </label>
          \`;
        }).join('');

        const ptsLabel = currentLang === 'ar' ? '\u062F\u0631\u062C\u0627\u062A' : 'pts';
        const explHead = currentLang === 'ar' ? '\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629:' : 'Correct Answer:';
        const ptsValue = q.points || Math.round(100 / Math.max(1, questions.length));

        card.innerHTML = \`
          <div class="flex items-start justify-between gap-3 mb-3">
            <h3 class="font-bold text-slate-800 text-sm md:text-base leading-relaxed">
              <span class="text-teal-600 font-extrabold ml-1">(\${idx + 1})</span> \${qText}
            </h3>
            <span class="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[11px] font-bold shrink-0 border border-teal-200">
              \${ptsValue} \${ptsLabel}
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
            \${optionsHtml}
          </div>
          <div id="explanation-\${idx}" class="\${showAnswersState ? '' : 'hidden'} p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium">
            \u{1F4A1} <strong>\${explHead}</strong> \${correctText}<br>
            <span class="text-slate-600 mt-1 block">\${explText || ''}</span>
          </div>
        \`;
        container.appendChild(card);
      });
    }

    function selectAnswer(qIdx, optIdx) {
      userAnswers[qIdx] = optIdx;
    }

    function submitAndGrade() {
      let correctCount = 0;
      questions.forEach((q, idx) => {
        const card = document.getElementById('question-card-' + idx);
        const expl = document.getElementById('explanation-' + idx);
        if (userAnswers[idx] === q.correctAnswer) {
          correctCount++;
          if (card) {
            card.classList.remove('border-rose-300', 'bg-rose-50/20');
            card.classList.add('border-emerald-500', 'bg-emerald-50/30');
          }
        } else {
          if (card) {
            card.classList.remove('border-emerald-500', 'bg-emerald-50/30');
            card.classList.add('border-rose-300', 'bg-rose-50/20');
          }
        }
        if (expl) expl.classList.remove('hidden');
      });

      const totalScore = Math.round((correctCount / questions.length) * 100);
      const banner = document.getElementById('result-banner');
      banner.classList.remove('hidden');
      document.getElementById('score-text').textContent = totalScore + ' / 100';
      banner.scrollIntoView({ behavior: 'smooth' });
    }

    function toggleAnswers() {
      showAnswersState = !showAnswersState;
      questions.forEach((q, idx) => {
        const expl = document.getElementById('explanation-' + idx);
        if (expl) {
          if (showAnswersState) expl.classList.remove('hidden');
          else expl.classList.add('hidden');
        }
      });
    }

    function reshuffleQuestions() {
      questions.sort(() => Math.random() - 0.5);
      userAnswers = {};
      renderQuestions();
      document.getElementById('result-banner').classList.add('hidden');
    }

    function resetExam() {
      const msg = currentLang === 'ar' ? '\u0647\u0644 \u062A\u0631\u064A\u062F \u0645\u0633\u062D \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0648\u0628\u062F\u0621 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0646 \u062C\u062F\u064A\u062F\u061F' : 'Reset all answers and start over?';
      if (confirm(msg)) {
        userAnswers = {};
        renderQuestions();
        document.getElementById('result-banner').classList.add('hidden');
        timerSeconds = durationMinutes * 60;
      }
    }

    // Toggle Bilingual Language (Arabic <-> English)
    function toggleLanguage() {
      currentLang = currentLang === 'ar' ? 'en' : 'ar';
      const html = document.documentElement;
      
      if (currentLang === 'en') {
        html.dir = 'ltr';
        html.lang = 'en';
        document.getElementById('lang-btn-label').textContent = '\u0639\u0631\u0628\u064A';
        document.getElementById('lbl-timer').textContent = '\u23F0 Time Left:';
        document.getElementById('badge-random').textContent = '\u{1F3B2} Random Questions';
        document.getElementById('toggle-answers-text').textContent = 'Show/Hide Answers';
        document.getElementById('btn-print-text').textContent = 'Print';
        document.getElementById('btn-new-q-text').textContent = 'New Questions';
        document.getElementById('btn-reset-text').textContent = 'Clear Progress';
        document.getElementById('save-progress-hint').innerHTML = 'Progress is saved automatically - <span id="q-count-badge"></span>';
        document.getElementById('lbl-date').textContent = '\u{1F4C5} Date:';
        document.getElementById('lbl-name').textContent = '\u{1F60A} Name:';
        document.getElementById('student-name').placeholder = 'Enter your name';
        document.getElementById('lbl-group').textContent = '\u{1F3EB} Class:';
        document.getElementById('student-group').placeholder = 'Class ID';
        document.getElementById('lbl-duration').textContent = '\u23F0 Duration:';
        document.getElementById('duration-val').textContent = durationMinutes + ' mins';
        document.getElementById('lbl-total-marks').textContent = '\u{1F4CA} Total:';
        document.getElementById('total-marks-val').textContent = '100 marks';
        document.getElementById('submit-btn-text').textContent = 'Submit & Grade!';
        document.getElementById('result-title').textContent = 'Final Exam Result';
        document.getElementById('feedback-text').textContent = 'Well done! Review the answers detailed below.';
        document.getElementById('send-teacher-title').textContent = '\u{1F4E4} Send Exam Score & Answers to Teacher:';
        document.getElementById('btn-wa-text').textContent = 'Send via WhatsApp';
        document.getElementById('btn-email-text').textContent = 'Send via Email';
        document.getElementById('btn-copy-summary').textContent = 'Copy Score Report';
      } else {
        html.dir = 'rtl';
        html.lang = 'ar';
        document.getElementById('lang-btn-label').textContent = 'English';
        document.getElementById('lbl-timer').textContent = '\u23F0 \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A:';
        document.getElementById('badge-random').textContent = '\u{1F3B2} \u0623\u0633\u0626\u0644\u0629 \u0639\u0634\u0648\u0627\u0626\u064A\u0629';
        document.getElementById('toggle-answers-text').textContent = '\u0625\u0638\u0647\u0627\u0631/\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A';
        document.getElementById('btn-print-text').textContent = '\u0637\u0628\u0627\u0639\u0629';
        document.getElementById('btn-new-q-text').textContent = '\u0623\u0633\u0626\u0644\u0629 \u062C\u062F\u064A\u062F\u0629';
        document.getElementById('btn-reset-text').textContent = '\u0645\u0633\u062D \u0627\u0644\u062A\u0642\u062F\u0645';
        document.getElementById('save-progress-hint').innerHTML = '\u064A\u062A\u0645 \u062D\u0641\u0638 \u062A\u0642\u062F\u0645\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B - <span id="q-count-badge"></span>';
        document.getElementById('lbl-date').textContent = '\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E:';
        document.getElementById('lbl-name').textContent = '\u{1F60A} \u0627\u0644\u0627\u0633\u0645:';
        document.getElementById('student-name').placeholder = '\u0627\u0643\u062A\u0628 \u0627\u0633\u0645\u0643';
        document.getElementById('lbl-group').textContent = '\u{1F3EB} \u0627\u0644\u0634\u0639\u0628\u0629:';
        document.getElementById('student-group').placeholder = '\u0627\u0644\u0634\u0639\u0628\u0629';
        document.getElementById('lbl-duration').textContent = '\u23F0 \u0627\u0644\u0645\u062F\u0629:';
        document.getElementById('duration-val').textContent = durationMinutes + ' \u062F\u0642\u064A\u0642\u0629';
        document.getElementById('lbl-total-marks').textContent = '\u{1F4CA} \u0627\u0644\u0645\u062C\u0645\u0648\u0639:';
        document.getElementById('total-marks-val').textContent = '100 \u062F\u0631\u062C\u0629';
        document.getElementById('submit-btn-text').textContent = '\u0635\u062D\u062D \u0625\u062C\u0627\u0628\u0627\u062A\u064A!';
        document.getElementById('result-title').textContent = '\u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629';
        document.getElementById('feedback-text').textContent = '\u0623\u062D\u0633\u0646\u062A! \u0631\u0627\u062C\u0639 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0648\u0636\u062D\u0629 \u0641\u064A \u0627\u0644\u0623\u0633\u0626\u0644\u0629.';
        document.getElementById('send-teacher-title').textContent = '\u{1F4E4} \u0625\u0631\u0633\u0627\u0644 \u0648\u0631\u0642\u0629 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0648\u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0639\u0644\u0645:';
        document.getElementById('btn-wa-text').textContent = '\u0625\u0631\u0633\u0627\u0644 \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628 (WhatsApp)';
        document.getElementById('btn-email-text').textContent = '\u0625\u0631\u0633\u0627\u0644 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A';
        document.getElementById('btn-copy-summary').textContent = '\u0646\u0633\u062E \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062F\u0631\u062C\u0629';
      }

      renderQuestions();
    }

    // Send to Teacher via WhatsApp
    function sendResultToTeacherWhatsApp() {
      const name = document.getElementById('student-name').value.trim() || (currentLang === 'ar' ? '\u0637\u0627\u0644\u0628 \u063A\u064A\u0631 \u0645\u062D\u062F\u062F' : 'Anonymous Student');
      const group = document.getElementById('student-group').value.trim() || '-';
      const score = document.getElementById('score-text').textContent;
      const title = document.getElementById('exam-title-display').textContent.trim();
      
      const text = encodeURIComponent(
        \`\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064A\u0643\u0645 \u0648\u0631\u062D\u0645\u0629 \u0627\u0644\u0644\u0647\u060C
\u062A\u0642\u0631\u064A\u0631 \u0646\u062A\u064A\u062C\u0629 \u0627\u0645\u062A\u062D\u0627\u0646 \u0627\u0644\u0637\u0627\u0644\u0628:
- \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646: \${title}
- \u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628: \${name}
- \u0627\u0644\u0634\u0639\u0628\u0629: \${group}
- \u0627\u0644\u0646\u062A\u064A\u062C\u0629: \${score}
- \u0627\u0644\u062A\u0627\u0631\u064A\u062E: 2026/09/16\`
      );
      window.open(\`https://wa.me/\${teacherPhoneNumber}?text=\${text}\`, '_blank');
    }

    // Send to Teacher via Email
    function sendResultViaEmail() {
      const name = document.getElementById('student-name').value.trim() || '\u0627\u0644\u0637\u0627\u0644\u0628';
      const score = document.getElementById('score-text').textContent;
      const title = document.getElementById('exam-title-display').textContent.trim();
      
      const subject = encodeURIComponent(\`\u0646\u062A\u064A\u062C\u0629 \u0627\u0645\u062A\u062D\u0627\u0646 \${title} - \u0627\u0644\u0637\u0627\u0644\u0628: \${name}\`);
      const body = encodeURIComponent(\`\u0627\u0645\u062A\u062D\u0627\u0646: \${title}
\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628: \${name}
\u0627\u0644\u062F\u0631\u062C\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629: \${score}
\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u062C\u0631\u0627\u0621: 2026/09/16\`);
      window.location.href = \`mailto:\${teacherEmail}?subject=\${subject}&body=\${body}\`;
    }

    function copyResultSummary() {
      const name = document.getElementById('student-name').value.trim() || '\u0637\u0627\u0644\u0628';
      const score = document.getElementById('score-text').textContent;
      const title = document.getElementById('exam-title-display').textContent.trim();
      const report = \`\u062A\u0642\u0631\u064A\u0631 \u0646\u062A\u064A\u062C\u0629 \u0627\u0645\u062A\u062D\u0627\u0646: \${title}
\u0627\u0644\u0637\u0627\u0644\u0628: \${name}
\u0627\u0644\u062F\u0631\u062C\u0629: \${score}
\u0627\u0644\u062A\u0627\u0631\u064A\u062E: 2026/09/16\`;
      navigator.clipboard.writeText(report);
      alert(currentLang === 'ar' ? '\u062A\u0645 \u0646\u0633\u062E \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0628\u0646\u062C\u0627\u062D!' : 'Result summary copied to clipboard!');
    }

    // Timer countdown
    setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        const mins = Math.floor(timerSeconds / 60);
        const secs = timerSeconds % 60;
        document.getElementById('timer').textContent = 
          String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      }
    }, 1000);

    // Initial render
    renderQuestions();
  </script>
</body>
</html>`
  },
  {
    id: "interactive-html-quiz",
    title: "\u062A\u0637\u0628\u064A\u0642 \u0627\u0645\u062A\u062D\u0627\u0646 \u0648\u064A\u0628 \u062A\u0641\u0627\u0639\u0644\u064A (HTML + Tailwind + JS)",
    titleEn: "Interactive Web Quiz (HTML/JS)",
    category: "Web & Browser",
    language: "html",
    extension: "html",
    description: "\u0635\u0641\u062D\u0629 \u0648\u064A\u0628 \u0645\u062A\u0643\u0627\u0645\u0644\u0629 \u0628\u062A\u0635\u0645\u064A\u0645 \u0639\u0635\u0631\u064A \u0648\u0623\u0646\u064A\u0642\u060C \u062A\u0634\u0645\u0644 \u0639\u062F\u0627\u062F \u062A\u0646\u0627\u0632\u0644\u064A\u060C \u0634\u0631\u064A\u0637 \u062A\u0642\u062F\u0645\u060C \u062A\u0635\u062D\u064A\u062D \u0641\u0648\u0631\u064A\u060C \u0648\u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0645\u0639 \u0645\u0624\u062B\u0631\u0627\u062A.",
    code: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u0627\u0645\u062A\u062D\u0627\u0646 \u062A\u0641\u0627\u0639\u0644\u064A \u0644\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A - \u0646\u0645\u0648\u0630\u062C \u0643\u0648\u062F</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Cairo', sans-serif; }
    .math-font { font-family: 'Times New Roman', serif; direction: ltr; display: inline-block; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen py-10 px-4">
  <div class="max-w-2xl mx-auto bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
      <div>
        <h1 id="exam-title" class="text-2xl font-bold text-teal-400">\u0627\u0645\u062A\u062D\u0627\u0646 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A</h1>
        <p class="text-xs text-slate-400 mt-1">\u0645\u0633\u0627\u0626\u0644 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0645\u0639 \u062A\u0635\u062D\u064A\u062D \u0641\u0648\u0631\u064A</p>
      </div>
      <div class="text-left bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-sm font-mono text-emerald-400">
        \u0627\u0644\u0648\u0642\u062A: <span id="timer">30:00</span>
      </div>
    </div>

    <!-- Progress -->
    <div class="mb-6">
      <div class="flex justify-between text-xs text-slate-400 mb-1">
        <span>\u0627\u0644\u0633\u0624\u0627\u0644 <span id="current-index">1</span> \u0645\u0646 <span id="total-count">3</span></span>
        <span id="score-counter">\u0627\u0644\u062F\u0631\u062C\u0629: 0</span>
      </div>
      <div class="w-full bg-slate-700 rounded-full h-2">
        <div id="progress-bar" class="bg-teal-500 h-2 rounded-full transition-all duration-300" style="width: 33%"></div>
      </div>
    </div>

    <!-- Question Container -->
    <div id="quiz-container">
      <h2 id="question-text" class="text-lg font-semibold text-white mb-4">\u062A\u062D\u0631\u0643 \u062C\u0633\u0645 \u0645\u0646 \u0627\u0644\u0633\u0643\u0648\u0646 \u0628\u0639\u062C\u0644\u0629 \u0645\u0646\u062A\u0638\u0645\u0629 a = 4 m/s\xB2 \u0644\u0645\u062F\u0629 5 \u062B\u0648\u0627\u0646\u064D\u060C \u0627\u062D\u0633\u0628 \u0633\u0631\u0639\u062A\u0647 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 (v) \u0648\u0627\u0644\u0645\u0633\u0627\u0641\u0629 (d):</h2>
      <div id="options-container" class="space-y-3">
        <!-- Options generated dynamically -->
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-8 flex justify-between items-center pt-4 border-t border-slate-700">
      <button id="prev-btn" onclick="prevQuestion()" class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm disabled:opacity-40" disabled>\u0627\u0644\u0633\u0627\u0628\u0642</button>
      <button id="next-btn" onclick="nextQuestion()" class="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-semibold text-white">\u0627\u0644\u062A\u0627\u0644\u064A</button>
    </div>

    <!-- Results Modal -->
    <div id="result-view" class="hidden text-center py-8">
      <div class="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">\u2713</div>
      <h2 class="text-2xl font-bold text-white mb-2">\u062A\u0645 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0628\u0646\u062C\u0627\u062D!</h2>
      <p id="final-score" class="text-xl text-teal-300 font-semibold mb-6">\u062F\u0631\u062C\u062A\u0643: 3 / 3</p>
      <button onclick="restartQuiz()" class="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg">\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646</button>
    </div>
  </div>

  <script>
    // \u0628\u0646\u0643 \u0645\u0633\u0627\u0626\u0644 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629
    const questions = [
      {
        text: "\u062A\u062D\u0631\u0643 \u062C\u0633\u0645 \u0645\u0646 \u0627\u0644\u0633\u0643\u0648\u0646 \u0628\u0639\u062C\u0644\u0629 \u0645\u0646\u062A\u0638\u0645\u0629 a = 4 m/s\xB2 \u0644\u0645\u062F\u0629 5 \u062B\u0648\u0627\u0646\u064D\u060C \u0627\u062D\u0633\u0628 \u0633\u0631\u0639\u062A\u0647 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 (v) \u0648\u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0645\u0642\u0637\u0648\u0639\u0629 (d):",
        options: ["v = 20 m/s , d = 50 m", "v = 20 m/s , d = 100 m", "v = 10 m/s , d = 25 m", "v = 15 m/s , d = 40 m"],
        correct: 0,
        explanation: "\u0627\u0644\u0633\u0631\u0639\u0629: v = at = 4 \xD7 5 = 20 m/s. \u0627\u0644\u0645\u0633\u0627\u0641\u0629: d = 0.5 a t\xB2 = 0.5 \xD7 4 \xD7 25 = 50 m."
      },
      {
        text: "\u0641\u064A \u062F\u0627\u0626\u0631\u0629 \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0645\u0648\u0635\u0644 \u0628\u0647\u0627 \u0645\u0642\u0627\u0648\u0645\u062A\u0627\u0646 (6 \u03A9, 3 \u03A9) \u0639\u0644\u0649 \u0627\u0644\u062A\u0648\u0627\u0632\u064A \u0645\u0639 \u0628\u0637\u0627\u0631\u064A\u0629 12 V\u060C \u0645\u0627 \u0645\u0642\u062F\u0627\u0631 \u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 \u0627\u0644\u0643\u0644\u064A I\u061F",
        options: ["6 A", "2 A", "4 A", "1.5 A"],
        correct: 0,
        explanation: "\u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0645\u0643\u0627\u0641\u0626\u0629 R_p = (6 \xD7 3)/(6 + 3) = 2 \u03A9. \u0627\u0644\u062A\u064A\u0627\u0631 \u0627\u0644\u0643\u0644\u064A I = V / R = 12 / 2 = 6 A."
      },
      {
        text: "\u0623\u0648\u062C\u062F \u0645\u064A\u0644 \u0627\u0644\u0645\u0645\u0627\u0633 \u0644\u0645\u0646\u062D\u0646\u0649 \u0627\u0644\u062F\u0627\u0644\u0629 f(x) = 3x\xB2 - 5x + 7 \u0639\u0646\u062F \u0627\u0644\u0646\u0642\u0637\u0629 \u0627\u0644\u062A\u064A \u0625\u062D\u062F\u0627\u062B\u064A\u0647\u0627 x = 2:",
        options: ["7", "12", "6", "1"],
        correct: 0,
        explanation: "\u0627\u0644\u0645\u0634\u062A\u0642\u0629 f'(x) = 6x - 5. \u0628\u0627\u0644\u062A\u0639\u0648\u064A\u0636 \u0628\u0640 x = 2: f'(2) = 6(2) - 5 = 12 - 5 = 7."
      }
    ];

    let currentIndex = 0;
    let userAnswers = {};

    function renderQuestion() {
      const q = questions[currentIndex];
      document.getElementById('current-index').textContent = currentIndex + 1;
      document.getElementById('total-count').textContent = questions.length;
      document.getElementById('question-text').textContent = q.text;
      document.getElementById('progress-bar').style.width = ((currentIndex + 1) / questions.length * 100) + '%';
      
      const optContainer = document.getElementById('options-container');
      optContainer.innerHTML = '';

      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        const isSelected = userAnswers[currentIndex] === idx;
        btn.className = \`w-full text-right p-3.5 rounded-xl border transition-all text-sm font-medium flex items-center justify-between \${
          isSelected 
            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' 
            : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-slate-200'
        }\`;
        btn.innerHTML = \`<span>\${opt}</span><span class="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center text-xs \${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : ''}">\${isSelected ? '\u25CF' : ''}</span>\`;
        btn.onclick = () => selectOption(idx);
        optContainer.appendChild(btn);
      });

      document.getElementById('prev-btn').disabled = currentIndex === 0;
      document.getElementById('next-btn').textContent = currentIndex === questions.length - 1 ? '\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646' : '\u0627\u0644\u062A\u0627\u0644\u064A';
    }

    function selectOption(idx) {
      userAnswers[currentIndex] = idx;
      renderQuestion();
    }

    function nextQuestion() {
      if (currentIndex < questions.length - 1) {
        currentIndex++;
        renderQuestion();
      } else {
        finishQuiz();
      }
    }

    function prevQuestion() {
      if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
      }
    }

    function finishQuiz() {
      let score = 0;
      questions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correct) score++;
      });
      document.getElementById('quiz-container').classList.add('hidden');
      document.getElementById('prev-btn').classList.add('hidden');
      document.getElementById('next-btn').classList.add('hidden');
      document.getElementById('result-view').classList.remove('hidden');
      document.getElementById('final-score').textContent = \`\u062F\u0631\u062C\u062A\u0643: \${score} \u0645\u0646 \${questions.length} (\${Math.round(score/questions.length*100)}%)\`;
    }

    function restartQuiz() {
      userAnswers = {};
      currentIndex = 0;
      document.getElementById('quiz-container').classList.remove('hidden');
      document.getElementById('prev-btn').classList.remove('hidden');
      document.getElementById('next-btn').classList.remove('hidden');
      document.getElementById('result-view').classList.add('hidden');
      renderQuestion();
    }

    renderQuestion();
  </script>
</body>
</html>`
  },
  {
    id: "python-cli-exam",
    title: "\u0633\u0643\u0631\u0628\u062A \u0628\u0627\u064A\u062B\u0648\u0646 \u062A\u0641\u0627\u0639\u0644\u064A \u0641\u064A \u0627\u0644\u062A\u0631\u0645\u0646\u0627\u0644 (Python CLI)",
    titleEn: "Python Terminal Quiz CLI",
    category: "Backend & CLI",
    language: "python",
    extension: "py",
    description: "\u0643\u0648\u062F \u0628\u0627\u064A\u062B\u0648\u0646 \u0645\u062A\u0643\u0627\u0645\u0644 \u064A\u0637\u0631\u062D \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0641\u064A \u0633\u0637\u0631 \u0627\u0644\u0623\u0648\u0627\u0645\u0631\u060C \u064A\u062D\u0633\u0628 \u0627\u0644\u0646\u0642\u0627\u0637\u060C \u064A\u0639\u0631\u0636 \u0634\u0631\u064A\u0637 \u062A\u0642\u062F\u0645 \u0648\u062A\u0642\u0631\u064A\u0631 \u0646\u0647\u0627\u0626\u064A.",
    code: `"""
\u0627\u0645\u062A\u062D\u0627\u0646 \u062A\u0641\u0627\u0639\u0644\u064A \u0644\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A - \u0633\u0643\u0631\u0628\u062A \u0628\u0627\u064A\u062B\u0648\u0646
Interactive Physics & Mathematics Exam - Python CLI Runner
"""
import sys
import time

class Question:
    def __init__(self, text, options, correct_index, explanation=""):
        self.text = text
        self.options = options
        self.correct_index = correct_index
        self.explanation = explanation

# \u0645\u0635\u0641\u0648\u0641\u0629 \u0645\u0633\u0627\u0626\u0644 \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629
QUESTIONS = [
    Question(
        text="\u062A\u062A\u062D\u0631\u0643 \u0633\u064A\u0627\u0631\u0629 \u0628\u0633\u0631\u0639\u0629 \u0627\u0628\u062A\u062F\u0627\u0626\u064A\u0629 v\u2080 = 10 m/s \u0648\u0628\u062A\u0633\u0627\u0631\u0639 \u0645\u0646\u062A\u0638\u0645 a = 3 m/s\xB2 \u0644\u0645\u062F\u0629 t = 4 s. \u0645\u0627 \u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0645\u0642\u0637\u0648\u0639\u0629 (d)\u061F",
        options=["64 m", "52 m", "40 m", "24 m"],
        correct_index=0,
        explanation="\u0627\u0644\u0642\u0627\u0646\u0648\u0646: d = v\u2080t + 0.5 a t\xB2 = 10(4) + 0.5(3)(16) = 40 + 24 = 64 m."
    ),
    Question(
        text="\u0645\u0627 \u0645\u0642\u062F\u0627\u0631 \u0627\u0644\u0642\u0648\u0629 \u0627\u0644\u0645\u062D\u0635\u0644\u0629 F \u0627\u0644\u0645\u0624\u062B\u0631\u0629 \u0639\u0644\u0649 \u0643\u062A\u0644\u0629 m = 5 kg \u0644\u062A\u0643\u0633\u0628\u0647\u0627 \u062A\u0633\u0627\u0631\u0639\u0627\u064B a = 8 m/s\xB2\u061F",
        options=["40 N", "13 N", "1.6 N", "200 N"],
        correct_index=0,
        explanation="\u0642\u0627\u0646\u0648\u0646 \u0646\u064A\u0648\u062A\u0646 \u0627\u0644\u062B\u0627\u0646\u064A: F = m \xB7 a = 5 \xD7 8 = 40 N."
    ),
    Question(
        text="\u0623\u0648\u062C\u062F \u0627\u0644\u0645\u0634\u062A\u0642\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0644\u0644\u062F\u0627\u0644\u0629 f(x) = 3x\xB2 - 5x + 4 \u0639\u0646\u062F \u0627\u0644\u0646\u0642\u0637\u0629 x = 2:",
        options=["7", "12", "6", "1"],
        correct_index=0,
        explanation="\u0627\u0644\u0645\u0634\u062A\u0642\u0629: f'(x) = 6x - 5. \u0628\u0627\u0644\u062A\u0639\u0648\u064A\u0636 \u0628\u0640 x = 2: f'(2) = 6(2) - 5 = 7."
    )
]

def run_exam(exam_title="\u0627\u0645\u062A\u062D\u0627\u0646 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A"):
    print("=" * 60)
    print(f"       \u{1F4D0} {exam_title}")
    print("=" * 60)
    print(f"\u0639\u062F\u062F \u0627\u0644\u0623\u0633\u0626\u0644\u0629: {len(QUESTIONS)}")
    print("\u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0627\u0644\u062E\u064A\u0627\u0631 (1-4) \u0648\u0627\u0636\u063A\u0637 Enter \u0644\u0643\u0644 \u0645\u0633\u0623\u0644\u0629.\\n")

    score = 0
    start_time = time.time()

    for idx, q in enumerate(QUESTIONS, 1):
        print(f"\\n[\u0645\u0633\u0623\u0644\u0629 {idx}/{len(QUESTIONS)}] {q.text}")
        for opt_idx, opt in enumerate(q.options, 1):
            print(f"   {opt_idx}. {opt}")

        while True:
            try:
                ans = input("\\n\u0625\u062C\u0627\u0628\u062A\u0643 (1-4): ").strip()
                choice = int(ans)
                if 1 <= choice <= len(q.options):
                    break
                print("\u26A0\uFE0F \u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u062E\u064A\u0627\u0631 \u0635\u062D\u064A\u062D \u0628\u064A\u0646 1 \u0648", len(q.options))
            except ValueError:
                print("\u26A0\uFE0F \u0625\u062F\u062E\u0627\u0644 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u060C \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645.")

        if (choice - 1) == q.correct_index:
            print("\u2705 \u0625\u062C\u0627\u0628\u0629 \u0635\u062D\u064A\u062D\u0629 \u0648\u0645\u062D\u0633\u0648\u0628\u0629 \u0628\u062F\u0642\u0629!")
            score += 1
        else:
            correct_opt = q.options[q.correct_index]
            print(f"\u274C \u0625\u062C\u0627\u0628\u0629 \u062E\u0627\u0637\u0626\u0629. \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0647\u064A: {correct_opt}")
            if q.explanation:
                print(f"\u{1F4A1} \u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062D\u0644: {q.explanation}")

    elapsed = round(time.time() - start_time, 1)
    percentage = round((score / len(QUESTIONS)) * 100, 1)

    print("\\n" + "=" * 60)
    print("               \u{1F3C1} \u0646\u062A\u064A\u062C\u0629 \u0627\u0645\u062A\u062D\u0627\u0646 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A")
    print("=" * 60)
    print(f"\u0627\u0644\u062F\u0631\u062C\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629: {score} \u0645\u0646 {len(QUESTIONS)} ({percentage}%)")
    print(f"\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u0633\u062A\u063A\u0631\u0642: {elapsed} \u062B\u0627\u0646\u064A\u0629")
    
    if percentage >= 85:
        print("\u0627\u0644\u062A\u0642\u062F\u064A\u0631: \u0645\u0645\u062A\u0627\u0632 \u{1F31F}")
    elif percentage >= 70:
        print("\u0627\u0644\u062A\u0642\u062F\u064A\u0631: \u062C\u064A\u062F \u062C\u062F\u0627\u064B \u{1F44D}")
    elif percentage >= 50:
        print("\u0627\u0644\u062A\u0642\u062F\u064A\u0631: \u0646\u0627\u062C\u062D \u2714\uFE0F")
    else:
        print("\u0627\u0644\u062A\u0642\u062F\u064A\u0631: \u062A\u062D\u062A\u0627\u062C \u0644\u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0626\u0644 \u{1F4DA}")
    print("=" * 60)

if __name__ == "__main__":
    run_exam()`
  },
  {
    id: "react-quiz-component",
    title: "\u0645\u0643\u0648\u0646 \u0631\u064A\u0623\u0643\u062A \u062A\u0641\u0627\u0639\u0644\u064A (React + TypeScript Component)",
    titleEn: "React Quiz Component (TSX)",
    category: "React / Frontend",
    language: "typescript",
    extension: "tsx",
    description: "\u0645\u0643\u0648\u0646 \u0631\u064A\u0623\u0643\u062A \u0643\u0627\u0645\u0644 \u0645\u0639 State\u060C \u0639\u062F\u0627\u062F \u0646\u0642\u0627\u0637\u060C \u062E\u064A\u0627\u0631\u0627\u062A \u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0648\u062A\u0635\u0645\u064A\u0645 Tailwind \u0639\u0635\u0631\u064A \u0644\u0645\u0633\u0627\u0626\u0644 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A.",
    code: `import React, { useState } from 'react';

interface QuestionItem {
  id: number;
  question: string;
  formula: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// \u0628\u0646\u0643 \u0645\u0633\u0627\u0626\u0644 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629
const EXAM_QUESTIONS: QuestionItem[] = [
  {
    id: 1,
    question: "\u0641\u064A \u062F\u0627\u0626\u0631\u0629 \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0645\u0648\u0635\u0644 \u0628\u0647\u0627 \u0645\u0642\u0627\u0648\u0645\u062A\u0627\u0646 \u0645\u062A\u0648\u0627\u0632\u064A\u062A\u0627\u0646 (6 \u03A9, 3 \u03A9) \u0639\u0644\u0649 \u0627\u0644\u062A\u0648\u0627\u0644\u064A \u0645\u0639 \u0645\u0642\u0627\u0648\u0645\u0629 2 \u03A9 \u0648\u0645\u0635\u062F\u0631 \u062C\u0647\u062F 16 V\u060C \u0645\u0627 \u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 \u0627\u0644\u0643\u0644\u064A I\u061F",
    formula: "I = V / R_eq",
    options: ["4 A", "2.67 A", "8 A", "1.6 A"],
    correctAnswer: 0,
    explanation: "\u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0645\u0643\u0627\u0641\u0626\u0629: R_p = (6 \xD7 3) / 9 = 2 \u03A9. \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0643\u0644\u064A\u0629: R_eq = 2 + 2 = 4 \u03A9. \u0627\u0644\u062A\u064A\u0627\u0631 I = 16 / 4 = 4 A."
  },
  {
    id: 2,
    question: "\u0623\u0648\u062C\u062F \u0645\u064A\u0644 \u0627\u0644\u0645\u0645\u0627\u0633 \u0644\u0645\u0646\u062D\u0646\u0649 \u0627\u0644\u062F\u0627\u0644\u0629 f(x) = 2x\xB2 - 5x + 4 \u0639\u0646\u062F \u0627\u0644\u0646\u0642\u0637\u0629 \u0627\u0644\u062A\u064A \u0625\u062D\u062F\u0627\u062B\u064A\u0647\u0627 x = 3:",
    formula: "f'(x) = 4x - 5",
    options: ["7", "11", "5", "9"],
    correctAnswer: 0,
    explanation: "\u0627\u0644\u0645\u0634\u062A\u0642\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u062A\u0645\u062B\u0644 \u0627\u0644\u0645\u064A\u0644: f'(x) = 4x - 5. \u0628\u0627\u0644\u062A\u0639\u0648\u064A\u0636 \u0628\u0640 x = 3: f'(3) = 4(3) - 5 = 7."
  }
];

export const ExamQuizComponent: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentQ = EXAM_QUESTIONS[currentIndex];

  const handleSelect = (optionIdx: number) => {
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: optionIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    EXAM_QUESTIONS.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) score++;
    });
    return score;
  };

  if (isSubmitted) {
    const score = calculateScore();
    return (
      <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646</h2>
        <div className="text-4xl font-black text-teal-400 mb-2">
          {score} / {EXAM_QUESTIONS.length}
        </div>
        <button
          onClick={() => { setSelectedAnswers({}); setIsSubmitted(false); setCurrentIndex(0); }}
          className="mt-6 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 rounded-xl font-medium"
        >
          \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-slate-400">\u0645\u0633\u0623\u0644\u0629 {currentIndex + 1} \u0645\u0646 {EXAM_QUESTIONS.length}</span>
        <span className="px-3 py-1 bg-teal-950 text-teal-400 border border-teal-800 rounded-full text-xs font-mono">
          {currentQ.formula}
        </span>
      </div>

      <h3 className="text-lg font-semibold mb-6">{currentQ.question}</h3>

      <div className="space-y-3">
        {currentQ.options.map((option, idx) => {
          const isSelected = selectedAnswers[currentIndex] === idx;
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={\`w-full text-right p-4 rounded-xl border transition-all text-sm flex items-center justify-between \${
                isSelected
                  ? 'bg-teal-600/30 border-teal-500 text-teal-200'
                  : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
              }\`}
            >
              <span>{option}</span>
              <div className={\`w-4 h-4 rounded-full border \${isSelected ? 'bg-teal-500 border-teal-400' : 'border-slate-600'}\`} />
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(prev => prev - 1)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm disabled:opacity-40"
        >
          \u0627\u0644\u0633\u0627\u0628\u0642
        </button>
        {currentIndex === EXAM_QUESTIONS.length - 1 ? (
          <button
            onClick={() => setIsSubmitted(true)}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold"
          >
            \u062A\u0633\u0644\u064A\u0645 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm font-semibold"
          >
            \u0627\u0644\u062A\u0627\u0644\u064A
          </button>
        )}
      </div>
    </div>
  );
};`
  },
  {
    id: "json-question-bank",
    title: "\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0633\u0626\u0644\u0629 \u0645\u0647\u064A\u0643\u0644\u0629 (JSON Question Bank)",
    titleEn: "JSON Question Bank Schema",
    category: "Data & Schema",
    language: "json",
    extension: "json",
    description: "\u062A\u0646\u0633\u064A\u0642 JSON \u0642\u064A\u0627\u0633\u064A \u0648\u0645\u0648\u062B\u0642 \u0644\u0645\u0633\u0627\u0626\u0644 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0645\u0639 \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u062D\u0644\u0648\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A\u0629.",
    code: `{
  "examMetadata": {
    "title": "\u0628\u0646\u0643 \u0645\u0633\u0627\u0626\u0644 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A",
    "subject": "Physics & Mathematics",
    "courseCode": "PHY-MATH-301",
    "totalMarks": 100,
    "durationMinutes": 60,
    "instructions": "\u0627\u062E\u062A\u0631 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0644\u0643\u0644 \u0645\u0633\u0623\u0644\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0648\u0627\u0644\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628\u064A\u0629."
  },
  "questions": [
    {
      "id": "q1",
      "number": 1,
      "type": "multiple_choice",
      "topic": "\u0627\u0644\u062F\u0648\u0627\u0626\u0631 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0648\u0642\u0627\u0646\u0648\u0646 \u0623\u0648\u0645",
      "lawOrFormula": "I = V / R_eq",
      "questionText": "\u0641\u064A \u062F\u0627\u0626\u0631\u0629 \u0645\u0648\u0635\u0644 \u0628\u0647\u0627 \u0645\u0642\u0627\u0648\u0645\u062A\u0627\u0646 \u0645\u062A\u0648\u0627\u0632\u064A\u062A\u0627\u0646 (6 \u03A9, 3 \u03A9) \u0639\u0644\u0649 \u0627\u0644\u062A\u0648\u0627\u0644\u064A \u0645\u0639 2 \u03A9 \u0648\u0645\u0635\u062F\u0631 16 V\u060C \u0645\u0627 \u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 \u0627\u0644\u0643\u0644\u064A\u061F",
      "choices": [
        { "key": "A", "text": "4 A" },
        { "key": "B", "text": "2.67 A" },
        { "key": "C", "text": "8 A" },
        { "key": "D", "text": "1.6 A" }
      ],
      "correctAnswer": "A",
      "points": 25,
      "explanation": "\u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0645\u0643\u0627\u0641\u0626\u0629 R_p = (6 \xD7 3) / 9 = 2 \u03A9. \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0643\u0644\u064A\u0629 R_eq = 2 + 2 = 4 \u03A9. \u0634\u062F\u0629 \u0627\u0644\u062A\u064A\u0627\u0631 I = 16 / 4 = 4 A."
    },
    {
      "id": "q2",
      "number": 2,
      "type": "multiple_choice",
      "topic": "\u062D\u0633\u0627\u0628 \u0627\u0644\u062A\u0641\u0627\u0636\u0644 \u0648\u0645\u064A\u0644 \u0627\u0644\u0645\u0645\u0627\u0633",
      "lawOrFormula": "f'(x) = dy/dx",
      "questionText": "\u0623\u0648\u062C\u062F \u0645\u064A\u0644 \u0627\u0644\u0645\u0645\u0627\u0633 \u0644\u0645\u0646\u062D\u0646\u0649 \u0627\u0644\u062F\u0627\u0644\u0629 f(x) = 2x\xB2 - 5x + 4 \u0639\u0646\u062F \u0627\u0644\u0646\u0642\u0637\u0629 x = 3:",
      "choices": [
        { "key": "A", "text": "7" },
        { "key": "B", "text": "11" },
        { "key": "C", "text": "5" },
        { "key": "D", "text": "9" }
      ],
      "correctAnswer": "A",
      "points": 25,
      "explanation": "\u0627\u0644\u0645\u0634\u062A\u0642\u0629 f'(x) = 4x - 5. \u0628\u0627\u0644\u062A\u0639\u0648\u064A\u0636 \u0628\u0640 x = 3: f'(3) = 4(3) - 5 = 7."
    }
  ]
}`
  },
  {
    id: "latex-exam-template",
    title: "\u0648\u0631\u0642\u0629 \u0627\u0645\u062A\u062D\u0627\u0646 \u0623\u0643\u0627\u062F\u064A\u0645\u064A \u0645\u0646\u0633\u0642\u0629 (LaTeX / Markdown)",
    titleEn: "Academic Exam Sheet (Markdown / LaTeX)",
    category: "Academic & Print",
    language: "markdown",
    extension: "md",
    description: "\u062A\u0646\u0633\u064A\u0642 \u0623\u0643\u0627\u062F\u064A\u0645\u064A \u0641\u0627\u0626\u0642 \u0627\u0644\u062F\u0642\u0629 \u0645\u0646\u0627\u0633\u0628 \u0644\u0645\u0627\u062F\u062A\u064A \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0645\u0639 \u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0648\u0627\u0644\u0631\u0645\u0648\u0632 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0648\u0633\u0644\u0627\u0644\u0645 \u0627\u0644\u062F\u0631\u062C\u0627\u062A.",
    code: `# \u062B\u0627\u0646\u0648\u064A\u0629 \u0627\u0644\u0645\u062A\u0641\u0648\u0642\u064A\u0646 \u0644\u0644\u0639\u0644\u0648\u0645 \u0648\u0627\u0644\u062A\u0643\u0646\u0648\u0644\u0648\u062C\u064A\u0627
## \u0642\u0633\u0645 \u0627\u0644\u0639\u0644\u0648\u0645 \u0627\u0644\u062F\u0642\u064A\u0642\u0629 | \u0627\u0645\u062A\u062D\u0627\u0646 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u062D\u062F
### \u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B \u0627\u0644\u062B\u0627\u0646\u0648\u064A / \u0627\u0644\u062B\u0627\u0646\u064A \u0639\u0634\u0631 | \u0646\u0645\u0648\u0630\u062C \u0627\u0645\u062A\u062D\u0627\u0646\u064A \u062A\u0641\u0627\u0639\u0644\u064A
**\u0632\u0645\u0646 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646: 60 \u062F\u0642\u064A\u0642\u0629 | \u0627\u0644\u062F\u0631\u062C\u0629 \u0627\u0644\u0643\u0644\u064A\u0629: 100 \u062F\u0631\u062C\u0629**

---

### \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0635\u064A\u063A \u0627\u0644\u0645\u0631\u062C\u0639\u064A\u0629:
$$\\vec{F} = m \\cdot \\vec{a} \\quad , \\quad v^2 = v_0^2 + 2ad \\quad , \\quad V = I \\cdot R \\quad , \\quad \\frac{d}{dx}[x^n] = n x^{n-1} \\quad , \\quad \\int x^n dx = \\frac{x^{n+1}}{n+1}$$

---

### \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u0645\u0633\u0627\u0626\u0644 \u0627\u0644\u062D\u0633\u0627\u0628\u064A\u0629 (\u0627\u062E\u062A\u0631 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629):

**1. \u062A\u0624\u062B\u0631 \u0642\u0648\u0629 \u0623\u0641\u0642\u064A\u0629 \u062B\u0627\u0628\u062A\u0629 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 $F = 40\\text{ N}$ \u0639\u0644\u0649 \u0643\u062A\u0644\u0629 $m = 5\\text{ kg}$ \u0633\u0627\u0643\u0646\u0629 \u0639\u0644\u0649 \u0633\u0637\u062D \u0623\u0645\u0644\u0633\u060C \u0641\u0645\u0627 \u0633\u0631\u0639\u062A\u0647\u0627 \u0628\u0639\u062F \u0642\u0637\u0639 $d = 4\\text{ m}$\u061F**
- [x] \u0623) $8\\text{ m/s}$
- [ ] \u0628) $4\\text{ m/s}$
- [ ] \u062C) $16\\text{ m/s}$
- [ ] \u062F) $6.4\\text{ m/s}$

*\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062D\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A\u0629:* \u0627\u0644\u062A\u0633\u0627\u0631\u0639 $a = F/m = 40/5 = 8\\text{ m/s}^2$. \u0645\u0646 \u0645\u0639\u0627\u062F\u0644\u0629 \u0627\u0644\u062D\u0631\u0643\u0629: $v = \\sqrt{2ad} = \\sqrt{2 \\times 8 \\times 4} = \\sqrt{64} = 8\\text{ m/s}$.

---

**2. \u0627\u062D\u0633\u0628 \u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0643\u0627\u0645\u0644 \u0627\u0644\u0645\u062D\u062F\u0648\u062F: $\\int_{1}^{4} (3x^2 - 2x) dx$:**
- [x] \u0623) $48$
- [ ] \u0628) $63$
- [ ] \u062C) $45$
- [ ] \u062F) $52$

*\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062D\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A\u0629:* \u0627\u0644\u062F\u0627\u0644\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629 $F(x) = [x^3 - x^2]_1^4 = (4^3 - 4^2) - (1^3 - 1^2) = (64 - 16) - 0 = 48$.
`
  }
];

// src/hesham-exam/utils/examMetaHelper.ts
function resolveExamTitleAndGrade(params) {
  const { examTitle = "", instructions = "", examText = "" } = params;
  const combined = `${examTitle} ${instructions} ${examText.slice(0, 300)}`.trim();
  let detectedGrade = "";
  const gradePatterns = [
    { regex: /الصف\s+الثالث\s+الثانوي|ثانوية\s+عامة|تالتة\s+ثانوي|3rd\s*sec/i, name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B \u0627\u0644\u062B\u0627\u0646\u0648\u064A" },
    { regex: /الصف\s+الثاني\s+الثانوي|تانية\s+ثانوي|2nd\s*sec/i, name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0646\u064A \u0627\u0644\u062B\u0627\u0646\u0648\u064A" },
    { regex: /الصف\s+الأول\s+الثانوي|أولى\s+ثانوي|1st\s*sec/i, name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u062B\u0627\u0646\u0648\u064A" },
    { regex: /الصف\s+الثالث\s+الإعدادي|تالتة\s+إعدادي|شهادة\s+إعدادية/i, name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0644\u062B \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u064A" },
    { regex: /الصف\s+الثاني\s+الإعدادي|تانية\s+إعدادي/i, name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062B\u0627\u0646\u064A \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u064A" },
    { regex: /الصف\s+الأول\s+الإعدادي|أولى\s+إعدادي/i, name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u064A" },
    { regex: /الصف\s+السادس\s+الابتدائي|ساتة\s+ابتدائي/i, name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0633\u0627\u062F\u0633 \u0627\u0644\u0627\u0628\u062A\u062F\u0627\u0626\u064A" },
    { regex: /الصف\s+الخامس\s+الابتدائي|خامسة\s+ابتدائي/i, name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u062E\u0627\u0645\u0633 \u0627\u0644\u0627\u0628\u062A\u062F\u0627\u0626\u064A" },
    { regex: /الصف\s+الرابع\s+الابتدائي|رابعة\s+ابتدائي/i, name: "\u0627\u0644\u0635\u0641 \u0627\u0644\u0631\u0627\u0628\u0639 \u0627\u0644\u0627\u0628\u062A\u062F\u0627\u0626\u064A" }
  ];
  for (const p of gradePatterns) {
    if (p.regex.test(combined)) {
      detectedGrade = p.name;
      break;
    }
  }
  if (!detectedGrade) {
    const arbitraryGradeMatch = combined.match(/(الصف\s+[\u0621-\u064A\s]{3,25}(?:الابتدائي|الإعدادي|الثانوي)?)/);
    if (arbitraryGradeMatch && arbitraryGradeMatch[1]) {
      detectedGrade = arbitraryGradeMatch[1].trim();
    }
  }
  let detectedSubject = "";
  if (/فيزياء|physics/i.test(combined)) detectedSubject = "\u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621";
  else if (/كيمياء|chemistry/i.test(combined)) detectedSubject = "\u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0621";
  else if (/أحياء|بيولوجي|biology/i.test(combined)) detectedSubject = "\u0627\u0644\u0623\u062D\u064A\u0627\u0621";
  else if (/رياضيات|جبر|هندسة|تفاضل|تكامل|حساب\s*مثلثات|math/i.test(combined)) detectedSubject = "\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A";
  else if (/علوم|science/i.test(combined)) detectedSubject = "\u0627\u0644\u0639\u0644\u0648\u0645";
  else if (/عربي|لغة\s*عربية/i.test(combined)) detectedSubject = "\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629";
  else if (/إنجليزي|انجليزي|english/i.test(combined)) detectedSubject = "\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629";
  else if (/تاريخ/i.test(combined)) detectedSubject = "\u0627\u0644\u062A\u0627\u0631\u064A\u062E";
  else if (/جغرافيا/i.test(combined)) detectedSubject = "\u0627\u0644\u062C\u063A\u0631\u0627\u0641\u064A\u0627";
  else detectedSubject = "\u0627\u0644\u0639\u0644\u0648\u0645 \u0648\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A";
  let resolvedTitle = examTitle.trim();
  if (!resolvedTitle && instructions.trim()) {
    const titleMatch = instructions.match(/(?:امتحان|اختبار|تدريب|مراجعة)\s+[\u0621-\u064A0-9\s\-–]+/i);
    if (titleMatch) {
      resolvedTitle = titleMatch[0].trim();
    } else {
      resolvedTitle = instructions.split(/[،,\n\.]/)[0].trim();
    }
  }
  if (!resolvedTitle) {
    if (detectedGrade && detectedSubject) {
      resolvedTitle = `\u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064D \u0634\u0627\u0645\u0644 - ${detectedSubject} (${detectedGrade})`;
    } else if (detectedSubject) {
      resolvedTitle = `\u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064D \u062A\u0641\u0627\u0639\u0644\u064A - \u0645\u0627\u062F\u0629 ${detectedSubject}`;
    } else {
      resolvedTitle = "\u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064D \u062A\u0641\u0627\u0639\u0644\u064A \u0634\u0627\u0645\u0644";
    }
  }
  if (detectedGrade && !resolvedTitle.includes(detectedGrade)) {
    resolvedTitle = `${resolvedTitle} - ${detectedGrade}`;
  }
  let subheading = "";
  if (detectedGrade && detectedSubject) {
    subheading = `${detectedGrade} \u2022 \u0645\u0627\u062F\u0629 ${detectedSubject}`;
  } else if (detectedGrade) {
    subheading = detectedGrade;
  } else if (detectedSubject) {
    subheading = `\u0645\u0627\u062F\u0629 ${detectedSubject}`;
  } else {
    subheading = "\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0648\u0627\u0644\u0645\u0627\u062F\u0629 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629";
  }
  return {
    title: resolvedTitle,
    grade: detectedGrade,
    subject: detectedSubject,
    subheading
  };
}

// src/hesham-exam/utils/questionCountHelper.ts
function createSimulatedVariation(baseQ, variationIndex) {
  const multipliers = [2, 1.5, 0.5, 3, 4, 2.5];
  const mult = multipliers[variationIndex % multipliers.length];
  const qClone = JSON.parse(JSON.stringify(baseQ));
  qClone.questionAr = `[\u0645\u0633\u0623\u0644\u0629 \u0645\u062D\u0627\u0643\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0645\u062A\u0643\u0627\u0641\u0626 ${variationIndex + 1}]:
${qClone.questionAr}`;
  qClone.question = qClone.questionAr;
  if (qClone.questionEn) {
    qClone.questionEn = `[Simulated Parallel Problem ${variationIndex + 1}]:
${qClone.questionEn}`;
  }
  qClone.explanationAr = `[\u062A\u0637\u0628\u064A\u0642 \u0648\u0645\u062D\u0627\u0643\u0627\u0629 \u0644\u0646\u0641\u0633 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0648\u0627\u0644\u0645\u0641\u0647\u0648\u0645 \u0627\u0644\u0639\u0644\u0645\u064A]: ${qClone.explanationAr || "\u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0639\u0644\u0645\u064A \u0648\u0627\u0644\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628\u064A\u0629 \u0628\u062F\u0642\u0629."}`;
  qClone.explanation = qClone.explanationAr;
  return qClone;
}
function ensureExactQuestionCount(questions, targetCount, context = {}) {
  const target = Math.max(1, Math.min(100, targetCount || 7));
  let result = [...questions || []];
  if (result.length > target) {
    result = result.slice(0, target);
  }
  if (result.length < target && result.length > 0) {
    const initialAvailable = [...result];
    let varIndex = 1;
    while (result.length < target) {
      const sourceQ = initialAvailable[(varIndex - 1) % initialAvailable.length];
      const newSimulatedQ = createSimulatedVariation(sourceQ, varIndex);
      result.push(newSimulatedQ);
      varIndex++;
    }
  }
  const pointsPerQ = Math.round(100 / target);
  return result.slice(0, target).map((q, idx) => {
    const num = idx + 1;
    return {
      ...q,
      number: num,
      id: num,
      points: pointsPerQ
    };
  });
}

// server.ts
import_dotenv.default.config();
var currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, *"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(
  (0, import_cors.default)({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    credentials: true,
    maxAge: 86400
  })
);
app.options("*", (_req, res) => {
  res.status(204).end();
});
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
app.use((err, _req, res, next) => {
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message || "Invalid JSON payload in request."
    });
  }
  next();
});
function getGeminiClient(customApiKey) {
  const apiKey = customApiKey && customApiKey.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function isTransientModelError(err) {
  if (!err) return false;
  const status = err.status || err.code;
  const msg = (err.message || String(err)).toLowerCase();
  return status === 503 || status === 429 || status === "UNAVAILABLE" || status === "RESOURCE_EXHAUSTED" || msg.includes("503") || msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("exceeded") || msg.includes("rate-limit") || msg.includes("high demand") || msg.includes("spikes in demand") || msg.includes("temporarily unavailable") || msg.includes("overloaded");
}
function escapeHtml(str) {
  if (str === null || str === void 0) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function cleanLatexSymbols(formula) {
  if (!formula) return "";
  let s = String(formula);
  s = s.replace(/\\quad/g, "   ");
  s = s.replace(/\\qquad/g, "    ");
  s = s.replace(/\\[,;!]/g, " ");
  s = s.replace(/\\(text|mathrm|mathbf)\{([^}]+)\}/g, "$2");
  s = s.replace(/\\cdot/g, " \xB7 ");
  s = s.replace(/\\times/g, " \xD7 ");
  s = s.replace(/\\div/g, " \xF7 ");
  s = s.replace(/\\pm/g, " \xB1 ");
  s = s.replace(/\\approx/g, " \u2248 ");
  s = s.replace(/\\neq/g, " \u2260 ");
  s = s.replace(/\\leq/g, " \u2264 ");
  s = s.replace(/\\geq/g, " \u2265 ");
  s = s.replace(/\\to/g, " \u2192 ");
  s = s.replace(/\\infty/g, " \u221E ");
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)");
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "\u221A($1)");
  s = s.replace(/\\Delta/g, "\u0394");
  s = s.replace(/\\theta/g, "\u03B8");
  s = s.replace(/\\pi/g, "\u03C0");
  s = s.replace(/\\Omega/g, "\u03A9");
  s = s.replace(/\\mu/g, "\u03BC");
  s = s.replace(/\\lambda/g, "\u03BB");
  s = s.replace(/\\alpha/g, "\u03B1");
  s = s.replace(/\\beta/g, "\u03B2");
  s = s.replace(/\\Sigma/g, "\u2211");
  s = s.replace(/\\int/g, "\u222B");
  s = s.replace(/\^2\b/g, "\xB2");
  s = s.replace(/\^3\b/g, "\xB3");
  s = s.replace(/\^0\b/g, "\u2070");
  return s.trim();
}
function formatMathInText(text) {
  if (!text) return "";
  let res = text.replace(/\$([^$]+)\$/g, (_match, expr) => {
    const cleaned = cleanLatexSymbols(expr);
    return `<span class="math-display">$${cleaned}$</span>`;
  });
  res = res.replace(/`([^`]+)`/g, (_match, expr) => {
    const cleaned = cleanLatexSymbols(expr);
    return `<span class="math-display">$${cleaned}$</span>`;
  });
  return res;
}
function renderQuestionContent(text) {
  if (!text) return "";
  return formatMathInText(text);
}
function normalizeQuestions(rawList, targetCount, metaContext = {}) {
  let mapped = [];
  if (Array.isArray(rawList) && rawList.length > 0) {
    mapped = rawList.map((q, idx) => {
      const num = idx + 1;
      let questionAr = q.questionAr || q.question || q.text || `\u0645\u0633\u0623\u0644\u0629 \u0639\u0644\u0645\u064A\u0629 \u062A\u0637\u0628\u064A\u0642\u064A\u0629 \u0631\u0642\u0645 ${num}`;
      let questionEn = q.questionEn || q.question || `Applied Problem #${num}`;
      questionAr = questionAr.replace(/بالرجوع إلى الصورة المرفقة\s*،?/g, "").replace(/بالرجوع للصورة المرفقة\s*،?/g, "").replace(/في الصورة المرفقة\s*،?/g, "").replace(/كما في الصورة المرفقة\s*،?/g, "").replace(/وفقاً للملف المرفق\s*،?/g, "");
      questionEn = questionEn.replace(/referring to the attached image\s*,?/gi, "").replace(/as shown in the attached image\s*,?/gi, "").replace(/according to the attached file\s*,?/gi, "");
      if (q.diagramSvg && typeof q.diagramSvg === "string" && q.diagramSvg.includes("<svg")) {
        if (!questionAr.includes("<svg")) {
          questionAr += `
<div class="exam-diagram-container">${q.diagramSvg}</div>`;
        }
        if (!questionEn.includes("<svg")) {
          questionEn += `
<div class="exam-diagram-container">${q.diagramSvg}</div>`;
        }
      }
      if (q.tableHtml && typeof q.tableHtml === "string" && q.tableHtml.includes("<table")) {
        if (!questionAr.includes("<table")) {
          questionAr += `
<div class="exam-table-container">${q.tableHtml}</div>`;
        }
        if (!questionEn.includes("<table")) {
          questionEn += `
<div class="exam-table-container">${q.tableHtml}</div>`;
        }
      }
      let optsAr = [];
      if (Array.isArray(q.optionsAr) && q.optionsAr.length > 0) {
        optsAr = q.optionsAr.map(String);
      } else if (Array.isArray(q.options) && q.options.length > 0) {
        optsAr = q.options.map(String);
      } else {
        optsAr = ["\u0627\u0644\u062E\u064A\u0627\u0631 \u0623", "\u0627\u0644\u062E\u064A\u0627\u0631 \u0628", "\u0627\u0644\u062E\u064A\u0627\u0631 \u062C", "\u0627\u0644\u062E\u064A\u0627\u0631 \u062F"];
      }
      let optsEn = [];
      if (Array.isArray(q.optionsEn) && q.optionsEn.length > 0) {
        optsEn = q.optionsEn.map(String);
      } else if (Array.isArray(q.options) && q.options.length > 0) {
        optsEn = q.options.map(String);
      } else {
        optsEn = ["Option A", "Option B", "Option C", "Option D"];
      }
      let correctIdx = 0;
      if (typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < optsAr.length) {
        correctIdx = q.correctIndex;
      } else if (typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer < optsAr.length) {
        correctIdx = q.correctAnswer;
      } else if (typeof q.correct === "number" && q.correct >= 0 && q.correct < optsAr.length) {
        correctIdx = q.correct;
      } else if (q.correctAnswer !== void 0 && q.correctAnswer !== null) {
        const trimmed = String(q.correctAnswer).trim().toLowerCase();
        const parsedNum = parseInt(trimmed, 10);
        if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum < optsAr.length) {
          correctIdx = parsedNum;
        } else if (trimmed === "a" || trimmed === "\u0623" || trimmed === "1") correctIdx = 0;
        else if (trimmed === "b" || trimmed === "\u0628" || trimmed === "2") correctIdx = 1;
        else if (trimmed === "c" || trimmed === "\u062C" || trimmed === "3") correctIdx = 2;
        else if (trimmed === "d" || trimmed === "\u062F" || trimmed === "4") correctIdx = 3;
        else {
          const found = optsAr.findIndex((o) => {
            const oStr = String(o || "").toLowerCase();
            return oStr !== "" && oStr.includes(trimmed) || trimmed !== "" && trimmed.includes(oStr);
          });
          if (found !== -1) correctIdx = found;
        }
      }
      const explanationAr = q.explanationAr || q.explanation || "\u062D\u0644 \u0627\u0644\u0645\u0633\u0623\u0644\u0629 \u0628\u062E\u0637\u0648\u0627\u062A \u0631\u064A\u0627\u0636\u064A\u0629 \u0648\u0639\u0644\u0645\u064A\u0629 \u062F\u0642\u064A\u0642\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629.";
      const explanationEn = q.explanationEn || q.explanation || "Step-by-step mathematical derivation and formula application.";
      const points = q.points || Math.round(100 / Math.max(1, rawList.length));
      let category = q.category || "";
      let categoryLabel = "\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646";
      if (category === "function_and_graph" || category.includes("\u062F\u0627\u0644\u0629") || category.includes("\u0628\u064A\u0627\u0646") || q.diagramSvg && typeof q.diagramSvg === "string" && q.diagramSvg.includes("<svg")) {
        category = "function_and_graph";
        categoryLabel = "\u062F\u0627\u0644\u0629 \u0648\u0639\u0644\u0627\u0642\u0629 \u0628\u064A\u0627\u0646\u064A\u0629 \u0648\u062A\u0646\u0627\u0633\u0628";
      } else if (category === "practical_and_table" || category.includes("\u0639\u0645\u0644\u064A") || category.includes("\u062C\u062F\u0648\u0644") || q.tableHtml && typeof q.tableHtml === "string" && q.tableHtml.includes("<table")) {
        category = "practical_and_table";
        categoryLabel = "\u062A\u062C\u0631\u0628\u0629 \u0639\u0645\u0644\u064A\u0629 \u0648\u062C\u062F\u0648\u0644 \u0642\u064A\u0627\u0633\u0627\u062A";
      } else if (category === "interactive_reasoning" || category.includes("\u062A\u0641\u0627\u0639\u0644\u064A") || category.includes("\u0627\u0633\u062A\u0646\u062A\u0627\u062C")) {
        category = "interactive_reasoning";
        categoryLabel = "\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0648\u062A\u0637\u0628\u064A\u0642 \u062A\u0641\u0627\u0639\u0644\u064A";
      } else {
        category = "problem_and_law";
        categoryLabel = "\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646";
      }
      const lawOrFormula = q.lawOrFormula || q.formula || "";
      return {
        id: num,
        number: num,
        question: questionAr,
        questionAr,
        questionEn,
        type: q.type || "mcq",
        category,
        categoryLabel,
        lawOrFormula,
        options: optsAr,
        optionsAr: optsAr,
        optionsEn: optsEn,
        correctAnswer: correctIdx,
        correctIndex: correctIdx,
        explanation: explanationAr,
        explanationAr,
        explanationEn,
        points,
        diagramSvg: q.diagramSvg || null,
        tableHtml: q.tableHtml || null
      };
    });
  }
  return ensureExactQuestionCount(mapped, targetCount, metaContext);
}
function generateHtmlQuestionCards(questions) {
  return questions.map((q, idx) => {
    const optionsHtml = q.optionsAr.map((opt, optIdx) => `
          <label class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition text-xs md:text-sm bg-white">
            <input type="radio" name="q_${idx}" value="${optIdx}" onchange="selectAnswer(${idx}, ${optIdx})" class="w-4 h-4 text-teal-600 focus:ring-teal-500">
            <span class="font-medium text-slate-800">${formatMathInText(opt)}</span>
          </label>`).join("\n");
    const correctChoiceText = q.optionsAr[q.correctAnswer] || q.options[q.correctAnswer] || "";
    const catBadge = `
      <div class="flex flex-wrap items-center gap-1.5 mb-2.5">
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
          ${q.categoryLabel || "\u0645\u0633\u0623\u0644\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646"}
        </span>
        ${q.lawOrFormula ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono" dir="ltr">\u{1F4D0} ${q.lawOrFormula}</span>` : ""}
      </div>`;
    return `
      <!-- Question Card ${idx + 1} (Pre-rendered for instant visibility) -->
      <div class="bg-white teal-border-card p-5 md:p-6 transition shadow-sm" id="question-card-${idx}">
        ${catBadge}
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="font-bold text-slate-800 text-sm md:text-base leading-relaxed w-full">
            <span class="text-teal-600 font-extrabold ml-1">(${idx + 1})</span>
            <div id="q-text-${idx}" class="inline-block w-full">${renderQuestionContent(q.questionAr || q.question)}</div>
          </div>
          <span class="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[11px] font-bold shrink-0 border border-teal-200">
            ${q.points} \u062F\u0631\u062C\u0627\u062A
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3" id="q-options-${idx}">
${optionsHtml}
        </div>
        <div id="explanation-${idx}" class="hidden p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium">
          \u{1F4A1} <strong>\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629:</strong> <span id="q-correct-${idx}">${formatMathInText(correctChoiceText)}</span><br>
          <div class="text-slate-600 mt-1 block" id="q-expl-${idx}">${renderQuestionContent(q.explanationAr || q.explanation || "")}</div>
        </div>
      </div>`;
  }).join("\n\n");
}
function hydrateOfficialExamTemplate({
  code,
  questions,
  meta
}) {
  const totalQ = questions.length;
  const durationMins = meta.durationMinutes || 30;
  const durationSecs = durationMins * 60;
  let totalSections = 1;
  let questionsPerSection = totalQ;
  if (totalQ <= 4) {
    totalSections = 1;
    questionsPerSection = totalQ;
  } else if (totalQ <= 8) {
    totalSections = 2;
    questionsPerSection = Math.ceil(totalQ / 2);
  } else if (totalQ <= 12) {
    totalSections = 3;
    questionsPerSection = Math.ceil(totalQ / 3);
  } else if (totalQ <= 16) {
    totalSections = 4;
    questionsPerSection = Math.ceil(totalQ / 4);
  } else {
    totalSections = 5;
    questionsPerSection = Math.ceil(totalQ / 5);
  }
  const sectionTopics = [
    { ar: "\u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0648\u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0627\u062A", en: "Core Concepts & Fundamentals" },
    { ar: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0627\u062A", en: "Formulas & Applied Problems" },
    { ar: "\u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0648\u0627\u0644\u0627\u0633\u062A\u0646\u062A\u0627\u062C", en: "Analysis & Derivations" },
    { ar: "\u0627\u0644\u0645\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629", en: "Advanced Problem Solving" },
    { ar: "\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0634\u0627\u0645\u0644", en: "Comprehensive Evaluation" }
  ];
  const sections = [];
  for (let sIdx = 0; sIdx < totalSections; sIdx++) {
    const start = sIdx * questionsPerSection;
    const end = Math.min(totalQ, (sIdx + 1) * questionsPerSection);
    const secQuestions = questions.slice(start, end);
    if (secQuestions.length === 0) continue;
    const topic = sectionTopics[sIdx % sectionTopics.length];
    sections.push({
      id: `sec${sIdx + 1}`,
      title: {
        ar: `\u{1F539} \u0627\u0644\u062C\u0632\u0621 ${sIdx + 1}: ${topic.ar}`,
        en: `\u{1F539} Part ${sIdx + 1}: ${topic.en}`
      },
      questions: secQuestions.map((q) => {
        const rawOptionsAr = q.optionsAr && q.optionsAr.length >= 2 ? q.optionsAr : q.options || ["\u0623", "\u0628", "\u062C", "\u062F"];
        const rawOptionsEn = q.optionsEn && q.optionsEn.length >= 2 ? q.optionsEn : q.options || ["A", "B", "C", "D"];
        const paddedOptionsAr = [...rawOptionsAr];
        const paddedOptionsEn = [...rawOptionsEn];
        while (paddedOptionsAr.length < 4) {
          paddedOptionsAr.push(`\u062E\u064A\u0627\u0631 ${paddedOptionsAr.length + 1}`);
          paddedOptionsEn.push(`Option ${paddedOptionsEn.length + 1}`);
        }
        let correctIdx = 0;
        if (typeof q.correctAnswer === "number") {
          correctIdx = q.correctAnswer;
        } else if (typeof q.correctIndex === "number") {
          correctIdx = q.correctIndex;
        } else if (q.correctAnswer !== void 0 && q.correctAnswer !== null) {
          const letter = String(q.correctAnswer).trim().toLowerCase();
          if (letter === "a" || letter === "0" || letter === "\u0623") correctIdx = 0;
          else if (letter === "b" || letter === "1" || letter === "\u0628") correctIdx = 1;
          else if (letter === "c" || letter === "2" || letter === "\u062C") correctIdx = 2;
          else if (letter === "d" || letter === "3" || letter === "\u062F") correctIdx = 3;
          else {
            const foundIdx = paddedOptionsAr.findIndex((o) => String(o || "").includes(String(q.correctAnswer)));
            if (foundIdx >= 0) correctIdx = foundIdx;
          }
        }
        correctIdx = Math.min(paddedOptionsAr.length - 1, Math.max(0, correctIdx));
        const categoryLabel = q.categoryLabel || (q.category === "function_and_graph" ? "\u062F\u0627\u0644\u0629 \u0648\u0639\u0644\u0627\u0642\u0629 \u0628\u064A\u0627\u0646\u064A\u0629 \u0648\u062A\u0646\u0627\u0633\u0628" : q.category === "practical_and_table" ? "\u062A\u062C\u0631\u0628\u0629 \u0639\u0645\u0644\u064A\u0629 \u0648\u062C\u062F\u0648\u0644 \u0642\u064A\u0627\u0633\u0627\u062A" : q.category === "interactive_reasoning" ? "\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0648\u062A\u0637\u0628\u064A\u0642 \u062A\u0641\u0627\u0639\u0644\u064A" : "\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646");
        const categoryClass = q.category === "interactive_reasoning" ? "q-type-interactive" : q.category === "function_and_graph" ? "q-type-graph" : "";
        const formulaBadge = q.lawOrFormula ? `<span class="q-law-pill" title="\u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0631\u064A\u0627\u0636\u064A/\u0627\u0644\u0639\u0644\u0645\u064A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645">\u{1F4D0} ${q.lawOrFormula}</span>` : "";
        const catBadgeAr = `<div class="q-meta-badges"><span class="q-category-pill ${categoryClass}">${categoryLabel}</span>${formulaBadge}</div>`;
        const catBadgeEn = `<div class="q-meta-badges"><span class="q-category-pill ${categoryClass}">${q.category || "Applied Problem"}</span>${formulaBadge}</div>`;
        let questionTextAr = formatMathInText(q.questionAr || q.question || "");
        if (!questionTextAr.includes("q-category-pill")) {
          questionTextAr = catBadgeAr + questionTextAr;
        }
        let questionTextEn = formatMathInText(q.questionEn || q.question || "");
        if (!questionTextEn.includes("q-category-pill")) {
          questionTextEn = catBadgeEn + questionTextEn;
        }
        let explanationTextAr = q.explanationAr || q.explanation || "\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0637\u0628\u0642\u0627\u064B \u0644\u0644\u062E\u0637\u0648\u0627\u062A";
        if (q.lawOrFormula && !explanationTextAr.includes(q.lawOrFormula)) {
          explanationTextAr = `\u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${q.lawOrFormula}
${explanationTextAr}`;
        }
        return {
          q: {
            ar: questionTextAr,
            en: questionTextEn
          },
          options: paddedOptionsAr.slice(0, 4).map((opt, oIdx) => ({
            ar: formatMathInText(opt || ""),
            en: formatMathInText(paddedOptionsEn[oIdx] || opt || "")
          })),
          correct: correctIdx,
          answer: {
            ar: formatMathInText(explanationTextAr),
            en: formatMathInText(q.explanationEn || q.explanation || "Standard verified solution with steps")
          }
        };
      })
    });
  }
  const examDataFormatted = `const originalExamData = ${JSON.stringify({ sections }, null, 4)};`;
  code = code.replace(/const\s+originalExamData\s*=\s*\{[\s\S]*?\n\};/, examDataFormatted);
  const uniqueStorageKey = `hesham_exam_${Date.now().toString(36)}`;
  code = code.replace(/const\s+STORAGE_KEY\s*=\s*['"][^'"]*['"];/, `const STORAGE_KEY = '${uniqueStorageKey}';`);
  code = code.replace(/const\s+TOTAL_TIME\s*=\s*\d+;/, `const TOTAL_TIME = ${durationSecs};`);
  code = code.replace(/const\s+TOTAL_QUESTIONS\s*=\s*\d+;/, `const TOTAL_QUESTIONS = ${totalQ};`);
  code = code.replace(/const\s+TOTAL_SECTIONS\s*=\s*\d+;/, `const TOTAL_SECTIONS = ${sections.length};`);
  code = code.replace(/const\s+QUESTIONS_PER_SECTION\s*=\s*\d+;/, `const QUESTIONS_PER_SECTION = ${questionsPerSection};`);
  const titleAr = meta.examTitle || "\u0627\u0645\u062A\u062D\u0627\u0646 \u062A\u0641\u0627\u0639\u0644\u064A \u0634\u0627\u0645\u0644";
  const titleEn = "Interactive Exam: " + (titleAr.replace(/[^\w\s-]/g, "").trim() || "STEM Assessment");
  const subjectAr = meta.detectedSubject || "\u0627\u0644\u0639\u0644\u0648\u0645 \u0648\u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0621 \u0648\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A";
  const subjectEn = "STEM Curriculum & Educational Science";
  code = code.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(titleAr)} | Mr. Mohammed Hesham</title>`);
  code = code.replace(
    /(<h1[^>]*data-ar=["'])[^"']*(["'][^>]*data-en=["'])[^"']*(["'][^>]*>)([\s\S]*?)(<\/h1>)/i,
    `$1\u{1F4D0} ${escapeHtml(titleAr)}$2\u{1F4D0} ${escapeHtml(titleEn)}$3\u{1F4D0} ${escapeHtml(titleAr)}$5`
  );
  code = code.replace(
    /(<h2[^>]*data-ar=["'])[^"']*(["'][^>]*data-en=["'])[^"']*(["'][^>]*>)([\s\S]*?)(<\/h2>)/i,
    `$1${escapeHtml(subjectAr)}$2${escapeHtml(subjectEn)}$3${escapeHtml(subjectAr)}$5`
  );
  code = code.replace(
    /data-ar=["']⏰ المدة: \d+ دقيقة["']\s+data-en=["']⏰ Duration: \d+ min["']/i,
    `data-ar="\u23F0 \u0627\u0644\u0645\u062F\u0629: ${durationMins} \u062F\u0642\u064A\u0642\u0629" data-en="\u23F0 Duration: ${durationMins} min"`
  );
  code = code.replace(/<span>⏰ المدة: \d+ دقيقة<\/span>/i, `<span>\u23F0 \u0627\u0644\u0645\u062F\u0629: ${durationMins} \u062F\u0642\u064A\u0642\u0629</span>`);
  code = code.replace(/(<span\s+id=["']timer["'][^>]*>)\s*[\d:]+\s*(<\/span>)/i, `$1${String(durationMins).padStart(2, "0")}:00$2`);
  code = code.replace(
    /(©\s*<span\s+data-ar=["'])[^"']*(["']\s+data-en=["'])[^"']*(["']>)[^<]*(<\/span>)/i,
    `$1${escapeHtml(titleAr)}$2${escapeHtml(titleEn)}$3${escapeHtml(titleAr)}$4`
  );
  let formulaBoxesHtml = "";
  const providedFormulas = Array.isArray(meta.keyFormulas) ? meta.keyFormulas : [];
  if (providedFormulas.length > 0) {
    formulaBoxesHtml = providedFormulas.map((f) => {
      const title = f.titleAr || f.title || "\u0642\u0627\u0646\u0648\u0646 \u0648\u0635\u064A\u063A\u0629 \u0631\u064A\u0627\u0636\u064A\u0629";
      const cleaned = cleanLatexSymbols(f.formula || "");
      return `            <div class="formula-box">
                <span class="formula-title">\u{1F4D0} ${escapeHtml(title)}</span>
                <span class="formula-math">${formatMathInText(cleaned)}</span>
            </div>`;
    }).join("\n");
  } else {
    const questionLaws = Array.from(
      new Set(questions.map((q) => q.lawOrFormula).filter(Boolean))
    );
    if (questionLaws.length > 0) {
      formulaBoxesHtml = questionLaws.slice(0, 4).map((law, idx) => {
        const cleaned = cleanLatexSymbols(String(law));
        return `            <div class="formula-box">
                <span class="formula-title">\u{1F4D0} \u0635\u064A\u063A\u0629 \u0648\u0642\u0627\u0646\u0648\u0646 \u0645\u0633\u0623\u0644\u0629 (${idx + 1})</span>
                <span class="formula-math">${formatMathInText(cleaned)}</span>
            </div>`;
      }).join("\n");
    }
  }
  if (formulaBoxesHtml) {
    const freshBox = `<!-- \u{1F4DD} \u0635\u064A\u063A \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u0627\u0645\u062A\u062D\u0627\u0646 -->
    <div class="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-md border-2 border-teal-200 no-print" id="notes-formula-box">
        <h3 class="font-bold text-lg mb-3 text-teal-700 text-center" data-ar="\u{1F4D0} \u0627\u0644\u0642\u0648\u0627\u0639\u062F \u0648\u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0635\u064A\u063A \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0629 \u0648\u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0627\u0644\u0647\u0627\u0645\u0629" data-en="\u{1F4D0} Key Rules, Laws & Mathematical Formulas">\u{1F4D0} \u0627\u0644\u0642\u0648\u0627\u0639\u062F \u0648\u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0635\u064A\u063A \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0629 \u0648\u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0627\u0644\u0647\u0627\u0645\u0629</h3>
        <div class="grid md:grid-cols-2 gap-3 text-sm" id="notes-content">
${formulaBoxesHtml}
        </div>
    </div>

    <main`;
    code = code.replace(
      /<!--\s*📝\s*صيغ وقوانين أساسية للامتحان\s*-->[\s\S]*?<main/i,
      freshBox
    );
  } else {
    const defaultRulesHtml = `            <div class="formula-box">
                <span class="formula-title">\u{1F4D0} \u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u062F\u0631\u0633 (${escapeHtml(titleAr)})</span>
                <span class="formula-math">${escapeHtml(subjectAr)} \u2014 \u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0642\u0648\u0627\u0639\u062F \u0648\u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u062F\u0631\u0633</span>
            </div>
            <div class="formula-box">
                <span class="formula-title">\u{1F4D0} \u0625\u0631\u0634\u0627\u062F\u0627\u062A \u0627\u0644\u062D\u0644 \u0648\u0627\u0644\u0627\u0633\u062A\u0646\u062A\u0627\u062C</span>
                <span class="formula-math">\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0639\u0637\u064A\u0627\u062A \u0648\u0627\u0644\u0631\u0633\u0648\u0645\u0627\u062A \u0627\u0644\u0628\u064A\u0627\u0646\u064A\u0629 \u0648\u0627\u0644\u062A\u0639\u0648\u064A\u0636 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0641\u064A \u0627\u0644\u0642\u0627\u0639\u062F\u0629</span>
            </div>`;
    const fallbackBox = `<!-- \u{1F4DD} \u0635\u064A\u063A \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u0627\u0645\u062A\u062D\u0627\u0646 -->
    <div class="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-md border-2 border-teal-200 no-print" id="notes-formula-box">
        <h3 class="font-bold text-lg mb-3 text-teal-700 text-center" data-ar="\u{1F4D0} \u0627\u0644\u0642\u0648\u0627\u0639\u062F \u0648\u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0635\u064A\u063A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u0627\u0645\u062A\u062D\u0627\u0646" data-en="\u{1F4D0} Key Rules, Laws & Formulas">\u{1F4D0} \u0627\u0644\u0642\u0648\u0627\u0639\u062F \u0648\u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0635\u064A\u063A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u0627\u0645\u062A\u062D\u0627\u0646</h3>
        <div class="grid md:grid-cols-2 gap-3 text-sm" id="notes-content">
${defaultRulesHtml}
        </div>
    </div>

    <main`;
    code = code.replace(
      /<!--\s*📝\s*صيغ وقوانين أساسية للامتحان\s*-->[\s\S]*?<main/i,
      fallbackBox
    );
  }
  return code;
}
function hydrateExamCodeWithQuestions({
  baseTemplate,
  generatedCode,
  questions,
  meta
}) {
  const firstQText = questions.length > 0 ? (questions[0].questionAr || questions[0].question || "").slice(0, 15) : "";
  const hasHealthyGeneratedCode = generatedCode && generatedCode.length > 500 && !generatedCode.includes("const questions = [];") && !generatedCode.includes("const questions = []") && !generatedCode.includes('<div class="bg-white teal-border-card p-6 md:p-8 mb-8 text-center">\n    </div>') && questions.length > 0 && firstQText.length > 0 && generatedCode.includes(firstQText);
  let code = hasHealthyGeneratedCode ? generatedCode : baseTemplate;
  if (questions.length === 0) {
    return code;
  }
  if (code.includes("originalExamData")) {
    return hydrateOfficialExamTemplate({ code, questions, meta });
  }
  const questionsJson = JSON.stringify(questions, null, 2);
  const questionsJsRegex = /(const\s+questions\s*=\s*)\[[\s\S]*?\];/;
  if (questionsJsRegex.test(code)) {
    code = code.replace(questionsJsRegex, `$1${questionsJson};`);
  } else {
    const letQuestionsJsRegex = /(let\s+questions\s*=\s*)\[[\s\S]*?\];/;
    if (letQuestionsJsRegex.test(code)) {
      code = code.replace(letQuestionsJsRegex, `$1${questionsJson};`);
    }
  }
  const cardsHtml = generateHtmlQuestionCards(questions);
  const questionsListRegex = /(<div\s+id=["']questions-list["'][^>]*>)([\s\S]*?)(<\/div>)/i;
  if (questionsListRegex.test(code)) {
    code = code.replace(questionsListRegex, `$1
${cardsHtml}
    $3`);
  }
  if (meta.examTitle) {
    const titleRegex = /(<h1\s+id=["']exam-title-display["'][^>]*>)([\s\S]*?)(<\/h1>)/i;
    if (titleRegex.test(code)) {
      code = code.replace(titleRegex, `$1
          ${escapeHtml(meta.examTitle)}
        $3`);
    }
    const simpleTitleRegex = /(<h1\s+id=["']exam-title["'][^>]*>)([\s\S]*?)(<\/h1>)/i;
    if (simpleTitleRegex.test(code)) {
      code = code.replace(simpleTitleRegex, `$1${escapeHtml(meta.examTitle)}$3`);
    }
    const docTitleRegex = /(<title>)([\s\S]*?)(<\/title>)/i;
    if (docTitleRegex.test(code)) {
      code = code.replace(docTitleRegex, `$1${escapeHtml(meta.examTitle)}$3`);
    }
  }
  const durationMins = meta.durationMinutes || 30;
  code = code.replace(/let\s+durationMinutes\s*=\s*\d+;/, `let durationMinutes = ${durationMins};`);
  code = code.replace(/let\s+timerSeconds\s*=\s*durationMinutes\s*\*\s*60;/, `let timerSeconds = ${durationMins} * 60;`);
  code = code.replace(/(<span\s+id=["']timer["'][^>]*>)\s*\d+:\d+\s*(<\/span>)/i, `$1${String(durationMins).padStart(2, "0")}:00$2`);
  code = code.replace(/(<span\s+id=["']duration-val["'][^>]*>)[^<]*(<\/span>)/i, `$1${durationMins} \u062F\u0642\u064A\u0642\u0629$2`);
  code = code.replace(/(<span\s+id=["']q-count-badge["'][^>]*>)[^<]*(<\/span>)/i, `$1${questions.length} \u0623\u0633\u0626\u0644\u0629$2`);
  const emptyHeaderCardRegex = /<div\s+class=["']bg-white\s+teal-border-card\s+p-6\s+md:p-8\s+mb-8\s+text-center["']\s*>\s*<\/div>/i;
  if (emptyHeaderCardRegex.test(code) || !code.includes('id="exam-title-display"')) {
    const fullHeaderCard = `
    <!-- Main Header Card -->
    <div class="bg-white teal-border-card p-6 md:p-8 mb-8 text-center">
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="text-amber-500 text-2xl font-black">\u26A1</span>
        <h1 id="exam-title-display" class="text-2xl md:text-3xl font-black text-slate-800">
          ${escapeHtml(meta.examTitle || "\u0627\u062E\u062A\u0628\u0627\u0631 \u062A\u0641\u0627\u0639\u0644\u064A \u062C\u062F\u064A\u062F")}
        </h1>
      </div>
      
      <p id="exam-subtitle-display" class="text-cyan-600 font-bold text-sm md:text-base mb-1">
        ${escapeHtml(meta.examTitle || "\u0627\u0645\u062A\u062D\u0627\u0646 \u062A\u0641\u0627\u0639\u0644\u064A")} - \u0623\u0633\u0626\u0644\u0629 \u0648\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u062A\u0641\u0627\u0639\u0644\u064A\u0629
      </p>
      
      <p id="exam-description-display" class="text-xs text-slate-500 mb-3">
        \u0627\u062E\u062A\u0628\u0627\u0631 \u0644\u0642\u064A\u0627\u0633 \u0641\u0647\u0645 \u0648\u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0645\u0639 \u0627\u0644\u062A\u0635\u062D\u064A\u062D \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0648\u062D\u0641\u0638 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0648\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0644\u0644\u0645\u0639\u0644\u0645
      </p>

      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold mb-6 border border-teal-100">
        <span>\u{1F4BE}</span>
        <span id="save-progress-hint">\u064A\u062A\u0645 \u062D\u0641\u0638 \u062A\u0642\u062F\u0645\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B - <span id="q-count-badge">${questions.length} \u0623\u0633\u0626\u0644\u0629</span></span>
      </div>

      <!-- Student Fields Grid (\u0627\u0644\u0627\u0633\u0645\u060C \u0627\u0644\u0634\u0639\u0628\u0629\u060C \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u060C \u0627\u0644\u0645\u062F\u0629\u060C \u0627\u0644\u0645\u062C\u0645\u0648\u0639) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-semibold text-slate-700 pt-4 border-t border-teal-100">
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-date">\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E:</span>
          <span id="exam-date" class="text-teal-700 font-mono">2026/09/16</span>
        </div>
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-name">\u{1F60A} \u0627\u0644\u0627\u0633\u0645:</span>
          <input type="text" id="student-name" placeholder="\u0627\u0643\u062A\u0628 \u0627\u0633\u0645\u0643" class="custom-input text-teal-900 w-28 text-center text-xs font-bold">
        </div>
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-group">\u{1F3EB} \u0627\u0644\u0634\u0639\u0628\u0629:</span>
          <input type="text" id="student-group" placeholder="\u0627\u0644\u0634\u0639\u0628\u0629" class="custom-input text-teal-900 w-20 text-center text-xs font-bold">
        </div>
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-duration">\u23F0 \u0627\u0644\u0645\u062F\u0629:</span>
          <span id="duration-val" class="text-teal-700">${durationMins} \u062F\u0642\u064A\u0642\u0629</span>
        </div>
        <div class="flex items-center justify-center gap-1">
          <span id="lbl-total-marks">\u{1F4CA} \u0627\u0644\u0645\u062C\u0645\u0648\u0639:</span>
          <span class="text-teal-700 font-bold" id="total-marks-val">100 \u062F\u0631\u062C\u0629</span>
        </div>
      </div>
    </div>`;
    if (emptyHeaderCardRegex.test(code)) {
      code = code.replace(emptyHeaderCardRegex, fullHeaderCard);
    }
  }
  return code;
}
app.get(
  [
    "/api/health",
    "/api/health/",
    "/Records/api/health",
    "/Records/api/health/",
    "/Hesham-Exam/api/health",
    "/Hesham-Exam/api/health/"
  ],
  (_req, res) => {
    res.json({ status: "ok", service: "Hesham Exam API", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
);
app.post(
  [
    "/api/generate-exam-code",
    "/api/generate-exam-code/",
    "/Records/api/generate-exam-code",
    "/Records/api/generate-exam-code/",
    "/Hesham-Exam/api/generate-exam-code",
    "/Hesham-Exam/api/generate-exam-code/"
  ],
  async (req, res) => {
    try {
      const {
        images = [],
        // array of { mimeType: string, data: string (base64) }
        examText = "",
        // Direct text or questions provided by teacher
        templateCode,
        // the old template code
        templateType = "html",
        instructions = "",
        solveQuestions = true,
        examTitle = "",
        generationMode = "exact_extract",
        // "exact_extract" (default: المرجع هو الصورة والتنسيق مقتبس من الكود) | "generate_new_similar"
        questionCount = 7,
        durationMinutes = 30,
        difficulty = "same"
      } = req.body;
      const hasImages = Array.isArray(images) && images.length > 0;
      const hasText = typeof examText === "string" && examText.trim().length > 0;
      if (!hasImages && !hasText) {
        return res.status(400).json({
          success: false,
          error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0623\u0648 \u0645\u0644\u0641 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0623\u0648 \u0643\u062A\u0627\u0628\u0629 \u0646\u0635 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0648\u0627\u0644\u0623\u0633\u0626\u0644\u0629 (Please provide at least one image, document, or exam text)."
        });
      }
      const effectiveTemplate = templateCode && typeof templateCode === "string" && templateCode.trim() ? templateCode : CODE_TEMPLATES[0]?.code || "";
      const userApiKey = req.body.apiKey?.trim() || req.headers.authorization?.replace(/^Bearer\s+/i, "")?.trim() || "";
      const ai = getGeminiClient(userApiKey);
      const parts = [];
      if (hasText) {
        parts.push({
          text: `=== EXAM TEXT / DIRECT QUESTIONS / CONTENT PROVIDED BY TEACHER ===
${examText.trim()}

STRICT INSTRUCTION: Extract and formulate the questions directly from this provided text and content! Do NOT use generic or unrelated questions.`
        });
      }
      if (hasImages) {
        for (const img of images) {
          let base64Data = img.data || "";
          if (base64Data.includes(",")) {
            base64Data = base64Data.split(",")[1];
          }
          const mimeType = img.mimeType || "image/jpeg";
          if (mimeType.startsWith("text/")) {
            try {
              const decodedText = Buffer.from(base64Data, "base64").toString("utf-8");
              parts.push({
                text: `=== ATTACHED EXAM DOCUMENT/FILE CONTENT (${img.name || "Exam Document"}) ===
${decodedText}`
              });
              continue;
            } catch {
            }
          }
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data
            }
          });
        }
      }
      const isExactExtract = generationMode === "exact_extract";
      const preMeta = resolveExamTitleAndGrade({
        examTitle,
        instructions,
        examText
      });
      const systemPrompt = `You are "Hesham Exam AI Engine" - an elite educational AI engine specialized in deeply analyzing uploaded exam sheets, worksheets, and textbooks to generate interactive digital exams.

======================================================================
CRITICAL CORE DIRECTIVE: FULL SIMULATED EXAM GENERATION (\u062A\u0648\u0644\u064A\u062F \u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064A \u0628\u0627\u0644\u0643\u0627\u0645\u0644)
======================================================================
The teacher's absolute imperative rule:
"\u062A\u0630\u0643\u0631 \u062F\u0627\u0626\u0645\u0627 \u062F\u0648\u0631\u0643 \u0647\u0648 \u062A\u0648\u0644\u064A\u062F \u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064A \u0644\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629 \u0623\u0648 \u0627\u0644\u0627\u0633\u0626\u0644\u0629 \u0627\u0644\u0645\u0643\u062A\u0648\u0628\u0629 \u0623\u0648 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062F\u0631\u0633 \u0627\u0644\u0645\u0643\u062A\u0648\u0628"
"\u0645\u0637\u0644\u0648\u0628 \u062A\u0648\u0644\u064A\u062F \u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064A \u0644\u0646\u0641\u0633 \u0646\u0648\u0639 \u0627\u0644\u0627\u0633\u0626\u0644\u0629 \u0648\u0644\u064A\u0633 \u0643\u062A\u0627\u0628\u0629 \u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u0646 \u0645\u062E\u0643 \u0623\u0648 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0644\u0644\u0627\u0633\u0626\u0644\u0629 \u0641\u0642\u0637"
"\u0627\u0633\u0645 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0648\u0627\u0644\u0635\u0641 \u064A\u062A\u063A\u064A\u0631 \u062D\u0633\u0628 \u0645\u0627 \u0627\u0643\u062A\u0628\u0647 \u0627\u0646\u0627 \u0641\u064A \u062E\u0627\u0646\u0629 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A"
"\u062A\u0648\u0644\u064A\u062F \u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064A \u0643\u0627\u0645\u0644 \u0648\u0644\u064A\u0633 \u0646\u0641\u0633 \u0627\u0644\u0627\u0633\u0626\u0644\u0629"

1. \u0627\u0644\u062D\u0638\u0631 \u0627\u0644\u062A\u0627\u0645 \u0644\u0645\u062C\u0631\u062F \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u062D\u0631\u0641\u064A (NOT JUST EXTRACTION):
   \u0644\u0627 \u062A\u0642\u0645 \u0628\u0645\u062C\u0631\u062F \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0646\u0641\u0633\u0647\u0627 \u062D\u0631\u0641\u064A\u0627\u064B\u060C \u0628\u0644 \u0642\u0645 \u0628\u062A\u0648\u0644\u064A\u062F \u0623\u0633\u0626\u0644\u0629 \u0648\u0645\u0633\u0627\u0626\u0644 \u062C\u062F\u064A\u062F\u0629 \u0645\u062D\u0627\u0643\u064A\u0629 \u0644\u0646\u0641\u0633 \u0627\u0644\u0641\u0643\u0631\u0629 \u0648\u0627\u0644\u0646\u0648\u0639 \u0648\u0627\u0644\u0642\u0627\u0646\u0648\u0646.

2. \u0627\u0644\u062D\u0638\u0631 \u0627\u0644\u062A\u0627\u0645 \u0644\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0639\u0634\u0648\u0627\u0626\u064A\u0629 \u0645\u0646 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 (NOT WRITING UNRELATED QUESTIONS FROM YOUR HEAD):
   \u0645\u0645\u0646\u0648\u0639 \u0627\u062E\u062A\u0631\u0627\u0639 \u0623\u0633\u0626\u0644\u0629 \u0639\u0627\u0645\u0629 \u0623\u0648 \u062A\u0627\u0641\u0647\u0629 \u0645\u0646 \u0645\u062E\u0643 \u0644\u0627 \u0639\u0644\u0627\u0642\u0629 \u0644\u0647\u0627 \u0628\u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0648\u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629 \u0628\u0627\u0644\u0635\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0646\u0635.

3. \u0627\u0644\u062F\u0648\u0631 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062F\u0642\u0629: \u062A\u0648\u0644\u064A\u062F \u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064D \u0643\u0627\u0645\u0644 \u0645\u062A\u0643\u0627\u0641\u0626 (TRUE PARALLEL SIMULATION):
   - \u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0639\u0645\u064A\u0642 \u0644\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629 (\u0635\u0648\u0631\u0629 / \u0646\u0635 / \u0639\u0646\u0648\u0627\u0646 \u062F\u0631\u0633).
   - \u0627\u0633\u062A\u062E\u0631\u062C: \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0627\u0644\u0639\u0644\u0645\u064A\u0629\u060C \u0627\u0644\u062F\u0648\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u064A\u0629\u060C \u0627\u0644\u062A\u062C\u0627\u0631\u0628 \u0648\u062C\u062F\u0627\u0648\u0644 \u0627\u0644\u0642\u064A\u0627\u0633\u0627\u062A\u060C \u0648\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062A\u0641\u0643\u064A\u0631.
   - \u0642\u0645 \u0628\u0627\u0628\u062A\u0643\u0627\u0631 \u0645\u0633\u0627\u0626\u0644 \u0648\u0623\u0633\u0626\u0644\u0629 \u062C\u062F\u064A\u062F\u0629 \u062A\u0645\u0627\u0645\u0627\u064B \u0645\u062D\u0627\u0643\u064A\u0629 \u0644\u0646\u0641\u0633 \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0646\u0641\u0633 \u0627\u0644\u0623\u0633\u0644\u0648\u0628 \u0648\u0627\u0644\u0635\u0639\u0648\u0628\u0629 (\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0645\u0639\u0637\u064A\u0627\u062A \u0627\u0644\u0631\u0642\u0645\u064A\u0629\u060C \u0639\u0643\u0633 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u060C \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0633\u064A\u0646\u0627\u0631\u064A\u0648 \u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0626\u064A/\u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0626\u064A/\u0627\u0644\u0631\u064A\u0627\u0636\u064A).
   - \u0625\u0630\u0627 \u0643\u062A\u0628 \u0627\u0644\u0645\u0639\u0644\u0645 \u0639\u0646\u0648\u0627\u0646 \u062F\u0631\u0633 \u0623\u0648 \u0645\u0648\u0636\u0648\u0639 \u0641\u064A \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0623\u0648 \u0627\u0644\u0646\u0635 (\u0645\u062B\u0644: "\u0642\u0627\u0646\u0648\u0646 \u0643\u064A\u0631\u0634\u0648\u0641"\u060C "\u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0627\u0644\u062E\u0637\u064A\u0629"\u060C "\u0627\u0644\u062E\u0644\u064A\u0629 \u0627\u0644\u062C\u0644\u0641\u0627\u0646\u064A\u0629")\u060C \u0627\u0628\u0646\u0650 \u0627\u0645\u062A\u062D\u0627\u0646\u0627\u064B \u0645\u062D\u0627\u0643\u064A\u0627\u064B \u0645\u0643\u062B\u0641\u0627\u064B \u064A\u062F\u0648\u0631 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u062D\u0648\u0644 \u0630\u0644\u0643 \u0627\u0644\u062F\u0631\u0633.

4. \u0627\u0633\u0645 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0648\u0627\u0644\u0635\u0641 \u0627\u0644\u062F\u0631\u0627\u0633\u064A (EXAM TITLE & GRADE MANDATE):
   - Target Exam Title: "${preMeta.title}"
   - Target Grade / Class: "${preMeta.grade || "\u0645\u062D\u062F\u062F \u0645\u0646 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u0639\u0644\u0645"}"
   - Target Subheading: "${preMeta.subheading}"
   - Teacher Notes / Instructions: "${instructions || "\u062A\u0648\u0644\u064A\u062F \u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064D \u0645\u062A\u0643\u0627\u0645\u0644 \u0644\u0646\u0641\u0633 \u0646\u0648\u0639 \u0648\u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u0623\u0633\u0626\u0644\u0629"}"
   - \u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0627\u0628\u0642 'examTitle' \u0641\u064A \u0645\u062E\u0631\u062C\u0627\u062A JSON \u0627\u0633\u0645 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0648\u0627\u0644\u0635\u0641 \u0643\u0645\u0627 \u062D\u062F\u062F\u0647 \u0627\u0644\u0645\u0639\u0644\u0645: "${preMeta.title}".

5. \u0627\u0644\u062D\u0638\u0631 \u0627\u0644\u062A\u0627\u0645 \u0644\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0646\u0638\u0631\u064A\u0629 \u0627\u0644\u0645\u0635\u0645\u062A\u0629 \u0623\u0648 \u0627\u0644\u0639\u0628\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u0646\u0634\u0627\u0626\u064A\u0629 \u0627\u0644\u0628\u062D\u062A\u0629:
   - \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0644\u0627 \u064A\u0646\u0628\u063A\u0649 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0643\u0644\u0647\u0627 \u0646\u0638\u0631\u064A\u0629 \u0645\u0635\u0645\u062A\u0629 \u0623\u0648 \u0639\u0628\u0627\u0631\u0627\u062A \u0633\u0631\u062F\u064A\u0629 \u0623\u0648 \u062A\u0639\u0631\u064A\u0641\u0627\u062A \u0645\u062C\u0631\u062F\u0629 (\u0645\u062B\u0644: "\u0623\u064A \u0627\u0644\u0639\u0628\u0627\u0631\u0627\u062A \u0627\u0644\u0622\u062A\u064A\u0629 \u0635\u062D\u064A\u062D\u0629\u061F" \u0623\u0648 \u0623\u0633\u0626\u0644\u0629 \u062D\u0641\u0638 \u0648\u062A\u0644\u0642\u064A\u0646).
   - \u064A\u062C\u0628 \u0623\u0646 \u062A\u0631\u0643\u0632 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0639\u0644\u0649: [\u0645\u0633\u0627\u0626\u0644 \u062D\u0633\u0627\u0628\u064A\u0629 \u062F\u0642\u064A\u0642\u0629] + [\u062F\u0648\u0627\u0644 \u0648\u062A\u063A\u064A\u0631\u0627\u062A] + [\u0639\u0644\u0627\u0642\u0627\u062A \u0628\u064A\u0627\u0646\u064A\u0629 \u0648\u062A\u0646\u0627\u0633\u0628\u0627\u062A] + [\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0639\u0644\u0645\u064A\u0629 \u0648\u0631\u064A\u0627\u0636\u064A\u0629] + [\u062A\u062C\u0627\u0631\u0628 \u0639\u0645\u0644\u064A\u0629 \u0648\u062C\u062F\u0627\u0648\u0644 \u0642\u064A\u0627\u0633\u0627\u062A].

6. \u0627\u0644\u0634\u0645\u0648\u0644 \u0648\u0627\u0644\u062A\u0646\u0648\u0639 \u0627\u0644\u0625\u0644\u0632\u0627\u0645\u064A \u0644\u062C\u0645\u064A\u0639 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 (MANDATORY COMPREHENSIVE DIVERSITY):
   - [\u0627\u0644\u0646\u0648\u0639 1: \u0645\u0633\u0627\u0626\u0644 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0648\u0627\u0646\u064A\u0646] (problem_and_law)
   - [\u0627\u0644\u0646\u0648\u0639 2: \u062F\u0648\u0627\u0644 \u0648\u0639\u0644\u0627\u0642\u0627\u062A \u0628\u064A\u0627\u0646\u064A\u0629 \u0648\u062A\u0646\u0627\u0633\u0628\u0627\u062A] (function_and_graph) \u0645\u0639 \u0631\u0633\u0645 \u0628\u064A\u0627\u0646\u064A SVG \u0628\u062F\u0627\u062E\u0644 'diagramSvg'.
   - [\u0627\u0644\u0646\u0648\u0639 3: \u0623\u0633\u0626\u0644\u0629 \u0639\u0645\u0644\u064A\u0629 \u0648\u062A\u062C\u0627\u0631\u0628 \u0645\u0639\u0645\u0644\u064A\u0629 \u0648\u062C\u062F\u0627\u0648\u0644 \u0642\u064A\u0627\u0633\u0627\u062A] (practical_and_table) \u0645\u0639 \u062C\u062F\u0648\u0644 HTML \u0628\u062F\u0627\u062E\u0644 'tableHtml'.
   - [\u0627\u0644\u0646\u0648\u0639 4: \u0623\u0633\u0626\u0644\u0629 \u0627\u0633\u062A\u0646\u062A\u0627\u062C\u064A\u0629 \u0648\u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0648\u0641\u0647\u0645 \u0644\u0644\u0639\u0644\u0627\u0642\u0627\u062A] (interactive_reasoning).

7. \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0642\u0627\u0626\u0645 \u0628\u0630\u0627\u062A\u0647 \u0648\u0645\u0643\u062A\u0645\u0644 \u0627\u0644\u0645\u0639\u0637\u064A\u0627\u062A \u062F\u0648\u0646 \u0623\u064A \u0625\u062D\u0627\u0644\u0629 \u062E\u0627\u0631\u062C\u064A\u0629 \u0644\u0644\u0635\u0648\u0631\u0629 (100% STANDALONE):
   - \u0627\u0644\u0637\u0627\u0644\u0628 \u064A\u0631\u0649 \u0635\u0641\u062D\u0629 \u0627\u0644\u0648\u064A\u0628 \u0641\u0642\u0637. \u064A\u064F\u0645\u0646\u0639 \u0643\u062A\u0627\u0628\u0629: "\u0643\u0645\u0627 \u0628\u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0629" \u0623\u0648 "\u0628\u0627\u0644\u0631\u062C\u0648\u0639 \u0644\u0644\u0645\u0644\u0641".
   - \u0627\u0630\u0643\u0631 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0648\u0627\u0644\u0645\u0639\u0637\u064A\u0627\u062A \u0645\u0628\u0627\u0634\u0631\u0629 \u0641\u064A \u0646\u0635 \u0627\u0644\u0633\u0624\u0627\u0644.

======================================================================
MANDATORY QUESTION COUNT REQUIREMENT: EXACTLY ${questionCount} QUESTIONS!
======================================================================
- The teacher explicitly requested an exam with EXACTLY ${questionCount} questions.
- You MUST generate EXACTLY ${questionCount} distinct, complete questions in the 'extractedQuestions' array (items from index 0 to ${questionCount - 1}).
- Under NO circumstances generate fewer than ${questionCount} questions (e.g. NEVER stop at 3 or 5 questions!).
- If the uploaded image or text only has 1 or 2 questions, your role is to generate SIMULATED PARALLEL questions on the same scientific laws, concepts, and formulas until the array contains EXACTLY ${questionCount} questions.
`;
      const promptText = `
=== ATTACHED EXAM IMAGES / FILES ===
(Carefully inspect and analyze the attached image/document parts above. Identify the subject, curriculum concepts, formulas, laws, graphs, tables, and numerical relations.)

=== MANDATORY QUESTION COUNT: EXACTLY ${questionCount} QUESTIONS ===
You MUST return EXACTLY ${questionCount} questions in the 'extractedQuestions' array. Do NOT stop early.

=== GENERATION MODE: ${isExactExtract ? "EXACT EXTRACTION (\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u062F\u0642\u064A\u0642 \u0644\u0644\u0645\u0633\u0627\u0626\u0644 \u0645\u0646 \u0627\u0644\u0635\u0648\u0631\u0629)" : "SIMILAR NEW QUESTIONS (\u062A\u0648\u0644\u064A\u062F \u0645\u0633\u0627\u0626\u0644 \u0648\u062F\u0648\u0627\u0644 \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 \u0646\u0641\u0633 \u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u0635\u0648\u0631\u0629)"} ===

=== MANDATORY INSTRUCTIONS ===
1. DO NOT make the questions all dry theoretical statements or rote definitions.
2. The exam MUST be comprehensive and include: quantitative problems with numbers & laws, functions & relations with graphs, practical experiment questions with data tables, and interactive conceptual deductions.
3. In 'keyFormulas': MANDATORY! Always provide 2-4 key rules, laws, mathematical/physical formulas, or core principles at the top of the page strictly relevant to the uploaded image/file/text (\u0648\u062C\u0648\u062F \u0627\u0644\u0642\u0648\u0627\u0639\u062F \u0648\u0627\u0644\u0635\u064A\u063A \u0623\u0639\u0644\u0649 \u0627\u0644\u0635\u0641\u062D\u0629). Even for non-math subjects, provide the 2-4 core grammatical/scientific rules tested in the exam.
4. SUPPORTING GRAPHICAL & PHYSICAL DIAGRAMS (\u0648\u062C\u0648\u062F \u0627\u0644\u0631\u0633\u0648\u0645\u0627\u062A \u0627\u0644\u062F\u0627\u0639\u0645\u0629 \u0644\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u064A\u0629 \u0648\u0627\u0644\u0641\u064A\u0632\u064A\u0627\u0626\u064A\u0629):
   - At least 40% to 60% of the generated questions MUST include supporting visual SVG illustrations inside 'diagramSvg' (such as graphical plots, coordinate curves, physics circuits, force/ray/magnetic field diagrams, geometric figures, or scientific apparatus) or 'tableHtml' (measurement tables).
   - Every question must have:
     * 'category': "problem_and_law" | "function_and_graph" | "practical_and_table" | "interactive_reasoning"
     * 'lawOrFormula': The rule, formula, or law applied in this question (mandatory for every question).
     * 'diagramSvg': Clean, complete inline SVG (<svg viewBox="0 0 380 150" class="exam-diagram" xmlns="http://www.w3.org/2000/svg">...</svg>) for supporting graphs, physics diagrams, circuits, vectors, optics, or geometry.
     * 'tableHtml': HTML table for questions with experimental measurements or data comparisons.
5. Target Questions Count: EXACTLY ${questionCount} questions.
6. Exam Duration: EXACTLY ${durationMinutes} minutes.
7. Exam Title: ${examTitle || "Auto-detect from curriculum topic"}.
8. Difficulty: ${difficulty === "same" ? "\u0646\u0641\u0633 \u0645\u0633\u062A\u0648\u0649 \u0635\u0639\u0648\u0628\u0629 \u0645\u0633\u0627\u0626\u0644 \u0627\u0644\u0635\u0648\u0631\u0629/\u0627\u0644\u0645\u0644\u0641" : difficulty}.
9. Additional instructions: ${instructions || "None"}.
`;
      parts.push({ text: promptText });
      const modelsToTry = [
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite-preview",
        "gemini-flash-latest"
      ];
      let lastError = null;
      let response = null;
      for (const modelName of modelsToTry) {
        try {
          console.log(`[Hesham Exam AI] Analyzing image/file with model: ${modelName}...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: parts,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              maxOutputTokens: 16384,
              responseSchema: {
                type: import_genai.Type.OBJECT,
                properties: {
                  examTitle: {
                    type: import_genai.Type.STRING,
                    description: "Title of the exam detected from the image/file topic"
                  },
                  detectedSubject: {
                    type: import_genai.Type.STRING,
                    description: "Detected subject (e.g. Mathematics, Chemistry, Physics, English, Arabic, History)"
                  },
                  keyFormulas: {
                    type: import_genai.Type.ARRAY,
                    description: "2 to 4 key mathematical or physical formulas, laws, or core rules strictly relevant to this exam's lesson. If the subject has no formulas, return [].",
                    items: {
                      type: import_genai.Type.OBJECT,
                      properties: {
                        titleAr: { type: import_genai.Type.STRING, description: "Title of the law in Arabic" },
                        titleEn: { type: import_genai.Type.STRING, description: "Title in English" },
                        formula: { type: import_genai.Type.STRING, description: "Formula or equation" }
                      },
                      required: ["titleAr", "formula"]
                    }
                  },
                  detectedLanguage: {
                    type: import_genai.Type.STRING,
                    description: "The code language, e.g., html, python, javascript, json"
                  },
                  suggestedFileName: {
                    type: import_genai.Type.STRING,
                    description: "Suggested file name with extension, e.g. exam_quiz.html or exam.py"
                  },
                  summary: {
                    type: import_genai.Type.STRING,
                    description: "A friendly Arabic summary explaining that questions were generated 100% from the image/file only, highlighting the variety of problems, functions, and laws"
                  },
                  extractedQuestions: {
                    type: import_genai.Type.ARRAY,
                    description: "Comprehensive list of questions covering quantitative problems, functions, graphs, tables, and laws",
                    items: {
                      type: import_genai.Type.OBJECT,
                      properties: {
                        number: { type: import_genai.Type.INTEGER },
                        question: { type: import_genai.Type.STRING },
                        questionAr: { type: import_genai.Type.STRING },
                        questionEn: { type: import_genai.Type.STRING },
                        type: { type: import_genai.Type.STRING, description: "mcq, true_false, essay, or coding" },
                        category: {
                          type: import_genai.Type.STRING,
                          description: "Category: 'problem_and_law' (\u0645\u0633\u0623\u0644\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642 \u0642\u0627\u0646\u0648\u0646), 'function_and_graph' (\u062F\u0627\u0644\u0629 \u0648\u0639\u0644\u0627\u0642\u0629 \u0628\u064A\u0627\u0646\u064A\u0629 \u0648\u062A\u0646\u0627\u0633\u0628), 'practical_and_table' (\u062A\u062C\u0631\u0628\u0629 \u0639\u0645\u0644\u064A\u0629 \u0648\u062C\u062F\u0648\u0644 \u0642\u064A\u0627\u0633\u0627\u062A), or 'interactive_reasoning' (\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0648\u062A\u0637\u0628\u064A\u0642 \u062A\u0641\u0627\u0639\u0644\u064A)"
                        },
                        lawOrFormula: {
                          type: import_genai.Type.STRING,
                          description: "The mathematical formula, function, or scientific law applied (e.g. 'V = I \xD7 R' or 'f(x) = ax\xB2 + bx + c' or 'F = m \xD7 a')"
                        },
                        diagramSvg: {
                          type: import_genai.Type.STRING,
                          description: "If the question tests a graph, function curve, circuit, geometric figure, or mechanism, provide a clean inline SVG (<svg viewBox='0 0 360 160' class='exam-diagram' xmlns='http://www.w3.org/2000/svg'>...</svg>) with axes, arrows, and labels."
                        },
                        tableHtml: {
                          type: import_genai.Type.STRING,
                          description: "If the question is based on experimental data, measurements, truth tables, or coordinates, provide a clean HTML table (<table class='exam-table'>...</table>) with header and data rows."
                        },
                        options: {
                          type: import_genai.Type.ARRAY,
                          items: { type: import_genai.Type.STRING }
                        },
                        optionsAr: {
                          type: import_genai.Type.ARRAY,
                          items: { type: import_genai.Type.STRING }
                        },
                        optionsEn: {
                          type: import_genai.Type.ARRAY,
                          items: { type: import_genai.Type.STRING }
                        },
                        correctAnswer: { type: import_genai.Type.STRING },
                        correctIndex: { type: import_genai.Type.INTEGER },
                        explanation: { type: import_genai.Type.STRING },
                        explanationAr: { type: import_genai.Type.STRING },
                        explanationEn: { type: import_genai.Type.STRING },
                        points: { type: import_genai.Type.NUMBER }
                      },
                      required: ["number", "question", "options"]
                    }
                  }
                },
                required: ["examTitle", "extractedQuestions", "summary"]
              }
            }
          });
          if (response && response.text) {
            console.log(`[Hesham Exam AI] Question extraction successful with model: ${modelName}`);
            break;
          }
        } catch (err) {
          lastError = err;
          const statusCode = err?.status || err?.code || 0;
          console.log(`[Hesham Exam AI] Model ${modelName} returned error (${statusCode}): ${err?.message || err}, switching to fallback model...`);
          if (isTransientModelError(err)) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }
      let parsedData = null;
      if (response && response.text) {
        const rawText = response.text || "";
        try {
          parsedData = JSON.parse(rawText);
        } catch (parseErr) {
          console.error("Failed to parse JSON response from Gemini, falling back to regex extraction", parseErr);
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
          }
        }
      }
      if (!parsedData || !parsedData.extractedQuestions || parsedData.extractedQuestions.length === 0) {
        return res.status(422).json({
          success: false,
          error: lastError?.message ? `\u062A\u0639\u0630\u0631 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0644\u0641/\u0627\u0644\u0635\u0648\u0631\u0629 \u0639\u0628\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (${lastError.message}). \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0623\u0648 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u0636\u0648\u062D \u0627\u0644\u0635\u0648\u0631\u0629/\u0627\u0644\u0646\u0635\u060C \u062D\u064A\u062B \u064A\u0645\u0646\u0639 \u0627\u0644\u0646\u0638\u0627\u0645 \u062A\u0648\u0644\u064A\u062F \u0623\u064A \u0623\u0633\u0626\u0644\u0629 \u062C\u0627\u0647\u0632\u0629 \u0645\u0646 \u062E\u0627\u0631\u062C \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062A.` : "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0623\u0648 \u0645\u062D\u0627\u0643\u0627\u0629 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062A. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u0636\u0648\u062D \u0627\u0644\u0635\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0645\u0644\u0641 \u0623\u0648 \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0631\u0641\u0642 \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062C\u062F\u062F\u0627\u064B."
        });
      }
      parsedData.generationMode = generationMode;
      const finalMeta = resolveExamTitleAndGrade({
        examTitle: parsedData.examTitle || examTitle,
        instructions: instructions || "",
        examText: examText || ""
      });
      parsedData.examTitle = finalMeta.title;
      const normalizedQuestions = normalizeQuestions(parsedData.extractedQuestions || [], questionCount, {
        topicHint: `${finalMeta.title} ${finalMeta.subheading} ${instructions || ""} ${examText || ""}`,
        examTitle: finalMeta.title,
        grade: finalMeta.grade,
        subject: finalMeta.subject
      });
      parsedData.extractedQuestions = normalizedQuestions;
      parsedData.generatedCode = hydrateExamCodeWithQuestions({
        baseTemplate: effectiveTemplate,
        generatedCode: "",
        questions: normalizedQuestions,
        meta: {
          examTitle: finalMeta.title,
          durationMinutes: durationMinutes || 30,
          questionCount: normalizedQuestions.length,
          difficulty,
          solveQuestions,
          detectedSubject: finalMeta.subheading,
          keyFormulas: parsedData.keyFormulas
        }
      });
      if (!parsedData.summary) {
        parsedData.summary = `\u062A\u0645 \u0628\u0646\u062C\u0627\u062D \u062A\u0648\u0644\u064A\u062F \u0627\u0645\u062A\u062D\u0627\u0646 \u0645\u062D\u0627\u0643\u064D \u0643\u0627\u0645\u0644 (${normalizedQuestions.length} \u0623\u0633\u0626\u0644\u0629) \u0644\u0640 "${finalMeta.title}" (${finalMeta.subheading}) \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u0642\u062F\u0645\u0629.`;
      }
      res.json({
        success: true,
        data: parsedData
      });
    } catch (err) {
      console.error("Error generating exam code:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0635\u0648\u0631\u0629 \u0648\u062A\u0648\u0644\u064A\u062F \u0643\u0648\u062F \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646."
      });
    }
  }
);
app.all(["/api/*", "/Records/api/*", "/Hesham-Exam/api/*"], (_req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found"
  });
});
app.use((err, _req, res, _next) => {
  console.error("Uncaught server error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err?.message || "Internal server error occurred."
  });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use("/Records", import_express.default.static(distPath));
    app.use("/Hesham-Exam", import_express.default.static(distPath));
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hesham Exam server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
var server_default = app;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
