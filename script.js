document.addEventListener('DOMContentLoaded', () => {
    const controls = {
        rowsA: document.getElementById('rowsA'),
        colsA: document.getElementById('colsA'),
        rowsB: document.getElementById('rowsB'),
        colsB: document.getElementById('colsB'),
        generateBtn: document.getElementById('generateBtn'),
        validationMsg: document.getElementById('validationMsg'),
        matrixContainer: document.getElementById('matrixContainer'),
        controlBtn: document.getElementById('controlBtn'),
        explanation: document.getElementById('explanation'),
        finalLogDiv: document.getElementById('finalLog'),
        logContent: document.getElementById('logContent'),
        modeToggle: document.getElementById('modeToggle'),
        presentationModeLabel: document.getElementById('presentationModeLabel'),
        interactiveModeLabel: document.getElementById('interactiveModeLabel'),
    };

    const numpad = {
        container: document.getElementById('customNumpad'),
        buttons: document.querySelectorAll('#customNumpad button'),
    };

    let activeInput = null;
    let state = {};

    function resetState(fullReset = true) {
        if (fullReset) {
            controls.matrixContainer.innerHTML = '';
            controls.validationMsg.textContent = '';
        }
        controls.explanation.innerHTML = 'Defina as dimensões e clique em "Gerar Matrizes".';
        controls.finalLogDiv.classList.add('hidden');
        controls.logContent.innerHTML = '';
        
        document.querySelectorAll('.matrix-cell[id^="c-"]').forEach(cell => cell.textContent = '?');
        clearAllHighlights();
        
        controls.controlBtn.textContent = 'Iniciar Cálculo';
        controls.controlBtn.disabled = true;
        
        state = {
            dims: {},
            mainStepIndex: -1,
            subStepIndex: -1,
            calculationSteps: [],
            values: {},
            logHistory: [],
            isFinished: false,
            lockedExplanationHTML: '',
            mode: controls.modeToggle.checked ? 'interactive' : 'presentation',
        };
    }
    
    function restartCalculation() {
        state.mainStepIndex = -1;
        state.subStepIndex = -1;
        state.isFinished = false;
        state.lockedExplanationHTML = '';
        state.logHistory = [];

        controls.explanation.innerHTML = 'Cálculo reiniciado. Clique para começar novamente.';
        controls.finalLogDiv.classList.add('hidden');
        controls.logContent.innerHTML = '';
        document.querySelectorAll('.matrix-cell[id^="c-"]').forEach(cell => cell.textContent = '?');
        clearAllHighlights();
        
        controls.controlBtn.textContent = 'Iniciar Cálculo';
        controls.controlBtn.disabled = false;
    }

    function validateDimensions() {
        const { colsA, rowsB } = getDimensionValues();
        if (colsA === rowsB) {
            controls.validationMsg.textContent = 'Dimensões válidas para multiplicação!';
            controls.validationMsg.className = 'text-center font-semibold mb-6 h-6 text-green-600';
            return true;
        } else {
            controls.validationMsg.innerHTML = `Inválido: Colunas de A (<b class="text-red-600">${colsA}</b>) devem ser iguais às Linhas de B (<b class="text-red-600">${rowsB}</b>).`;
            controls.validationMsg.className = 'text-center font-semibold mb-6 h-6 text-red-700';
            return false;
        }
    }

    function generateMatrices() {
        resetState();
        const isValid = validateDimensions();
        state.dims = getDimensionValues();
        const { rowsA, colsA, rowsB, colsB } = state.dims;

        const createMatrixGrid = (name, rows, cols, isInput = true) => {
            const grid = document.createElement('div');
            grid.id = `matrix${name}`;
            grid.className = 'matrix-grid';
            grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const cell = document.createElement(isInput ? 'input' : 'div');
                    cell.id = `${name.toLowerCase()}-${i}-${j}`;
                    cell.className = 'matrix-cell w-16 h-16 text-xl font-semibold text-center border-2 border-gray-300 rounded-md flex items-center justify-center';
                    if (isInput) {
                        cell.type = 'number';
                        cell.value = Math.floor(Math.random() * 10);
                        if (window.innerWidth < 768) {
                             cell.setAttribute('readonly', true);
                        }
                    } else {
                        cell.textContent = '?';
                        cell.classList.add('bg-gray-200');
                    }
                    grid.appendChild(cell);
                }
            }
            return grid;
        };

        controls.matrixContainer.innerHTML = '';
        controls.matrixContainer.appendChild(createMatrixGrid('A', rowsA, colsA));
        controls.matrixContainer.appendChild(document.createElement('span')).className = 'text-4xl font-light text-gray-500';
        controls.matrixContainer.lastChild.textContent = '×';
        controls.matrixContainer.appendChild(createMatrixGrid('B', rowsB, colsB));
        controls.matrixContainer.appendChild(document.createElement('span')).className = 'text-4xl font-light text-gray-500';
        controls.matrixContainer.lastChild.textContent = '=';
        controls.matrixContainer.appendChild(createMatrixGrid('C', rowsA, colsB, false));

        controls.controlBtn.disabled = !isValid;
    }

    function handleControlClick() {
        if (state.isFinished) {
            restartCalculation();
            return;
        }

        if (state.mainStepIndex === -1) {
            try {
                state.values = getMatrixValues();
                prepareCalculationSteps();
                state.mainStepIndex = 0;
                state.subStepIndex = 0;
                const { c_name } = state.calculationSteps[0];
                state.lockedExplanationHTML = `Calculando ${c_name}:\n`;
                renderCurrentStep();
                controls.controlBtn.textContent = state.mode === 'interactive' ? 'Verificar e Avançar' : 'Próximo Passo';
            } catch (error) {
                controls.explanation.innerHTML = `<span class="text-red-600 font-bold">${error.message}</span>`;
            }
            return;
        }
        
        if (state.mode === 'interactive') {
            validateCurrentStep();
        } else {
            const currentStep = state.calculationSteps[state.mainStepIndex].subSteps[state.subStepIndex];
            if (currentStep.isFinalSum) {
                document.getElementById(currentStep.c_id).textContent = currentStep.correctAnswer;
            }
            lockCurrentStep(currentStep);
            advanceToNextStep();
        }
    }

    function validateCurrentStep() {
        const currentStep = state.calculationSteps[state.mainStepIndex].subSteps[state.subStepIndex];
        const userInputEl = document.getElementById('stepInput');
        if (!userInputEl) return;

        const userValue = parseFloat(userInputEl.value);

        if (userValue === currentStep.correctAnswer) {
            if (currentStep.isFinalSum) {
                document.getElementById(currentStep.c_id).textContent = currentStep.correctAnswer;
            }
            lockCurrentStep(currentStep);
            advanceToNextStep();
        } else {
            userInputEl.classList.add('error');
            const errorMsgEl = document.getElementById('error-msg');
            if (errorMsgEl) errorMsgEl.textContent = 'Incorreto. Tente novamente!';
            setTimeout(() => userInputEl.classList.remove('error'), 500);
        }
    }
    
    function lockCurrentStep(step) {
        const solvedText = step.text + `<span class="font-bold text-green-600">${step.correctAnswer}</span>`;
        state.lockedExplanationHTML += solvedText + '\n';
        state.logHistory.push(solvedText.replace(/<[^>]*>/g, ''));
        if (step.isFinalSum) {
            state.logHistory.push('-----------------------');
        }
    }

    function advanceToNextStep() {
        state.subStepIndex++;
        if (state.subStepIndex >= state.calculationSteps[state.mainStepIndex].subSteps.length) {
            clearAllHighlights();
            state.mainStepIndex++;
            state.subStepIndex = 0;
            if (state.mainStepIndex < state.calculationSteps.length) {
                const { c_name } = state.calculationSteps[state.mainStepIndex];
                state.lockedExplanationHTML = `Calculando ${c_name}:\n`;
                state.logHistory.push(`\n--- ${c_name.replace(/<[^>]*>/g, '')} ---`);
            }
        }

        if (state.mainStepIndex >= state.calculationSteps.length) {
            finishCalculation();
        } else {
            renderCurrentStep();
        }
    }
    
    function renderCurrentStep() {
        clearAllHighlights();
        const currentStep = state.calculationSteps[state.mainStepIndex].subSteps[state.subStepIndex];
        currentStep.highlight();
        
        if (state.mode === 'interactive') {
            controls.explanation.innerHTML = state.lockedExplanationHTML + currentStep.text +
                `<input type="number" id="stepInput" class="step-input" />` +
                `<span id="error-msg" class="text-red-600 ml-2 font-semibold"></span>`;
            document.getElementById('stepInput')?.focus();
        } else { // Presentation mode
            const solvedText = currentStep.text + `<span class="font-bold text-green-600">${currentStep.correctAnswer}</span>`;
            controls.explanation.innerHTML = state.lockedExplanationHTML + solvedText;
        }
    }

    function finishCalculation() {
        state.isFinished = true;
        controls.explanation.innerHTML = `<span class="font-bold">Cálculo completo! O resultado está salvo.</span>`;
        controls.controlBtn.textContent = 'Reiniciar';
        controls.controlBtn.disabled = false;
        controls.logContent.innerHTML = state.logHistory.join('\n');
        controls.finalLogDiv.classList.remove('hidden');
    }

    function getDimensionValues() {
        return {
            rowsA: parseInt(controls.rowsA.value),
            colsA: parseInt(controls.colsA.value),
            rowsB: parseInt(controls.rowsB.value),
            colsB: parseInt(controls.colsB.value),
        };
    }

    function getMatrixValues() {
        const values = { a: [], b: [] };
        for (let i = 0; i < state.dims.rowsA; i++) {
            values.a[i] = [];
            for (let j = 0; j < state.dims.colsA; j++) {
                const val = parseFloat(document.getElementById(`a-${i}-${j}`).value);
                if (isNaN(val)) throw new Error('Matriz A contém valores não numéricos.');
                values.a[i][j] = val;
            }
        }
        for (let i = 0; i < state.dims.rowsB; i++) {
            values.b[i] = [];
            for (let j = 0; j < state.dims.colsB; j++) {
                const val = parseFloat(document.getElementById(`b-${i}-${j}`).value);
                if (isNaN(val)) throw new Error('Matriz B contém valores não numéricos.');
                values.b[i][j] = val;
            }
        }
        return values;
    }

    function prepareCalculationSteps() {
        const { a, b } = state.values;
        const { rowsA, colsA, colsB } = state.dims;
        state.calculationSteps = [];
        state.logHistory.push(`--- C11 ---`);

        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                const c_id = `c-${i}-${j}`;
                const c_name = `C<sub>${i+1}${j+1}</sub>`;
                const mainStep = { c_name, subSteps: [] };
                let productResults = [];

                for (let k = 0; k < colsA; k++) {
                    const a_id = `a-${i}-${k}`;
                    const b_id = `b-${k}-${j}`;
                    const a_val = a[i][k];
                    const b_val = b[k][j];
                    const product = a_val * b_val;
                    productResults.push(product);
                    const colorClass = k % 2 === 0 ? 'text-pair-1' : 'text-pair-2';
                    const highlightClass = k % 2 === 0 ? 'highlight-pair-1' : 'highlight-pair-2';

                    mainStep.subSteps.push({
                        text: `- Produto ${k+1} (<span class="${colorClass} font-bold">${a_val} × ${b_val}</span>): `,
                        correctAnswer: product,
                        highlight: () => {
                            document.getElementById(a_id).classList.add(highlightClass);
                            document.getElementById(b_id).classList.add(highlightClass);
                            document.getElementById(c_id).classList.add('highlight-result');
                        }
                    });
                }
                
                const runningTotal = productResults.reduce((sum, p) => sum + p, 0);
                mainStep.subSteps.push({
                    text: `- Soma Final (${productResults.join(' + ')}): `,
                    correctAnswer: runningTotal,
                    isFinalSum: true,
                    c_id: c_id,
                    highlight: () => {
                        document.getElementById(c_id).classList.add('highlight-result');
                    }
                });
                state.calculationSteps.push(mainStep);
            }
        }
    }

    function clearAllHighlights() {
        document.querySelectorAll('.matrix-cell').forEach(cell => {
            cell.classList.remove('highlight-result', 'highlight-pair-1', 'highlight-pair-2');
        });
    }
    
    function updateMode() {
        state.mode = controls.modeToggle.checked ? 'interactive' : 'presentation';
        if (state.isFinished || state.mainStepIndex > -1) {
            restartCalculation();
        }
        
        if (state.mode === 'interactive') {
            controls.interactiveModeLabel.classList.remove('text-gray-400');
            controls.interactiveModeLabel.classList.add('text-gray-700');
            controls.presentationModeLabel.classList.add('text-gray-400');
        } else {
            controls.presentationModeLabel.classList.remove('text-gray-400');
            controls.presentationModeLabel.classList.add('text-gray-700');
            controls.interactiveModeLabel.classList.add('text-gray-400');
        }
    }

    // --- LÓGICA DO TECLADO NUMÉRICO CUSTOMIZADO ---

    function showNumpad(inputElement) {
        if (window.innerWidth >= 768) return; 

        activeInput = inputElement;
        numpad.container.classList.remove('hidden');
        numpad.container.classList.add('fade-in-up');
        activeInput.value = ''; 
    }

    function hideNumpad() {
        numpad.container.classList.add('hidden');
        numpad.container.classList.remove('fade-in-up');
        activeInput = null;
    }

    function handleNumpadInput(e) {
        if (!activeInput) return;
        
        const key = e.target.dataset.key || e.target.textContent;
        let currentValue = activeInput.value;

        switch(key) {
            case 'done':
                hideNumpad();
                break;
            case 'clear':
                currentValue = '';
                break;
            case 'backspace':
                currentValue = currentValue.slice(0, -1);
                break;
            case '-':
                if (currentValue.length === 0) {
                    currentValue = '-';
                }
                break;
            default: // Números
                currentValue += key;
                break;
        }
        activeInput.value = currentValue;
    }

    controls.matrixContainer.addEventListener('click', (e) => {
        if (e.target.matches('.matrix-cell[type="number"]')) {
            showNumpad(e.target);
        }
    });

    numpad.buttons.forEach(btn => btn.addEventListener('click', handleNumpadInput));

    // --- FIM DA LÓGICA DO TECLADO ---

    controls.generateBtn.addEventListener('click', generateMatrices);
    controls.controlBtn.addEventListener('click', handleControlClick);
    controls.modeToggle.addEventListener('change', updateMode);
    
    document.addEventListener('keydown', (event) => {
         if (event.key === 'Enter' && document.activeElement.id === 'stepInput') {
             event.preventDefault();
             handleControlClick();
         }
    });

    [controls.rowsA, controls.colsA, controls.rowsB, controls.colsB].forEach(input => {
        input.addEventListener('input', validateDimensions);
    });
    
    generateMatrices();
});