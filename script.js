function parseGrammar(input) {
    let lines = input.trim().split('\n');
    let productions = {};

    lines.forEach(line => {
        let parts = line.split('→').map(s => s.trim());
        let left = parts[0];
        let right = parts[1].split('|').map(s => s.trim());

        productions[left] = right;
    });

    return productions;
}

function formatGrammar(productions) {
    let formatted = '';
    for (let nonTerminal in productions) {
        formatted += nonTerminal + ' → ' + productions[nonTerminal].join(' | ') + '\n';
    }
    return formatted.trim();
}

function removeEpsilon(productions) {
    let nullable = new Set();
    let newProductions = JSON.parse(JSON.stringify(productions));

    for (let nonTerminal in productions) {
        if (productions[nonTerminal].includes('ε')) {
            nullable.add(nonTerminal);
        }
    }

    for (let nonTerminal in newProductions) {
        newProductions[nonTerminal] = newProductions[nonTerminal].filter(rule => rule !== 'ε');

        let updatedRules = [...newProductions[nonTerminal]];
        newProductions[nonTerminal].forEach(rule => {
            if ([...nullable].some(nt => rule.includes(nt))) {
                let nullableCombinations = generateNullableCombinations(rule, nullable);
                updatedRules.push(...nullableCombinations);
            }
        });

        newProductions[nonTerminal] = [...new Set(updatedRules)];
    }

    return newProductions;
}

function generateNullableCombinations(rule, nullable) {
    let combinations = [rule];
    [...nullable].forEach(nt => {
        if (rule.includes(nt)) {
            combinations.push(rule.replace(nt, ''));
        }
    });
    return combinations.filter(r => r.length > 0);
}

function simplifyGrammar() {
    let inputGrammar = document.getElementById('grammarInput').value;
    let productions = parseGrammar(inputGrammar);

    let simplifiedGrammar = removeEpsilon(productions);

    document.getElementById('simplifiedOutput').textContent = formatGrammar(simplifiedGrammar);
}

function convertToCNF() {
    let inputGrammar = document.getElementById('grammarInput').value;
    let productions = parseGrammar(inputGrammar);

    let cnfGrammar = JSON.parse(JSON.stringify(productions));

    for (let nonTerminal in cnfGrammar) {
        cnfGrammar[nonTerminal] = cnfGrammar[nonTerminal].map(rule => {
            if (rule.length > 2) {
                let newRules = [];
                let currentRule = rule;

                while (currentRule.length > 2) {
                    let newNonTerminal = currentRule.slice(0, 2);
                    newRules.push(newNonTerminal);
                    currentRule = currentRule.slice(1);
                }

                newRules.push(currentRule);
                return newRules.join('');
            }
            return rule;
        });
    }

    document.getElementById('cnfOutput').textContent = formatGrammar(cnfGrammar);
}

function convertToGNF() {
    let inputGrammar = document.getElementById('grammarInput').value;
    let productions = parseGrammar(inputGrammar);

    let gnfGrammar = JSON.parse(JSON.stringify(productions));

    for (let nonTerminal in gnfGrammar) {
        gnfGrammar[nonTerminal] = gnfGrammar[nonTerminal].map(rule => {
            if (rule[0].toUpperCase() === rule[0]) {
                let firstNonTerminal = rule[0];
                let expandedRules = gnfGrammar[firstNonTerminal].map(subRule => subRule + rule.slice(1));
                return expandedRules;
            }
            return rule;
        }).flat();
    }

    document.getElementById('gnfOutput').textContent = formatGrammar(gnfGrammar);
}