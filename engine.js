// ценность: 
// 	пешка 1
// 	конь, слон 3
// 	ладья 5 
// 	ферзь 9
// 	мат 12

// как ходят: 
// 	пешка вперёд на 1 или 2(в начале)
// 	бьёт: 
// 		наискось

// 	конь буквой г
// 	бьёт: 
// 		так же

// 	слон косо
// 	бьёт:
// 		так же

// 	ладья прямо
// 	бьёт: 
// 		так же 

// 	ферзь косо и прямо 
// 	бьёт:
// 		так же 

// 	король косо и прямо на 1 клетку
// 	бьёт: 
// 		так же 

// доска:
const chessBoard = {
	A: [{}, {}, {}, {}, {}, {}, {}, {}],
	B: [{}, {}, {}, {}, {}, {}, {}, {}],
	C: [{}, {}, {}, {}, {}, {}, {}, {}],
	D: [{}, {}, {}, {}, {}, {}, {}, {}],
	E: [{}, {}, {}, {}, {}, {}, {}, {}],
	F: [{}, {}, {}, {}, {}, {}, {}, {}],
	G: [{}, {}, {}, {}, {}, {}, {}, {}],
	H: [{}, {}, {}, {}, {}, {}, {}, {}]
};

const rowNames = ["A", "B", "C", "D", "E", "F", "G", "H"]


let currentColor = 'w'; // 'w' или 'b'

// Текущая позиция фигур на доске

let currentDesk = {
	// Понятная структура: Ряд: [Колонка 0, 1, 2...]
	8: ['bR1', 'bN1', 'bB1', 'bQ', 'bK', 'bB2', 'bN2', 'bR2'],
	7: ['bP1', 'bP2', 'bP3', 'bP4', 'bP5', 'bP6', 'bP7', 'bP8'],
	6: [null, null, null, null, null, null, null, null],
	5: [null, null, null, null, null, null, null, null],
	4: [null, null, null, null, null, null, null, null],
	3: [null, null, null, null, null, null, null, null],
	2: ['wP1', 'wP2', 'wP3', 'wP4', 'wP5', 'wP6', 'wP7', 'wP8'],
	1: ['wR1', 'wN1', 'wB1', 'wQ', 'wK', 'wB2', 'wN2', 'wR2']
};

let changePosition = (desk, figure, newRow, newCol) => {
	let oldPos = searchPosition(desk, figure);
	if (!oldPos) return false;
	desk[oldPos.row][oldPos.col] = null;
	desk[newRow][newCol] = figure;
	return true;
}
// Найти позицию фигуры на доске
let searchPosition = (desk, figure) => {
	for (let row in desk) {
		for (let col = 0; col < desk[row].length; col++) {
			if (desk[row][col] === figure) {
				return { row: parseInt(row), col: col };
			}
		}
	}
	return null;
}

// Utility: глубокая копия (можно заменить на structuredClone, если доступен)
let cloneDesk = (desk) => JSON.parse(JSON.stringify(desk));

// Получить все фигуры заданного цвета; row возвращаем числом для удобства
let figuresByColor = (desk, color) => {
	let figures = [];
	for (let row in desk) {
		for (let col = 0; col < desk[row].length; col++) {
			let figure = desk[row][col];
			if (figure && figure[0] === color) {
				figures.push({ figure: figure, row: parseInt(row), col: col });
			}
		}
	}
	return figures;
}

// Применить ход (мутабельно): убирает фигуру с исходной клетки и ставит на целевую
let applyMove = (desk, move) => {
	let src = searchPosition(desk, move.figure);
	if (!src) return;
	desk[src.row][src.col] = null;
	let piece = move.figure;
	// Простая промоция пешки в ферзя при достижении последней линии
	if (piece[1] === 'P' && (move.row === 1 || move.row === 8)) {
		piece = piece[0] + 'Q';
	}
	desk[move.row][move.col] = piece;
};

