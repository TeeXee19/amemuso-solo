const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Backgrounds
code = code.replace(/bg-\[#0b0d17\]/g, 'bg-slate-50 dark:bg-[#0b0d17]');
code = code.replace(/bg-\[#131521\]/g, 'bg-white dark:bg-[#131521]');
code = code.replace(/bg-\[#11131f\]/g, 'bg-slate-100 dark:bg-[#11131f]');

// Borders
code = code.replace(/border-white\/5(?!0)/g, 'border-slate-200 dark:border-white/5');
code = code.replace(/border-white\/10(?!0)/g, 'border-slate-300 dark:border-white/10');

// General Translucent Backgrounds
code = code.replace(/bg-white\/5(?!0)/g, 'bg-slate-200/50 dark:bg-white/5');
code = code.replace(/bg-white\/10(?!0)/g, 'bg-slate-200 dark:bg-white/10');

// Text Colors
code = code.replace(/text-slate-400/g, 'text-slate-500 dark:text-slate-400');
code = code.replace(/text-slate-100/g, 'text-slate-800 dark:text-slate-100');
code = code.replace(/text-slate-200/g, 'text-slate-800 dark:text-slate-200');

// text-white is tricky. We'll replace it and then fix the buttons.
code = code.replace(/text-white/g, 'text-slate-900 dark:text-white');

// specifically fix "text-white" ONLY where it's used for headings and text, not in buttons that have bg-indigo-600
code = code.replace(/bg-indigo-600(.*?)text-slate-900 dark:text-white/g, 'bg-indigo-600$1text-white');
// Revert active tabs
code = code.replace(/text-slate-900 dark:text-white shadow-lg/g, 'text-white shadow-lg');
// Revert update button
code = code.replace(/text-slate-900 dark:text-white font-black/g, 'text-white font-black');
// Revert the main background blur elements
code = code.replace(/border-slate-200 dark:border-white\/5 z-50/g, 'border-slate-200 dark:border-white/5 z-50 shadow-sm dark:shadow-none');

fs.writeFileSync('src/App.tsx', code);
console.log('Theme conversion applied to App.tsx.');
