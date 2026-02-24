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
code = code.replace(/text-slate-100/g, 'text-slate-900 dark:text-slate-100');
code = code.replace(/text-slate-200/g, 'text-slate-800 dark:text-slate-200');

// specifically fix "text-white" ONLY where it's used for headings and text, not in buttons that have bg-indigo-600
// It's safer to just replace all `text-white` with `text-slate-900 dark:text-white` 
// and then revert the ones used with colored backgrounds.
code = code.replace(/text-white/g, 'text-slate-900 dark:text-white');

// Revert fixed text-whites for primary colored buttons
code = code.replace(/bg-indigo-600(.*?)text-slate-900 dark:text-white/g, 'bg-indigo-600$1text-white');
code = code.replace(/bg-amber-500(.*?)text-slate-900 dark:text-white/g, 'bg-amber-500$1text-white');
code = code.replace(/text-slate-900 dark:text-white shadow-lg/g, 'text-white shadow-lg'); // active tabs
code = code.replace(/text-slate-900 dark:text-white font-black rounded-2xl/g, 'text-white font-black rounded-2xl'); // Settings update button

fs.writeFileSync('src/App.tsx', code);
console.log('Theme conversion applied.');