// Базовые ценности фигур для SEE/оценки (без знака)
const PIECE_BASE = { 'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 1000 };
let getPieceBaseValue = (figure) => figure ? (PIECE_BASE[figure[1]] || 0) : 0;

// Проверить, атакуется ли клетка color (тот, кто атакует)
let isSquareAttacked = (desk, row, col, byColor) => {
	let enemyMoves = possibleMoves(figuresByColor(desk, byColor), desk);
	for (let m of enemyMoves) {
		if (m.row === row && m.col === col) return true;
	}
	return false;
};

// Возвращает массив атакующих фигур (массив объектов {figure, row, col, value})
let attackersOnSquare = (desk, row, col, byColor) => {
	let attacks = [];
	let moves = possibleMoves(figuresByColor(desk, byColor), desk);
	for (let m of moves) {
		if (m.row === row && m.col === col) {
			attacks.push({ figure: m.figure, row: m.row, col: m.col, from: searchPosition(desk, m.figure), val: getPieceBaseValue(m.figure) });
		}
	}
	return attacks;
};

// Простейшая SEE: симулирует серию взаимных взятий на клетке без учёта рентгеновских атак (упрощение)
let simpleSEE = (desk, targetRow, targetCol, moverColor) => {
	// moverColor — цвет той стороны, для которой мы оцениваем выгодность удержания/входа на клетку
	let side = moverColor;
	let opp = side === 'w' ? 'b' : 'w';
	let gains = [];
	// список атакующих значений для каждой стороны (меньший ход берёт первый)
	let attackersSide = attackersOnSquare(desk, targetRow, targetCol, side).map(a => getPieceBaseValue(a.figure)).sort((a,b)=>a-b);
	let attackersOpp = attackersOnSquare(desk, targetRow, targetCol, opp).map(a => getPieceBaseValue(a.figure)).sort((a,b)=>a-b);
	let turn = opp; // после хода moverColor атаковать будет opp
	let capturedValue = getPieceBaseValue(desk[targetRow] && desk[targetRow][targetCol] ? desk[targetRow][targetCol] : null);
	if (capturedValue === 0) {
		// если на клетке пусто (мы вошли туда ходом), считаем стоимость нашей фигуры (тот, кто сейчас стоит на клетке)
		// для простоты считаем, что mover поставил фигуру valMover
		// caller должен передать desk, где фигура уже стоит
		capturedValue = 0;
	}
	let iSide = 0, iOpp = 0;
	let net = 0; // для moverColor — положительное означает выгодно
	let lastCaptured = capturedValue;
	while (true) {
		if (turn === opp) {
			if (iOpp >= attackersOpp.length) break;
			let attackVal = attackersOpp[iOpp++];
			net -= lastCaptured; // opp берёт — наше значение уходит
			lastCaptured = attackVal;
			turn = side;
		} else {
			if (iSide >= attackersSide.length) break;
			let attackVal = attackersSide[iSide++];
			net += lastCaptured; // мы берём обратно — добавляем текущую захваченную стоимость
			lastCaptured = attackVal;
			turn = opp;
		}
	}
	return net;
};

// Фильтрация легальных ходов (убираем ходы, оставляющие короля под шахом)
let filterLegalMoves = (desk, color) => {
	let moves = possibleMoves(figuresByColor(desk, color), desk);
	let legal = [];
	for (let m of moves) {
		let tmp = cloneDesk(desk);
		applyMove(tmp, m);
		if (!isKingInCheck(tmp, color)) legal.push(m);
	}
	return legal;
};

let MyActualFigures = (desk) => {
	return figuresByColor(desk, currentColor);
}

let enemyActualFigures = (desk, color) => {
	// Если передан цвет — вернём фигуры именно этого цвета, иначе вернём противника currentColor
	let targetColor = color || (currentColor === 'w' ? 'b' : 'w');
	return figuresByColor(desk, targetColor);
} 



let possibleMoves = (figures, desk) => {
	let moves = [];
	for (let r in figures) {
		let figure = figures[r].figure;
		let row = figures[r].row;
		let col = figures[r].col;
		if (figure[1] === 'P') { // пешка
			let direction = figure[0] === 'w' ? 1 : -1;
			let startRow = figure[0] === 'w' ? 2 : 7;
			let newRow = parseInt(row) + direction;
			// Forward moves
			if (newRow >= 1 && newRow <= 8 && (!desk[newRow] || !desk[newRow][col])) {
				moves.push({ figure: figure, row: newRow, col: col });
				if (parseInt(row) === startRow) {
					let newRow2 = parseInt(row) + 2 * direction;
					if (!desk[newRow2] || !desk[newRow2][col]) {
						moves.push({ figure: figure, row: newRow2, col: col });
					}
				}
			}
			// Captures (diagonals)
			for (let dc of [-1, 1]) {
				let ccol = col + dc;
				if (newRow >= 1 && newRow <= 8 && ccol >= 0 && ccol <= 7) {
					if (desk[newRow] && desk[newRow][ccol] && desk[newRow][ccol][0] !== figure[0]) {
						moves.push({ figure: figure, row: newRow, col: ccol });
					}
				}
			}
		} 
		if (figure[1] === 'N') { // конь
			let knightMoves = [
				{ row: parseInt(row) + 2, col: col + 1 },
				{ row: parseInt(row) + 2, col: col - 1 },
				{ row: parseInt(row) - 2, col: col + 1 },
				{ row: parseInt(row) - 2, col: col - 1 },
				{ row: parseInt(row) + 1, col: col + 2 },
				{ row: parseInt(row) + 1, col: col - 2 },
				{ row: parseInt(row) - 1, col: col + 2 },
				{ row: parseInt(row) - 1, col: col - 2 }
			];
			for (let move of knightMoves) {
				if (move.row >= 1 && move.row <= 8 && move.col >= 0 && move.col <= 7 &&
					(!desk[move.row] || !desk[move.row][move.col] || desk[move.row][move.col][0] !== figure[0])) {
					moves.push({ figure: figure, ...move });
				}
			}
		}
		if (figure[1] === 'R') { // ладья
			// Горизонтальные и вертикальные ходы
			let directions = [
				{ row: 1, col: 0 }, { row: -1, col: 0 }, { row: 0, col: 1 }, { row: 0, col: -1 }
			];
			for (let dir of directions) {
				let newRow = parseInt(row) + dir.row;
				let newCol = col + dir.col;
				while (newRow >= 1 && newRow <= 8 && newCol >= 0 && newCol <= 7) {
					if (!desk[newRow] || !desk[newRow][newCol]) {
						moves.push({ figure: figure, row: newRow, col: newCol });
					} else if (desk[newRow][newCol][0] !== figure[0]) {
						moves.push({ figure: figure, row: newRow, col: newCol });
						break;
					} else {
						break;
					}
					newRow += dir.row;
					newCol += dir.col;
				}
			}
		}
		if (figure[1] === 'B') { // слон
			// Диагональные ходы
			let directions = [
				{ row: 1, col: 1 }, { row: 1, col: -1 }, { row: -1, col: 1 }, { row: -1, col: -1 }
			];
			for (let dir of directions) {
				let newRow = parseInt(row) + dir.row;
				let newCol = col + dir.col;
				while (newRow >= 1 && newRow <= 8 && newCol >= 0 && newCol <= 7) {
					if (!desk[newRow] || !desk[newRow][newCol]) {
						moves.push({ figure: figure, row: newRow, col: newCol });
					} else if (desk[newRow][newCol][0] !== figure[0]) {
						moves.push({ figure: figure, row: newRow, col: newCol });
						break;
					} else {
						break;
					}
					newRow += dir.row;
					newCol += dir.col;
				}
			}
		}
		if (figure[1] === 'Q') { // ферзь
			let directions = [
				{ row: 1, col: 0 }, { row: -1, col: 0 }, { row: 0, col: 1 }, { row: 0, col: -1 },
				{ row: 1, col: 1 }, { row: 1, col: -1 }, { row: -1, col: 1 }, { row: -1, col: -1 }
			];
			for (let dir of directions) {
				let newRow = parseInt(row) + dir.row;
				let newCol = col + dir.col;
				while (newRow >= 1 && newRow <= 8 && newCol >= 0 && newCol <= 7) {
					if (!desk[newRow] || !desk[newRow][newCol]) {
						moves.push({ figure: figure, row: newRow, col: newCol });
					} else if (desk[newRow][newCol][0] !== figure[0]) {
						moves.push({ figure: figure, row: newRow, col: newCol });
						break;
					} else {
						break;
					}
					newRow += dir.row;
					newCol += dir.col;
				}
			}
		}
		if (figure[1] === 'K') { // король
			let kingMoves = [
				{ row: parseInt(row) + 1, col: col },
				{ row: parseInt(row) - 1, col: col },
				{ row: parseInt(row), col: col + 1 },
				{ row: parseInt(row), col: col - 1 },
				{ row: parseInt(row) + 1, col: col + 1 },
				{ row: parseInt(row) + 1, col: col - 1 },
				{ row: parseInt(row) - 1, col: col + 1 },
				{ row: parseInt(row) - 1, col: col - 1 }
			];
			for (let move of kingMoves) {
				if (move.row >= 1 && move.row <= 8 && move.col >= 0 && move.col <= 7 &&
					(!desk[move.row] || !desk[move.row][move.col] || desk[move.row][move.col][0] !== figure[0])) {
					moves.push({ figure: figure, ...move });
				}
			}
		}
	}

	return moves;
}

let isKingInCheck = (desk, kingColor) => {
	let king = kingColor === 'w' ? 'wK' : 'bK';
	let kingPosition = searchPosition(desk, king);
	if (!kingPosition) return false;

	let enemy = kingColor === 'w' ? 'b' : 'w';
	let enemyFigures = figuresByColor(desk, enemy);
	let enemyMoves = possibleMoves(enemyFigures, desk);

	for (let move of enemyMoves) {
		if (move.row == kingPosition.row && move.col == kingPosition.col) {
			return true;
		}
	}
	return false;
};

let isCheckmate = (desk, kingColor) => {
	if (!isKingInCheck(desk, kingColor)) return false;

	let figures = figuresByColor(desk, kingColor);
	let moves = possibleMoves(figures, desk);

	for (let move of moves) {
		let tempDesk = cloneDesk(desk);
		applyMove(tempDesk, move);

		if (!isKingInCheck(tempDesk, kingColor)) {
			return false;
		}
	}
	return true;
};

let evaluatePosition = (figure, position, desk) => {
	// Ценность фигур
	const pieceValues = {
		'wP': 1, 'wN': 3, 'wB': 3, 'wR': 5, 'wQ': 9, 
		'bP': -1, 'bN': -3, 'bB': -3, 'bR': -5, 'bQ': -9, 
	};
    
	let temporalDesk = cloneDesk(desk);
	applyMove(temporalDesk, { figure: figure, row: position.row, col: position.col });

	// Проверяем, остается ли наш король под шахом
	if (isKingInCheck(temporalDesk, currentColor)) {
		return { figure: figure, position: position, value: -Infinity };
	}

	// Проверяем мат противнику
	if (isCheckmate(temporalDesk, currentColor === 'w' ? 'b' : 'w')) {
		return { figure: figure, position: position, value: Infinity };
	}

	let enemyPossibleMoves = possibleMoves(figuresByColor(temporalDesk, currentColor === 'w' ? 'b' : 'w'), temporalDesk);
	let score = 0;
	
	// Бонус, если противник в шахе
	if (isKingInCheck(temporalDesk, currentColor === 'w' ? 'b' : 'w')) {
		score += 5;
	}

	for (let move of enemyPossibleMoves) {
		let captured = temporalDesk[move.row][move.col];
		if (captured && captured[0] === currentColor) {
			score += pieceValues[captured.slice(0,2)] || 0;
		}
		let newDesk = cloneDesk(temporalDesk);
		applyMove(newDesk, move);

		let myPossibleMoves = possibleMoves(MyActualFigures(newDesk), newDesk);
		for (let myMove of myPossibleMoves) {
			let capturedMy = newDesk[myMove.row][myMove.col];
			if (capturedMy && capturedMy[0] !== currentColor) {
				score -= pieceValues[capturedMy.slice(0,2)] || 0;
			}
			let newDesk2 = cloneDesk(newDesk);
			applyMove(newDesk2, myMove);

let enemyPossibleMoves2 = possibleMoves(figuresByColor(newDesk2, currentColor === 'w' ? 'b' : 'w'), newDesk2);
				for (let move2 of enemyPossibleMoves2) {
					let captured2 = newDesk2[move2.row][move2.col];
					if (captured2 && captured2[0] === currentColor) {
						score += pieceValues[captured2.slice(0,2)] || 0;
					}
					let newDesk3 = cloneDesk(newDesk2);
					applyMove(newDesk3, move2);

				let myPossibleMoves2 = possibleMoves(figuresByColor(newDesk3, currentColor), newDesk3);
				for (let myMove2 of myPossibleMoves2) {
					let capturedMy2 = newDesk3[myMove2.row][myMove2.col];
					if (capturedMy2 && capturedMy2[0] !== currentColor) {
						score -= pieceValues[capturedMy2.slice(0,2)] || 0;
					}
					// console.log('приветdd')
				}
			}
		}
	}

	
	let returnScore = {figure: figure, position: position, value: score};
	
	return returnScore;
};

// Статическая оценка полной позиции с точки зрения perspectiveColor (положительное = выгодно для perspectiveColor)
let evaluateDesk = (desk, perspectiveColor) => {
	let score = 0;
	for (let row in desk) {
		for (let col = 0; col < desk[row].length; col++) {
			let piece = desk[row][col];
			if (!piece) continue;
			let val = getPieceBaseValue(piece);
			if (piece[0] === perspectiveColor) score += val;
			else score -= val;
		}
	}
	// бонус за мобильность (количество легальных ходов)
	let myMoves = filterLegalMoves(desk, perspectiveColor).length;
	let oppMoves = filterLegalMoves(desk, perspectiveColor === 'w' ? 'b' : 'w').length;
	score += 0.1 * (myMoves - oppMoves);
	// бонус/штраф за шах
	if (isKingInCheck(desk, perspectiveColor === 'w' ? 'b' : 'w')) score += 5; // если противник под шахом — хорошо для perspectiveColor
	if (isKingInCheck(desk, perspectiveColor)) score -= 5; // если наш король под шахом — плохо
	// обнаружение мата
	if (isCheckmate(desk, perspectiveColor === 'w' ? 'b' : 'w')) score += 10000;
	if (isCheckmate(desk, perspectiveColor)) score -= 10000;
	return score;
};

// Генерация только ходов‑взятий для квиеценции (quiescence)
let generateCaptureMoves = (desk, color) => {
	let moves = possibleMoves(figuresByColor(desk, color), desk);
	return moves.filter(m => desk[m.row] && desk[m.row][m.col]);
};

// Поиск квиеценции: углубляемся только по взятиям, чтобы избежать эффекта горизонта
let quiescence = (desk, alpha, beta, color) => {
	let stand_pat = evaluateDesk(desk, color);
	if (stand_pat >= beta) return beta;
	if (alpha < stand_pat) alpha = stand_pat;
	let captures = generateCaptureMoves(desk, color);
	// сортируем взятия по убыванию ценности захватываемой фигуры
	captures.sort((a,b)=> getPieceBaseValue(desk[b.row][b.col]) - getPieceBaseValue(desk[a.row][a.col]));
	for (let m of captures) {
		let tmp = cloneDesk(desk);
		applyMove(tmp, m);
		let score = -quiescence(tmp, -beta, -alpha, color === 'w' ? 'b' : 'w');
		if (score >= beta) return beta;
		if (score > alpha) alpha = score;
	}
	return alpha;
};

// Minimax с альфа‑бета (в стиле negamax). color — сторона, ходящая в текущем узле. rootColor — цвет перспективы для окончательной оценки.
let negamax = (desk, depth, alpha, beta, color, rootColor) => {
	if (depth === 0) {
		// используем квиеценцию, чтобы избежать эффекта горизонта при взятиях
		return quiescence(desk, alpha, beta, color === rootColor ? color : rootColor);
	} 
	let moves = filterLegalMoves(desk, color);
	if (moves.length === 0) {
		// checkmate or stalemate
		if (isKingInCheck(desk, color)) {
			return color === rootColor ? -10000 : 10000;
		}
		return 0;
	}
	// Упорядочивание ходов: сначала взятия (и сортировка с учётом SEE)
	moves.sort((a,b)=> {
		let aCap = (desk[a.row] && desk[a.row][a.col]) ? getPieceBaseValue(desk[a.row][a.col]) : 0;
		let bCap = (desk[b.row] && desk[b.row][b.col]) ? getPieceBaseValue(desk[b.row][b.col]) : 0;
		return (bCap - aCap);
	});
	let best = -Infinity;
	for (let m of moves) {
		let tmp = cloneDesk(desk);
		applyMove(tmp, m);
		// Простой SEE‑штраф: если соперник может взять и net < 0, понижаем приоритет
		let seeNet = simpleSEE(tmp, m.row, m.col, color);
		let score = -negamax(tmp, depth - 1, -beta, -alpha, color === 'w' ? 'b' : 'w', rootColor);
		// применяем небольшой SEE‑штраф для учёта «висящих» фигур
		score -= (seeNet < 0) ? Math.abs(seeNet) * 0.5 : 0;
		if (score > best) best = score;
		if (score > alpha) alpha = score;
		if (alpha >= beta) break; // beta cutoff
	}
	return best;
};

// Search best move for color with given depth
let SEARCH_DEPTH = 2; // default depth, can be increased
let searchBestMove = (desk, color, depth = SEARCH_DEPTH) => {
	let moves = filterLegalMoves(desk, color);
	let bestMove = null;
	let bestScore = -Infinity;
	for (let m of moves) {
		let tmp = cloneDesk(desk);
		applyMove(tmp, m);
		let seeNet = simpleSEE(tmp, m.row, m.col, color);
		let score = -negamax(tmp, depth - 1, -Infinity, Infinity, color === 'w' ? 'b' : 'w', color);
		// небольшой SEE‑штраф для дисквалификации подстав
		if (score > bestScore) {
			bestScore = score;
			bestMove = { move: m, value: score };
		}
	}
	return { bestMove, movesCount: moves.length };
};

// Оценка всех доступных ходов и выбор лучшего (обертка над поиском)
let evaluateAllMoves = (desk) => {
	let res = searchBestMove(desk, currentColor, SEARCH_DEPTH);
	let evaluations = [];
	// Для удобства пользователя: вычисляем значение каждого легального хода при мелком поиске
	let moves = filterLegalMoves(desk, currentColor);
	for (let m of moves) {
		let tmp = cloneDesk(desk);
		applyMove(tmp, m);
		let value = -negamax(tmp, SEARCH_DEPTH - 1, -Infinity, Infinity, currentColor === 'w' ? 'b' : 'w', currentColor);
		evaluations.push({ figure: m.figure, from: searchPosition(desk, m.figure), to: { row: m.row, col: m.col }, value });
	}
	return { evaluations, best: res.bestMove ? { figure: res.bestMove.move.figure, from: searchPosition(desk, res.bestMove.move.figure), to: { row: res.bestMove.move.row, col: res.bestMove.move.col }, value: res.bestMove.value } : null };
};

const readline = require('readline');

let coordToNotation = (row, col) => `${rowNames[col]}${row}`;
let notationToCoord = (str) => {
	if (!str) return null;
	let s = str.trim().toUpperCase();
	let file = s[0];
	let rank = parseInt(s.slice(1));
	let col = rowNames.indexOf(file);
	if (col === -1 || isNaN(rank) || rank < 1 || rank > 8) return null;
	return { row: rank, col };
};

let printBoard = (desk, bottomColor = 'w') => {
	// bottomColor: 'w' - белые внизу (по умолчанию), 'b' - чёрные внизу (перевернутый вид)
	let files = bottomColor === 'w' ? rowNames : [...rowNames].slice().reverse();
	if (bottomColor === 'w') {
		for (let r = 8; r >= 1; r--) {
			let line = `${r} `;
			for (let c = 0; c < 8; c++) {
				line += (desk[r][c] ? desk[r][c] : '---') + ' ';
			}
			console.log(line);
		}
	} else {
		for (let r = 1; r <= 8; r++) {
			let line = `${r} `;
			for (let c = 7; c >= 0; c--) {
				line += (desk[r][c] ? desk[r][c] : '---') + ' ';
			}
			console.log(line);
		}
	}
	console.log('   ' + files.map(f => ` ${f} `).join(' '));
};

let getLegalTargetsForFigure = (desk, figure) => {
	let src = searchPosition(desk, figure);
	if (!src) return [];
	let moves = possibleMoves([{ figure: figure, row: src.row, col: src.col }], desk);
	return moves.map(m => ({ row: m.row, col: m.col }));
};

let play = async () => {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const question = (q) => new Promise(res => rl.question(q, ans => res(ans)));

	console.log('Game start. You will input moves like: bP1, A5');
	let humanColor = currentColor === 'w' ? 'b' : 'w';
	printBoard(currentDesk, humanColor);

	while (true) {
		// AI (currentColor moves)
		console.log(`\n== ${currentColor.toUpperCase()} to move (AI) ==`);
		let evals = evaluateAllMoves(currentDesk);
		if (!evals.best) {
			console.log(`${currentColor} has no moves. Game over.`);
			break;
		}
		let aiMove = evals.best;
		applyMove(currentDesk, { figure: aiMove.figure, row: aiMove.to.row, col: aiMove.to.col });
		console.log(`AI plays: ${aiMove.figure} -> ${coordToNotation(aiMove.to.row, aiMove.to.col)} (value: ${aiMove.value})`);
		printBoard(currentDesk, humanColor);

		// Check if opponent is checkmated
		let opponent = currentColor === 'w' ? 'b' : 'w';
		if (isCheckmate(currentDesk, opponent)) {
			console.log(`${currentColor} wins by checkmate!`);
			break;
		}

		// Now player's move (opponent)
		
		currentColor = opponent; // switch to player's color for validation/evaluation
		let valid = false;
		while (!valid) {
			let ans = await question(`Your move (${currentColor}), format 'figure, Square' or 'quit': `);
			if (!ans) continue;
			if (ans.trim().toLowerCase() === 'quit' || ans.trim().toLowerCase() === 'exit') {
				rl.close();
				console.log('Game aborted by user.');
				return;
			}
			let parts = ans.split(',');
			if (parts.length < 2) { console.log('Invalid format, expected "figure, A5"'); continue; }
			let fig = parts[0].trim();
			let sq = parts[1].trim();
			let coord = notationToCoord(sq);
			if (!coord) { console.log('Invalid square. Use A1..H8'); continue; }
			let src = searchPosition(currentDesk, fig);
		if (!src) { console.log('Figure not found on board'); continue; }
		if (fig[0] !== currentColor) { console.log('That figure is not yours'); continue; }
			let legal = getLegalTargetsForFigure(currentDesk, fig);
			let ok = legal.some(t => t.row === coord.row && t.col === coord.col);
			if (!ok) { console.log('Illegal move for that figure'); continue; }
			// Apply player's move
			applyMove(currentDesk, { figure: fig, row: coord.row, col: coord.col });
			console.log(`You play: ${fig} -> ${coordToNotation(coord.row, coord.col)}`);
			printBoard(currentDesk, humanColor);
			valid = true;
		}

		// After player's move, check if AI is checkmated
		if (isCheckmate(currentDesk, currentColor === 'w' ? 'b' : 'w')) {
			console.log(`${currentColor} wins by checkmate!`);
			break;
		}

		// Switch back to AI
		currentColor = currentColor === 'w' ? 'b' : 'w';
	}
	rl.close();
};

play();