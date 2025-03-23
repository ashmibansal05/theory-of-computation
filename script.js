// script.js
function parseGrammar(input) {
    let lines = input.trim().split('\n');
    let productions = {};
    lines.forEach(line => {
        let [left, right] = line.split('→').map(s => s.trim());
        productions[left] = right.split('|').map(s => s.trim());
    });
    return productions;
}

function formatGrammar(productions) {
    return Object.entries(productions)
        .map(([nt, rules]) => `${nt} → ${rules.join(' | ')}`)
        .join('\n');
}

// Enhanced epsilon removal with complete nullable handling
function removeEpsilon(productions) {
    let nullable = new Set();
    let changed = true;

    // Find all nullable non-terminals
    while (changed) {
        changed = false;
        for (let nt in productions) {
            if (!nullable.has(nt) && productions[nt].some(rule =>
                    rule === 'ε' || rule.split('').every(ch => nullable.has(ch)))) {
                nullable.add(nt);
                changed = true;
            }
        }
    }

    // Generate new productions
    let newProductions = {};
    for (let nt in productions) {
        let newRules = new Set();
        productions[nt].forEach(rule => {
            if (rule !== 'ε') {
                let combinations = generateCombinations(rule, nullable);
                combinations.forEach(combo => newRules.add(combo));
            }
        });
        newProductions[nt] = Array.from(newRules);
    }
    return newProductions;
}

function generateCombinations(rule, nullable) {
    let result = [''];
    for (let char of rule) {
        let newResult = [];
        for (let prefix of result) {
            newResult.push(prefix + char);
            if (nullable.has(char)) {
                newResult.push(prefix);
            }
        }
        result = newResult;
    }
    return result.filter(r => r.length > 0);
}

// Remove unreachable and unproductive symbols
function simplifyGrammar() {
    let input = document.getElementById('grammarInput').value;
    let productions = parseGrammar(input);

    // Step 1: Remove epsilon productions
    productions = removeEpsilon(productions);

    // Step 2: Remove unit productions
    let unitPairs = new Set();
    let changed = true;
    while (changed) {
        changed = false;
        for (let nt in productions) {
            let newRules = [];
            productions[nt].forEach(rule => {
                if (rule.length === 1 && /[A-Z]/.test(rule)) {
                    unitPairs.add(`${nt}→${rule}`);
                    productions[rule].forEach(r => newRules.push(r));
                    changed = true;
                } else {
                    newRules.push(rule);
                }
            });
            productions[nt] = [...new Set(newRules)];
        }
    }

    // Step 3: Remove unreachable symbols
    let reachable = new Set(['S']);
    changed = true;
    while (changed) {
        changed = false;
        for (let nt in productions) {
            if (reachable.has(nt)) {
                productions[nt].forEach(rule => {
                    rule.split('').forEach(ch => {
                        if (/[A-Z]/.test(ch) && !reachable.has(ch)) {
                            reachable.add(ch);
                            changed = true;
                        }
                    });
                });
            }
        }
    }
    for (let nt in productions) {
        if (!reachable.has(nt)) delete productions[nt];
    }

    document.getElementById('simplifiedOutput').textContent = formatGrammar(productions);
}

function convertToCNF() {
    let input = document.getElementById('grammarInput').value;
    let productions = parseGrammar(input);
    productions = removeEpsilon(productions);

    // Step 1: Add new start symbol
    let newStart = 'S0';
    productions[newStart] = ['S'];

    // Step 2: Replace terminals in rules longer than 1
    let terminalMap = {};
    let nextVar = 'A'.charCodeAt(0);
    for (let nt in productions) {
        productions[nt] = productions[nt].map(rule => {
            if (rule.length > 1) {
                let newRule = '';
                for (let char of rule) {
                    if (/[a-z]/.test(char)) {
                        if (!terminalMap[char]) {
                            terminalMap[char] = String.fromCharCode(nextVar++);
                            productions[terminalMap[char]] = [char];
                        }
                        newRule += terminalMap[char];
                    } else {
                        newRule += char;
                    }
                }
                return newRule;
            }
            return rule;
        });
    }

    // Step 3: Break rules longer than 2
    let newProductions = {};
    nextVar = 'A'.charCodeAt(0);
    for (let nt in productions) {
        let rules = [];
        productions[nt].forEach(rule => {
            if (rule.length <= 2) {
                rules.push(rule);
            } else {
                let current = rule;
                let lastNt = nt;
                while (current.length > 2) {
                    let newNt = String.fromCharCode(nextVar++);
                    newProductions[lastNt] = [current.slice(0, 1) + newNt];
                    lastNt = newNt;
                    current = current.slice(1);
                }
                newProductions[lastNt] = [current];
                rules.push(rule.slice(0, 1) + lastNt);
            }
        });
        newProductions[nt] = rules;
    }

    document.getElementById('cnfOutput').textContent = formatGrammar(newProductions);
}

function convertToGNF() {
    let input = document.getElementById('grammarInput').value;
    let productions = parseGrammar(input);
    productions = removeEpsilon(productions);

    // Step 1: Convert to proper form (A → aA1A2...)
    let newProductions = {};
    let nextVar = 'A'.charCodeAt(0);

    // Step 2: Ensure all productions start with terminal
    for (let nt in productions) {
        let newRules = [];
        productions[nt].forEach(rule => {
            if (/[a-z]/.test(rule[0])) {
                newRules.push(rule);
            } else if (rule.length === 1 && /[A-Z]/.test(rule)) {
                let tempNt = String.fromCharCode(nextVar++);
                newProductions[tempNt] = productions[rule];
                newRules.push(tempNt);
            } else {
                let tempNt = String.fromCharCode(nextVar++);
                newProductions[tempNt] = [rule];
                newRules.push(tempNt);
            }
        });
        newProductions[nt] = newRules;
    }

    // Step 3: Remove left recursion
    for (let nt in newProductions) {
        let rules = newProductions[nt];
        let nonRecursive = [];
        let recursive = [];

        rules.forEach(rule => {
            if (rule[0] === nt) {
                recursive.push(rule.slice(1));
            } else {
                nonRecursive.push(rule);
            }
        });

        if (recursive.length > 0) {
            let newNt = String.fromCharCode(nextVar++);
            newProductions[nt] = nonRecursive.map(r => r + newNt);
            newProductions[newNt] = recursive.map(r => r + newNt);
            newProductions[newNt].push('ε');
        }
    }

    document.getElementById('gnfOutput').textContent = formatGrammar(newProductions);
}
